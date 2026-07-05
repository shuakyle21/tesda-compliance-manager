/**
 * SCREEN ROUTE — Table View
 * Server shell → interactive TableView client island.
 */

import { MOCK_BATCHES } from '@/shared/mocks';
import { TableView } from '@/components/screens/TableView';

export default function TableViewPage() {
  return <TableView batches={MOCK_BATCHES} />;
}
