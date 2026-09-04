/**
 * Recent Activity panel — the dashboard's compact feed of the newest events,
 * with a link through to the full activity log.
 *
 * Lives in the activity module rather than `modules/batches/ui/dashboard/`
 * because it renders `ActivityEvent`, not batches. The route stays the only
 * thing that fetches; this file only renders what it is handed, including the
 * empty case (never a fabricated placeholder feed — RULES.md rule 19).
 */

import Link from 'next/link';
import { Icon } from '@/shared/ui/Icon';
import type { ActivityEvent } from '@/shared/types';

function ActivityRow({ event }: { event: ActivityEvent }) {
  return (
    <div className="activity-item">
      <span className={`activity-dot ${event.tone}`} />
      <div className="activity-body">
        <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: '19px' }}>
          <span className="who">{event.who}</span>
          <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            · {event.role}
          </span>
          <span style={{ color: 'var(--color-text-secondary)' }}> - {event.text}</span>
        </div>
        <div className="meta">{event.when}</div>
      </div>
    </div>
  );
}

function ActivityFeed({ events }: { events: readonly ActivityEvent[] }) {
  if (events.length === 0) return <p className="t-body">No recent activity yet.</p>;

  return (
    <div className="activity">
      {events.map((event) => (
        <ActivityRow key={event.id} event={event} />
      ))}
    </div>
  );
}

export function RecentActivityPanel({ events }: { events: readonly ActivityEvent[] }) {
  return (
    <section className="dash-panel" aria-labelledby="recent-activity-heading">
      <div className="dash-panel-head">
        <div id="recent-activity-heading" className="dash-panel-title">
          <Icon name="timeline" size={13} />
          Recent Activity
        </div>
        <Link href="/activity-log" className="dash-link">View all</Link>
      </div>
      <div className="dash-panel-body">
        <ActivityFeed events={events} />
      </div>
    </section>
  );
}
