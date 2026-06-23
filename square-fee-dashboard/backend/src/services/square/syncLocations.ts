// Sync Locations from the Square Locations API into SQLite.
// Must run before orders, since orders.location_id references locations(id).
import { db } from '../../db/database.js';
import { squareFetch } from './squareClient.js';
import type { SyncResult } from './syncOrders.js';

interface SquareLocation {
  id: string;
  name?: string;
  currency?: string;
  created_at?: string;
}

export async function syncLocations(): Promise<SyncResult> {
  const resp = await squareFetch<{ locations?: SquareLocation[] }>(`/v2/locations`);
  const locations = resp.locations ?? [];
  const now = new Date().toISOString();

  const upsert = db.prepare(
    `INSERT INTO locations (id, name, currency, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, currency = excluded.currency`
  );
  const write = db.transaction((rows: SquareLocation[]) => {
    for (const l of rows) {
      upsert.run(l.id, l.name ?? 'Unnamed location', l.currency ?? 'USD', l.created_at ?? now);
    }
  });
  write(locations);

  return { count: locations.length };
}
