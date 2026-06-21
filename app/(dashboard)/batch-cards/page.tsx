/**
 * SCREEN ROUTE — Batch Cards
 *
 * Server Component shell: reads the active batch set from the mock data layer
 * and hands it to the interactive CardsView client island.
 */

import { MOCK_BATCHES } from '@/lib/data/mock-batches';
import { CardsView } from '@/components/screens/CardsView';

export default function BatchCardsPage() {
  return <CardsView batches={MOCK_BATCHES} />;
}
