// Placeholder: sync Refunds from the Square Refunds API into local SQLite.
// Not yet implemented. Real sync will use the Square client + ListPaymentRefunds.
import { getSquareClient } from './squareClient.js';
import type { SyncResult } from './syncOrders.js';

export async function syncRefunds(): Promise<SyncResult> {
  const client = getSquareClient();
  if (!client) {
    throw new Error('Square client unavailable: missing credentials.');
  }
  // TODO: call client.refundsApi.listPaymentRefunds(...) and upsert into `refunds`.
  return { count: 0 };
}
