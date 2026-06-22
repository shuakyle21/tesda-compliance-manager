/**
 * STEP 7a — Shell Component: Topbar
 *
 * Application header: brand mark + wordmark on the left, the active school +
 * last-synced badge on the right. Server Component — display-only.
 */

import { TENANTS } from '@/lib/data/mock-batches';

export function Topbar({ lastSynced = 'Last synced 4 min ago' }: { lastSynced?: string }) {
  const tenant = TENANTS[0];
  return (
    <div className="topbar-flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/mark.svg" alt="" width={28} height={28} style={{ borderRadius: 'var(--radius-md)' }} />
      <div style={{ minWidth: 0 }}>
        <div className="sb-brand-name" style={{ fontSize: 13.5 }}>TVI Compliance &amp; Audit</div>
        <div className="sb-brand-sub">{tenant.code} · {tenant.region}</div>
      </div>
      <div className="right" style={{ marginLeft: 'auto' }}>
        <span><span className="synced-dot" />{lastSynced}</span>
      </div>
    </div>
  );
}

export default Topbar;
