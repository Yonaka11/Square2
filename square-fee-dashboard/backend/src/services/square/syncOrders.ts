// Sync Orders (+ line items) from the Square Orders API into SQLite.
import { db } from '../../db/database.js';
import { getSquareConfig, squareFetch } from './squareClient.js';
import { normalizeOrder, type SquareOrder } from './normalize.js';

export interface SyncResult {
  count: number;
}

/** Build a best-effort resolver mapping a catalog_object_id -> local category id. */
function buildCategoryResolver(): (catalogObjectId: string | null | undefined) => string | null {
  const byVariation = new Map<string, string | null>();
  for (const row of db.prepare('SELECT variation_id, category_id FROM catalog_variations').all() as Array<{
    variation_id: string;
    category_id: string | null;
  }>) {
    byVariation.set(row.variation_id, row.category_id);
  }
  const byItem = new Map<string, string | null>();
  for (const row of db
    .prepare('SELECT square_object_id, category_id FROM catalog_items WHERE square_object_id IS NOT NULL')
    .all() as Array<{ square_object_id: string; category_id: string | null }>) {
    byItem.set(row.square_object_id, row.category_id);
  }
  return (id) => {
    if (!id) return null;
    return byVariation.get(id) ?? byItem.get(id) ?? null;
  };
}

export async function syncOrders(): Promise<SyncResult> {
  const { locationId } = getSquareConfig();
  const resolveCategory = buildCategoryResolver();

  let cursor: string | undefined;
  let count = 0;

  const upsertOrder = db.prepare(
    `INSERT INTO orders (id, location_id, state, created_at, gross_sales_money, total_discount_money, total_tax_money, total_money)
     VALUES (@id, @location_id, @state, @created_at, @gross_sales_money, @total_discount_money, @total_tax_money, @total_money)
     ON CONFLICT(id) DO UPDATE SET
       location_id=excluded.location_id, state=excluded.state, created_at=excluded.created_at,
       gross_sales_money=excluded.gross_sales_money, total_discount_money=excluded.total_discount_money,
       total_tax_money=excluded.total_tax_money, total_money=excluded.total_money`
  );
  const deleteLines = db.prepare('DELETE FROM order_line_items WHERE order_id = ?');
  const insertLine = db.prepare(
    `INSERT INTO order_line_items (order_id, uid, name, category_id, quantity, base_price_money, gross_sales_money, total_discount_money, total_tax_money, total_money, catalog_object_id)
     VALUES (@order_id, @uid, @name, @category_id, @quantity, @base_price_money, @gross_sales_money, @total_discount_money, @total_tax_money, @total_money, @catalog_object_id)`
  );

  do {
    const body = {
      location_ids: [locationId],
      query: {
        filter: { state_filter: { states: ['COMPLETED'] } },
        sort: { sort_field: 'CREATED_AT', sort_order: 'DESC' },
      },
      limit: 500,
      ...(cursor ? { cursor } : {}),
    };
    const resp = await squareFetch<{ orders?: SquareOrder[]; cursor?: string }>(`/v2/orders/search`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const batch = resp.orders ?? [];
    const writeBatch = db.transaction((orders: SquareOrder[]) => {
      for (const raw of orders) {
        const { order, lineItems } = normalizeOrder(raw, resolveCategory);
        upsertOrder.run(order);
        deleteLines.run(order.id);
        for (const li of lineItems) insertLine.run(li);
        count++;
      }
    });
    writeBatch(batch);

    cursor = resp.cursor;
  } while (cursor);

  return { count };
}
