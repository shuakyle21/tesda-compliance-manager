/**
 * Dashboard title without the dense workspace, batch-count, and freshness
 * subline. Role context remains available to assistive technology in the page.
 */
export function DashboardHeaderPlain() {
  return (
    <div className="page-head">
      <h1>Dashboard</h1>
    </div>
  );
}
