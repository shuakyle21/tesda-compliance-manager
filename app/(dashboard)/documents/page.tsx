/**
 * SCREEN ROUTE — Documents Matrix
 * Server shell → interactive DocumentsView client island (preview + verify flow).
 */

import { MOCK_BATCHES } from '@/lib/data/mock-batches';
import { DocumentsView } from '@/components/screens/DocumentsView';

export default function DocumentsPage() {
  return <DocumentsView batches={MOCK_BATCHES} />;
}
