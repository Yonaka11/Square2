// Sync Payments from the Square Payments API into SQLite.
import { db } from '../../db/database.js';
import { getSquareConfig, squareFetch } from './squareClient.js';
import { normalizePayment, type SquarePayment } from './normalize.js';
import type { SyncResult } from './syncOrders.js';

export async function syncPayments(): Promise<SyncResult> {
  const { locationId } = getSquareConfig();
  let cursor: string | undefined;
  let count = 0;

  const upsert = db.prepare(
    `INSERT INTO payments (id, order_id, amount_money, tip_money, processing_fee_money, status, created_at)
     VALUES (@id, @order_id, @amount_money, @tip_money, @processing_fee_money, @status, @created_at)
     ON CONFLICT(id) DO UPDATE SET
       order_id=excluded.order_id, amount_money=excluded.amount_money, tip_money=excluded.tip_money,
       processing_fee_money=excluded.processing_fee_money, status=excluded.status, created_at=excluded.created_at`
  );

  do {
    const qs = new URLSearchParams({ location_id: locationId, limit: '100' });
    if (cursor) qs.set('cursor', cursor);
    const resp = await squareFetch<{ payments?: SquarePayment[]; cursor?: string }>(
      `/v2/payments?${qs.toString()}`
    );
    const batch = resp.payments ?? [];
    const write = db.transaction((payments: SquarePayment[]) => {
      for (const p of payments) {
        upsert.run(normalizePayment(p));
        count++;
      }
    });
    write(batch);
    cursor = resp.cursor;
  } while (cursor);

  return { count };
}
