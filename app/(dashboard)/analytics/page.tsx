/**
 * SCREEN — Analytics (charts ported from App.jsx AnalyticsView, now rendered
 * via Tremor — see modules/analytics/ui/AnalyticsView.tsx and the
 * analytics_tremor_decision project memory for why this module alone departs
 * from the app's hand-rolled chart primitives).
 *
 * Stays a Server Component: it only fetches/derives MOCK_BATCHES and hands
 * them to the client-rendered AnalyticsView.
 */

import { MOCK_BATCHES, DOCUMENT_REQUIREMENTS } from '@/shared/mocks';
import { AnalyticsView } from '@/modules/analytics/ui/AnalyticsView';
import { Icon } from '@/shared/ui/Icon';

export default function AnalyticsPage() {
  return (
    <div>
      <Header />
      <AnalyticsView batches={MOCK_BATCHES} documentRequirements={DOCUMENT_REQUIREMENTS} />
    </div>
  );
}

function Header() {
  return (
    <div className="page-head">
      <h1>Analytics</h1>
      <span className="subline">4 charts · tenant-scoped</span>
      <div style={{ marginLeft: 'auto' }}>
        <button className="btn secondary"><Icon name="download" size={14} />Export</button>
      </div>
    </div>
  );
}
