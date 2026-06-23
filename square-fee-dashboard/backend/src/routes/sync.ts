import { Router } from 'express';
import { db } from '../db/database.js';
import { generateMockData } from '../mock/mockData.js';
import { hasSquareCredentials, getSquareConfig } from '../services/square/squareClient.js';
import { runSquareSync } from '../services/square/runSync.js';

export const syncRouter = Router();

// GET /api/sync/status -> most recent sync log + per-table counts
syncRouter.get('/status', (_req, res) => {
  const lastSync = db
    .prepare(
      `SELECT id, sync_type AS syncType, orders_synced AS ordersSynced, payments_synced AS paymentsSynced,
              refunds_synced AS refundsSynced, catalog_items_synced AS catalogItemsSynced,
              status, error, created_at AS createdAt
       FROM sync_logs ORDER BY created_at DESC LIMIT 1`
    )
    .get();

  const counts = {
    orders: (db.prepare('SELECT COUNT(*) AS n FROM orders').get() as any).n,
    payments: (db.prepare('SELECT COUNT(*) AS n FROM payments').get() as any).n,
    refunds: (db.prepare('SELECT COUNT(*) AS n FROM refunds').get() as any).n,
    catalogItems: (db.prepare('SELECT COUNT(*) AS n FROM catalog_items').get() as any).n,
  };

  const recent = db
    .prepare(
      `SELECT id, sync_type AS syncType, orders_synced AS ordersSynced, payments_synced AS paymentsSynced,
              refunds_synced AS refundsSynced, catalog_items_synced AS catalogItemsSynced,
              status, error, created_at AS createdAt
       FROM sync_logs ORDER BY created_at DESC LIMIT 10`
    )
    .all();

  res.json({ lastSync: lastSync ?? null, counts, recent, squareConfigured: hasSquareCredentials() });
});

// POST /api/sync/mock -> seed realistic mock data
syncRouter.post('/mock', (_req, res) => {
  try {
    const result = generateMockData();
    res.json({ status: 'success', ...result });
  } catch (err: any) {
    db.prepare(
      `INSERT INTO sync_logs (sync_type, status, error, created_at) VALUES ('mock', 'error', ?, ?)`
    ).run(String(err?.message ?? err), new Date().toISOString());
    res.status(500).json({ status: 'error', error: String(err?.message ?? err) });
  }
});

// POST /api/sync/square -> run a real read-only Square sync (catalog/orders/
// payments/refunds). Returns a safe, helpful error if credentials are missing.
syncRouter.post('/square', async (_req, res) => {
  if (!hasSquareCredentials()) {
    const cfg = getSquareConfig();
    const msg =
      'Square credentials are not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in backend/.env ' +
      `(current environment: ${cfg.environment}). Until then, use "Seed mock data" instead.`;
    db.prepare(
      `INSERT INTO sync_logs (sync_type, status, error, created_at) VALUES ('square', 'error', ?, ?)`
    ).run(msg, new Date().toISOString());
    return res.status(400).json({ status: 'error', error: msg });
  }

  try {
    const result = await runSquareSync();
    res.json({ status: 'success', ...result });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    db.prepare(
      `INSERT INTO sync_logs (sync_type, status, error, created_at) VALUES ('square', 'error', ?, ?)`
    ).run(msg, new Date().toISOString());
    // 502: we reached our server but the upstream Square call failed.
    res.status(502).json({ status: 'error', error: msg });
  }
});
