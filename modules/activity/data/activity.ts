/**
 * Activity log contract (TES-30) — feeds `ActivityEvent[]` (`shared/types.ts`),
 * consumed today by `app/(dashboard)/activity-log/page.tsx` (full feed) and the
 * dashboard's recent-activity panel (`app/(dashboard)/dashboard/page.tsx`, first
 * 6 events), both reading live rows through `getActivitySnapshot()`. The
 * `MOCK_ACTIVITY` dataset they used to read was deleted in the mock-data retirement.
 *
 * Same three layers as `modules/batches/data/batches.ts`:
 *   1. fetch   — typed Supabase query; RLS scopes rows to the caller.
 *   2. map     — pure DB-row -> UI-domain translation (testable).
 *   3. derive  — relative "when" display + the action->tone bridge.
 *
 * Contract gap (TES-30, not closed here): `activity_log.action` is a generic
 * CRUD enum (created/updated/uploaded/verified/submitted/deleted/system_note),
 * not the narrative severity the mock's `tone` encodes (e.g. "billing window",
 * "lag exceeded" both read `amber`/`red` in the mock regardless of the
 * underlying action). `ACTION_TO_TONE` below is a coarse, documented default,
 * not an attempt to reproduce the mock's per-event judgment calls.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Database, ActivityAction } from '@/lib/supabase/database.types';
import type { ActivityEvent } from '@/shared/types';

type ActivityLogRow = Database['public']['Tables']['activity_log']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/** The join row we actually select: activity_log + the acting profile (nullable — system events have none). */
type ActivityLogRowWithProfile = ActivityLogRow & {
  profiles: Pick<ProfileRow, 'full_name' | 'role'> | null;
};

// Total map: every DB action has a UI tone, so a new enum variant fails
// compilation here (same discipline as batches.ts's DB_TO_UI_STAGE).
const ACTION_TO_TONE: Record<ActivityAction, ActivityEvent['tone']> = {
  created: 'blue',
  updated: 'blue',
  uploaded: 'blue',
  submitted: 'blue',
  verified: 'green',
  deleted: 'red',
  system_note: 'amber',
};

/**
 * Converts an ISO timestamp to the relative-display convention ("today · 14:02",
 * "yesterday", "N days ago"). Mirrors `toDisplayDate` in batches.ts: an
 * unparseable timestamp falls back to an empty string rather than propagating
 * NaN/"Invalid Date" into the UI.
 */
function toRelativeWhen(createdAtIso: string): string {
  const created = new Date(createdAtIso);
  if (!Number.isFinite(created.getTime())) return '';

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(created)) / 86_400_000);

  if (dayDiff === 0) {
    const time = created.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    return `today · ${time}`;
  }
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff > 1) return `${dayDiff} days ago`;
  // A future-dated row (clock skew, backdated fixture) — display, don't hide.
  return created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Mapper — pure, no I/O.
// ---------------------------------------------------------------------------

/**
 * Maps a raw activity log row (with joined profile) to the UI domain
 * ActivityEvent type. Derives the relative "when" timestamp and tone from the
 * action, and falls back to "System" when no acting profile is present.
 */
export function mapActivityLogRow(row: ActivityLogRowWithProfile): ActivityEvent {
  return {
    id: row.id,
    when: toRelativeWhen(row.created_at),
    tone: ACTION_TO_TONE[row.action],
    who: row.profiles?.full_name ?? 'System',
    role: row.profiles?.role ?? 'system',
    text: row.summary,
  };
}

// ---------------------------------------------------------------------------
// Fetch — server-only, same snapshot shaping as BatchesSnapshot (TES-8 AC6).
// ---------------------------------------------------------------------------
export type ActivitySnapshot =
  | { status: 'ok'; events: ActivityEvent[]; hasMore: boolean }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/**
 * The tenant's activity feed, most recent first. `limit` defaults to the full
 * feed (activity-log page, though callers should pass a bounded page size —
 * see the page's PAGE_SIZE); the dashboard panel passes a smaller value
 * instead of fetching everything and slicing client-side. `offset` pages
 * through the feed; combined with `limit`, one extra row is fetched to derive
 * `hasMore` without a separate count query.
 */
export async function getActivitySnapshot(limit?: number, offset = 0): Promise<ActivitySnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('activity_log')
      .select('*, profiles(full_name, role)')
      .order('created_at', { ascending: false });
    if (limit !== undefined) query = query.range(offset, offset + limit);

    const { data, error } = await query;

    if (error) return { status: 'sync-failed', error: error.message };
    const rows = data ?? [];
    const hasMore = limit !== undefined && rows.length > limit;
    const events = rows.slice(0, limit).map((row) => mapActivityLogRow(row as ActivityLogRowWithProfile));
    return { status: 'ok', events, hasMore };
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}
