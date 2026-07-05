/**
 * SCREEN ROUTE — Documents Matrix
 * Server shell → interactive DocumentsView client island (preview + verify flow).
 */

import { MOCK_BATCHES } from '@/shared/mocks';
import { DocumentsView } from '@/modules/documents/ui/DocumentsView';

export default function DocumentsPage() {
  return <DocumentsView batches={MOCK_BATCHES} />;
}
