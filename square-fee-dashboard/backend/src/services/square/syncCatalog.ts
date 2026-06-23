// Placeholder: sync Catalog items from the Square Catalog API into local SQLite.
// Not yet implemented. Real sync will use the Square client + ListCatalog.
// NOTE: Destructive Square catalog changes are intentionally NOT implemented.
import { getSquareClient } from './squareClient.js';
import type { SyncResult } from './syncOrders.js';

export async function syncCatalog(): Promise<SyncResult> {
  const client = getSquareClient();
  if (!client) {
    throw new Error('Square client unavailable: missing credentials.');
  }
  // TODO: call client.catalogApi.listCatalog(...) and upsert into `catalog_items`
  // and `categories`.
  return { count: 0 };
}
