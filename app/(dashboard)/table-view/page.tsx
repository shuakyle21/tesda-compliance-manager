/**
 * SCREEN ROUTE — Table View
 * Server shell → interactive TableView client island.
 */

import { MOCK_BATCHES } from '@/shared/mocks';
import { TableView } from '@/modules/batches/ui/TableView';

export default function TableViewPage() {
  return <TableView batches={MOCK_BATCHES} />;
}
