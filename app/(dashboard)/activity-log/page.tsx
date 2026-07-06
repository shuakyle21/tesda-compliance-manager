/**
 * SCREEN — Activity Log
 *
 * A flat audit feed of system + user events. Server Component: imports the mock
 * data directly and renders — no client JS needed. Each row carries a semantic
 * tone dot (green/blue/amber/red) matching the event category.
 */

import { MOCK_ACTIVITY } from '@/shared/mocks';
import { Icon } from '@/shared/ui/Icon';

export default function ActivityLogPage() {
  const events = MOCK_ACTIVITY;

  return (
    <div>
      <div className="page-head">
        <h1>Activity Log</h1>
        <span className="subline">audit · {events.length} events · 7 days</span>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn secondary"><Icon name="download" size={14} />Export</button>
        </div>
      </div>

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
    </div>
  );
}
