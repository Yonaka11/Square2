// Placeholder: sync Payments from the Square Payments API into local SQLite.
// Not yet implemented. Real sync will use the Square client + ListPayments.
import { getSquareClient } from './squareClient.js';
import type { SyncResult } from './syncOrders.js';

export async function syncPayments(): Promise<SyncResult> {
  const client = getSquareClient();
  if (!client) {
    throw new Error('Square client unavailable: missing credentials.');
  }
  // TODO: call client.paymentsApi.listPayments(...) and upsert into `payments`.
  return { count: 0 };
}
