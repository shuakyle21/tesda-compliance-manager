/**
 * SCREEN — Activity Log
 *
 * A flat audit feed of system + user events. Server Component: reads the live
 * activity contract (`modules/activity/data`) and renders — no client JS needed.
 * Each row carries a semantic tone dot (green/blue/amber/red) matching the
 * event category.
 *
 * `unconfigured`/`sync-failed` render an honest empty feed rather than
 * substituting mock data; `sync-failed` additionally surfaces the banner below
 * (module data-layer contract).
 */

import Link from 'next/link';
import { getActivitySnapshot } from '@/modules/activity/data/activity';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { Icon } from '@/shared/ui/Icon';

export default async function ActivityLogPage() {
  // Full feed — no `limit`, unlike the dashboard's 6-event recent-activity panel.
  const activitySnapshot = await getActivitySnapshot();
  const events = activitySnapshot.status === 'ok' ? activitySnapshot.events : [];
  const syncFailed = activitySnapshot.status === 'sync-failed';

  return (
    <div>
      <div className="page-head">
        <h1>Activity Log</h1>
        {/* The contract has no date window, so the subline counts what was
            actually loaded rather than claiming a "last 7 days" range. */}
        <span className="subline">audit · {events.length} {events.length === 1 ? 'event' : 'events'}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn secondary"><Icon name="download" size={14} />Export</button>
        </div>
      </div>

      {syncFailed && (
        <InfoCallout variant="warning">
          Sync with Supabase failed — the activity feed could not be loaded.
          <Link href="/activity-log" className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
        </InfoCallout>
      )}

      {events.length === 0 ? (
        <EmptyState
          iconName="timeline"
          heading="No activity yet"
          sub="Uploads, verifications, and batch changes appear here as they happen."
        />
      ) : (
        <div className="surface" style={{ padding: '8px 18px' }}>
          <div className="activity">
            {events.map((a) => (
              <div key={a.id} className="activity-item">
                <span className={`activity-dot ${a.tone}`} />
                <div className="activity-body">
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: '19px' }}>
                    <span className="who">{a.who}</span>
                    <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                      · {a.role}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)' }}> — {a.text}</span>
                  </div>
                  <div className="meta">{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
