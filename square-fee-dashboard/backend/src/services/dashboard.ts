// Dashboard overview metrics for the current month (or a provided range).
import { db } from '../db/database.js';
import { dateRangeBounds, defaultMonthRange } from '../utils/dates.js';
import { computeMonthlyFeeReport } from './feeCalculator.js';

export interface DashboardOverview {
  startDate: string;
  endDate: string;
  grossSales: number;
  refunds: number;
  discounts: number;
  excludedCategorySales: number;
  feeLiableSales: number;
  estimatedFeeOwed: number;
  orderCount: number;
  averageTicket: number; // cents
}

export function computeDashboardOverview(start?: string, end?: string): DashboardOverview {
  const range = start && end ? { startDate: start, endDate: end } : defaultMonthRange();
  const report = computeMonthlyFeeReport(range.startDate, range.endDate);

  // Average ticket = net order total / number of orders.
  const { startIso, endIso } = dateRangeBounds(range.startDate, range.endDate);
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(total_money),0) AS netTotal, COUNT(*) AS n
       FROM orders WHERE created_at >= ? AND created_at <= ?`
    )
    .get(startIso, endIso) as { netTotal: number; n: number };
  const averageTicket = totals.n > 0 ? Math.round(totals.netTotal / totals.n) : 0;

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    grossSales: report.grossSales,
    refunds: report.refunds,
    discounts: report.discounts,
    excludedCategorySales: report.excludedCategorySales,
    feeLiableSales: report.feeLiableSales,
    estimatedFeeOwed: report.feeOwed,
    orderCount: report.orderCount,
    averageTicket,
  };
}
