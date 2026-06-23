// Orchestrates a full manual Square sync: catalog -> orders -> payments -> refunds.
// Records a row in sync_logs and returns the per-entity counts.
import { db } from '../../db/database.js';
import { hasSquareCredentials } from './squareClient.js';
import { syncCatalog } from './syncCatalog.js';
import { syncOrders } from './syncOrders.js';
import { syncPayments } from './syncPayments.js';
import { syncRefunds } from './syncRefunds.js';

export interface SquareSyncResult {
  catalogItems: number;
  orders: number;
  payments: number;
  refunds: number;
}

export async function runSquareSync(): Promise<SquareSyncResult> {
  if (!hasSquareCredentials()) {
    throw new Error('Square credentials are not configured.');
  }

  // Order matters: catalog first (so orders can resolve categories), then orders
  // (so refunds can resolve original sale dates), then payments and refunds.
  const catalog = await syncCatalog();
  const orders = await syncOrders();
  const payments = await syncPayments();
  const refunds = await syncRefunds();

  const result: SquareSyncResult = {
    catalogItems: catalog.count,
    orders: orders.count,
    payments: payments.count,
    refunds: refunds.count,
  };

  db.prepare(
    `INSERT INTO sync_logs (sync_type, orders_synced, payments_synced, refunds_synced, catalog_items_synced, status, error, created_at)
     VALUES ('square', ?, ?, ?, ?, 'success', NULL, ?)`
  ).run(result.orders, result.payments, result.refunds, result.catalogItems, new Date().toISOString());

  return result;
}
