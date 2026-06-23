// Sync Refunds from the Square Refunds API into SQLite.
import { db } from '../../db/database.js';
import { getSquareConfig, squareFetch } from './squareClient.js';
import { normalizeRefund, type SquareRefund } from './normalize.js';
import type { SyncResult } from './syncOrders.js';

export async function syncRefunds(): Promise<SyncResult> {
  const { locationId } = getSquareConfig();
  let cursor: string | undefined;
  let count = 0;

  // Resolver: original sale date for a refund's order (for the fee rule that
  // deducts refunds by original sale date). Reads from already-synced orders.
  const orderDates = new Map<string, string>();
  for (const row of db.prepare('SELECT id, created_at FROM orders').all() as Array<{
    id: string;
    created_at: string;
  }>) {
    orderDates.set(row.id, row.created_at);
  }
  const resolveOrderDate = (orderId: string | undefined) => (orderId ? orderDates.get(orderId) ?? null : null);

  const upsert = db.prepare(
    `INSERT INTO refunds (id, payment_id, order_id, amount_money, reason, status, created_at, order_created_at)
     VALUES (@id, @payment_id, @order_id, @amount_money, @reason, @status, @created_at, @order_created_at)
     ON CONFLICT(id) DO UPDATE SET
       payment_id=excluded.payment_id, order_id=excluded.order_id, amount_money=excluded.amount_money,
       reason=excluded.reason, status=excluded.status, created_at=excluded.created_at,
       order_created_at=excluded.order_created_at`
  );

  do {
    const qs = new URLSearchParams({ location_id: locationId, limit: '100' });
    if (cursor) qs.set('cursor', cursor);
    const resp = await squareFetch<{ refunds?: SquareRefund[]; cursor?: string }>(
      `/v2/refunds?${qs.toString()}`
    );
    const batch = resp.refunds ?? [];
    const write = db.transaction((refunds: SquareRefund[]) => {
      for (const r of refunds) {
        upsert.run(normalizeRefund(r, resolveOrderDate));
        count++;
      }
    });
    write(batch);
    cursor = resp.cursor;
  } while (cursor);

  return { count };
}
