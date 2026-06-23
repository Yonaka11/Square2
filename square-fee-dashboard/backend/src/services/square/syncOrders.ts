// Placeholder: sync Orders from the Square Orders API into local SQLite.
// Not yet implemented. Real sync will use the Square client + SearchOrders.
import { getSquareClient } from './squareClient.js';

export interface SyncResult {
  count: number;
}

export async function syncOrders(): Promise<SyncResult> {
  const client = getSquareClient();
  if (!client) {
    throw new Error('Square client unavailable: missing credentials.');
  }
  // TODO: call client.ordersApi.searchOrders(...) and upsert into `orders`
  // and `order_line_items` using integer cents.
  return { count: 0 };
}
