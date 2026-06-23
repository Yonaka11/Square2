import { Router } from 'express';
import { computeMonthlyFeeReport } from '../services/feeCalculator.js';
import { centsToDollarString } from '../utils/money.js';
import { defaultMonthRange } from '../utils/dates.js';

export const exportsRouter = Router();

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// GET /api/exports/monthly-fee.csv?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
exportsRouter.get('/monthly-fee.csv', (req, res) => {
  const fallback = defaultMonthRange();
  const startDate = (req.query.startDate as string) || fallback.startDate;
  const endDate = (req.query.endDate as string) || fallback.endDate;
  const report = computeMonthlyFeeReport(startDate, endDate);

  const lines: string[] = [];
  lines.push(`Monthly Location Fee Report`);
  lines.push(`Start Date,${startDate}`);
  lines.push(`End Date,${endDate}`);
  lines.push('');
  lines.push('Summary,Amount (USD)');
  lines.push(`Gross Sales,${centsToDollarString(report.grossSales)}`);
  lines.push(`Refunds,${centsToDollarString(report.refunds)}`);
  lines.push(`Discounts,${centsToDollarString(report.discounts)}`);
  lines.push(`Excluded Category Sales,${centsToDollarString(report.excludedCategorySales)}`);
  lines.push(`Taxes,${centsToDollarString(report.taxes)}`);
  lines.push(`Fee-Liable Sales,${centsToDollarString(report.feeLiableSales)}`);
  lines.push(`Fee Percentage,${report.feePercentage}%`);
  lines.push(`Fee Owed,${centsToDollarString(report.feeOwed)}`);
  lines.push(`Order Count,${report.orderCount}`);
  lines.push('');
  lines.push('Category,Gross Sales,Discounts,Taxes,Excluded,Net Sales');
  for (const row of report.categoryBreakdown) {
    lines.push(
      [
        csvEscape(row.categoryName),
        centsToDollarString(row.grossSales),
        centsToDollarString(row.discounts),
        centsToDollarString(row.taxes),
        row.excluded ? 'YES' : 'NO',
        centsToDollarString(row.netSales),
      ].join(',')
    );
  }

  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="monthly-fee-${startDate}_to_${endDate}.csv"`);
  res.send(csv);
});
