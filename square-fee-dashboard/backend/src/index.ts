// Express server entry point for the Square Fee Dashboard backend.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db, initDb, getDbPath } from './db/database.js';
import { generateMockData } from './mock/mockData.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { catalogRouter } from './routes/catalog.js';
import { settingsRouter } from './routes/settings.js';
import { syncRouter } from './routes/sync.js';
import { exportsRouter } from './routes/exports.js';

const PORT = Number(process.env.PORT ?? 8080);

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
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: getDbPath() });
});

app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/exports', exportsRouter);

// Centralized error handler.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: String(err?.message ?? err) });
});

app.listen(PORT, () => {
  console.log(`Square Fee Dashboard backend listening on http://localhost:${PORT}`);
});
