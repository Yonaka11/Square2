import { Router } from 'express';
import { computeDashboardOverview } from '../services/dashboard.js';

export const dashboardRouter = Router();

// GET /api/dashboard/overview?startDate=&endDate=  (defaults to current month)
dashboardRouter.get('/overview', (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const overview = computeDashboardOverview(startDate, endDate);
  res.json(overview);
});
