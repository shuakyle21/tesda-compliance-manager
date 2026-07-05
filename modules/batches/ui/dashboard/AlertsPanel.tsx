/**
 * Alerts panel — recent compliance alerts.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 8:4730.
 * Header with a red critical-count badge + "View all", then alert rows
 * (kind icon · subject · "{sentAt} · {batch} · {status}" meta).
 * Data-driven from ALERTS_LOG.
 */

import Link from 'next/link';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { ALERTS_LOG } from '@/shared/mocks/seed';

const CRITICAL_KINDS = new Set(['billing-critical', 'doc-missing', 'ntp-lag']);

const KIND_META: Record<string, { icon: IconName; color: string }> = {
  'billing-ready': { icon: 'send', color: 'var(--color-green)' },
  'billing-critical': { icon: 'alert-triangle', color: 'var(--color-red)' },
  'bsrs-approved': { icon: 'shield-check', color: 'var(--color-green)' },
  'doc-missing': { icon: 'file-check', color: 'var(--color-amber)' },
  'ntp-lag': { icon: 'alert-circle', color: 'var(--color-red)' },
  'weekly-digest': { icon: 'receipt', color: 'var(--color-blue)' },
};

export function AlertsPanel({ limit = 5 }: { limit?: number }) {
  const alerts = ALERTS_LOG.slice(0, limit);
  const criticalCount = ALERTS_LOG.filter((a) => CRITICAL_KINDS.has(a.kind)).length;

  return (
    <section className="dash-panel" aria-labelledby="alerts-heading">
      <div className="dash-panel-head">
        <div id="alerts-heading" className="dash-panel-title">
          <Icon name="bell" size={13} />
          Alerts
          {criticalCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: 'var(--color-red)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 500,
              }}
            >
              {criticalCount}
            </span>
          )}
        </div>
        <Link href="/activity-log" className="dash-link">View all</Link>
      </div>

      <div className="dash-panel-body" style={{ padding: 0 }}>
        {alerts.map((a, i) => {
          const meta = KIND_META[a.kind] ?? { icon: 'info-circle' as IconName, color: 'var(--color-text-muted)' };
          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderBottom: i < alerts.length - 1 ? '0.5px solid var(--color-border-faint)' : 'none',
              }}
            >
              <span style={{ color: meta.color, flexShrink: 0, marginTop: 2 }}>
                <Icon name={meta.icon} size={14} />
              </span>
              <div style={{ flex: '1 0 0', minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: '16.8px' }}>{a.subject}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {a.sentAt} · {a.batch} · {a.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AlertsPanel;
