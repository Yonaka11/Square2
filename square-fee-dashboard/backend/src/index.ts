// Express server entry point for the Square Fee Dashboard backend.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDb, getDbPath } from './db/database.js';
import { generateMockData } from './mock/mockData.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { catalogRouter } from './routes/catalog.js';
import { settingsRouter } from './routes/settings.js';
import { syncRouter } from './routes/sync.js';
import { exportsRouter } from './routes/exports.js';
import { authRouter } from './routes/auth.js';
import { webhooksRouter } from './routes/webhooks.js';
import { requireAuth, isAuthEnabled } from './auth/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 8080);
const SERVE_STATIC = process.env.SERVE_STATIC === 'true' || process.env.NODE_ENV === 'production';

initDb();

// First-run convenience: if there are no orders yet, seed mock data so the
// dashboard is immediately usable without Square credentials.
const orderCount = (db.prepare('SELECT COUNT(*) AS n FROM orders').get() as any).n as number;
if (orderCount === 0) {
  console.log('No orders found - seeding mock data on first run...');
  const result = generateMockData();
  console.log(`Seeded ${result.orders} orders, ${result.lineItems} line items, ${result.refunds} refunds.`);
}

const app = express();
app.use(cors());
// Capture the raw request body so webhook signatures can be verified.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: getDbPath(), authRequired: isAuthEnabled(), serveStatic: SERVE_STATIC });
});

// Auth + webhooks are always reachable; everything else under /api is gated when
// auth is enabled (ADMIN_PASSWORD set).
app.use('/api', requireAuth(['/api/auth', '/api/health', '/api/webhooks']));

app.use('/api/auth', authRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/exports', exportsRouter);

// Production: serve the built frontend (single-port deployment) with SPA fallback.
if (SERVE_STATIC) {
  const distDir = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
    console.log(`Serving frontend static files from ${distDir}`);
  } else {
    console.warn(`SERVE_STATIC enabled but ${distDir} does not exist. Run the frontend build first.`);
  }
}

// Centralized error handler.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: String(err?.message ?? err) });
});

app.listen(PORT, () => {
  console.log(`Square Fee Dashboard backend listening on http://localhost:${PORT}`);
  console.log(`Auth ${isAuthEnabled() ? 'ENABLED' : 'disabled'} · Static serving ${SERVE_STATIC ? 'ON' : 'off'}`);
});
