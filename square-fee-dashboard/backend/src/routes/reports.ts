import { Router } from 'express';
import { db } from '../db/database.js';
import { computeMonthlyFeeReport } from '../services/feeCalculator.js';
import { computeSalesAnalytics } from '../services/analytics.js';
import { defaultMonthRange } from '../utils/dates.js';

export const reportsRouter = Router();

function resolveRange(req: any) {
  const fallback = defaultMonthRange();
  const startDate = (req.query.startDate as string) || fallback.startDate;
  const endDate = (req.query.endDate as string) || fallback.endDate;
  return { startDate, endDate };
}

// GET /api/reports/monthly-fee?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
reportsRouter.get('/monthly-fee', (req, res) => {
  const { startDate, endDate } = resolveRange(req);
  const report = computeMonthlyFeeReport(startDate, endDate);
  res.json(report);
});

// GET /api/reports/sales-analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
reportsRouter.get('/sales-analytics', (req, res) => {
  const { startDate, endDate } = resolveRange(req);
  const analytics = computeSalesAnalytics(startDate, endDate);
  res.json(analytics);
});

// POST /api/reports/snapshots  -> save a snapshot of a monthly fee report
reportsRouter.post('/snapshots', (req, res) => {
  const { startDate, endDate } = req.body ?? {};
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }
  const report = computeMonthlyFeeReport(startDate, endDate);
  const info = db
    .prepare(
      `INSERT INTO monthly_fee_report_snapshots (start_date, end_date, fee_owed_money, payload, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(startDate, endDate, report.feeOwed, JSON.stringify(report), new Date().toISOString());
  res.status(201).json({ id: info.lastInsertRowid, report });
});

// GET /api/reports/snapshots -> list saved snapshots
reportsRouter.get('/snapshots', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, start_date AS startDate, end_date AS endDate, fee_owed_money AS feeOwed, created_at AS createdAt
       FROM monthly_fee_report_snapshots ORDER BY created_at DESC`
    )
    .all();
  res.json(rows);
});
