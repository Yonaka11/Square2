// Orchestrates a full manual Square sync: catalog -> orders -> payments -> refunds.
// Records a row in sync_logs and returns the per-entity counts.
import { db } from '../../db/database.js';
import { hasSquareCredentials } from './squareClient.js';
import { syncLocations } from './syncLocations.js';
import { syncCatalog } from './syncCatalog.js';
import { syncOrders } from './syncOrders.js';
import { syncPayments } from './syncPayments.js';
import { syncRefunds } from './syncRefunds.js';

export interface SquareSyncResult {
  locations: number;
  catalogItems: number;
  orders: number;
  payments: number;
  refunds: number;
}

export async function runSquareSync(): Promise<SquareSyncResult> {
  if (!hasSquareCredentials()) {
    throw new Error('Square credentials are not configured.');
  }

  // We mirror an external source, so partial cross-references are expected (e.g.
  // a payment/refund can point at an order outside the synced set). Relax FK
  // enforcement for the duration of the sync, then restore it. Toggling the
  // pragma must happen outside any transaction (it's a no-op inside one).
  db.pragma('foreign_keys = OFF');
  let result: SquareSyncResult;
  try {
    // Order matters: locations first (orders FK-reference locations), then
    // catalog (so orders can resolve categories), then orders (so refunds can
    // resolve original sale dates), then payments and refunds.
    const locations = await syncLocations();
    const catalog = await syncCatalog();
    const orders = await syncOrders();
    const payments = await syncPayments();
    const refunds = await syncRefunds();

    result = {
      locations: locations.count,
      catalogItems: catalog.count,
      orders: orders.count,
      payments: payments.count,
      refunds: refunds.count,
    };
  } finally {
    db.pragma('foreign_keys = ON');
  }

  db.prepare(
    `INSERT INTO sync_logs (sync_type, orders_synced, payments_synced, refunds_synced, catalog_items_synced, status, error, created_at)
     VALUES ('square', ?, ?, ?, ?, 'success', NULL, ?)`
  ).run(result.orders, result.payments, result.refunds, result.catalogItems, new Date().toISOString());

  return result;
}
