// =============================================================================
// LOCATION FEE CALCULATION
// =============================================================================
// The business owes a configurable "location fee" (default 25%) on its eligible
// monthly sales. This module is the single source of truth for that math.
//
// Business rule (all amounts are integer CENTS):
//
//   gross sales
//   - refunds
//   - discounts                (only if fee rules say discounts reduce liability)
//   - excluded category sales  (gross sales belonging to excluded categories)
//   - taxes                    (only if fee rules say taxes are excluded)
//   = fee-liable sales
//
//   fee owed = fee-liable sales * (fee percentage / 100)
//
// Notes / assumptions:
//  * "gross sales" = sum of line-item gross sales (unit price * quantity),
//    measured BEFORE discounts and taxes (standard Square definition).
//  * Refunds can be deducted either by the refund date or by the original sale
//    date of the refunded order, depending on `refund_deduction_method`.
//  * Excluded-category sales are removed using each line item's gross sales so
//    that excluded categories never contribute to fee liability.
// =============================================================================

import { db } from '../db/database.js';
import { dateRangeBounds } from '../utils/dates.js';
import { percentageOfCents } from '../utils/money.js';
import type { FeeRules } from '../types.js';

export interface CategoryBreakdownRow {
  categoryId: string | null;
  categoryName: string;
  grossSales: number;
  discounts: number;
  taxes: number;
  excluded: boolean;
  netSales: number; // gross - discounts (informational)
}

export interface MonthlyFeeReport {
  startDate: string;
  endDate: string;
  grossSales: number;
  refunds: number;
  discounts: number;
  excludedCategorySales: number;
  taxes: number;
  feeLiableSales: number;
  feePercentage: number;
  feeOwed: number;
  orderCount: number;
  categoryBreakdown: CategoryBreakdownRow[];
  rulesApplied: {
    discountsReduce: boolean;
    taxesExcluded: boolean;
    refundDeductionMethod: string;
    excludedCategoryIds: string[];
  };
}

/** Read the singleton fee rules row and normalize the JSON/boolean columns. */
export function getFeeRules(): FeeRules {
  const row = db.prepare('SELECT * FROM fee_rules WHERE id = 1').get() as any;
  return {
    id: row.id,
    fee_percentage: row.fee_percentage,
    excluded_category_ids: JSON.parse(row.excluded_category_ids || '[]'),
    taxes_excluded: row.taxes_excluded,
    discounts_reduce: row.discounts_reduce,
    refund_deduction_method: row.refund_deduction_method,
    updated_at: row.updated_at,
  };
}

/**
 * Compute the monthly location fee report for an inclusive [startDate, endDate]
 * range (YYYY-MM-DD). Uses the currently saved fee rules.
 */
export function computeMonthlyFeeReport(startDate: string, endDate: string): MonthlyFeeReport {
  const rules = getFeeRules();
  const { startIso, endIso } = dateRangeBounds(startDate, endDate);
  const excludedSet = new Set(rules.excluded_category_ids);

  // --- Per-category aggregation from line items joined to their orders -------
  const lineRows = db
    .prepare(
      `SELECT li.category_id AS categoryId,
              COALESCE(c.name, 'Uncategorized') AS categoryName,
              SUM(li.gross_sales_money) AS grossSales,
              SUM(li.total_discount_money) AS discounts,
              SUM(li.total_tax_money) AS taxes
       FROM order_line_items li
       JOIN orders o ON o.id = li.order_id
       LEFT JOIN categories c ON c.id = li.category_id
       WHERE o.created_at >= ? AND o.created_at <= ?
       GROUP BY li.category_id`
    )
    .all(startIso, endIso) as Array<{
    categoryId: string | null;
    categoryName: string;
    grossSales: number;
    discounts: number;
    taxes: number;
  }>;

  let grossSales = 0;
  let discounts = 0;
  let taxes = 0;
  let excludedCategorySales = 0;
  const categoryBreakdown: CategoryBreakdownRow[] = [];

  for (const row of lineRows) {
    const excluded = row.categoryId !== null && excludedSet.has(row.categoryId);
    grossSales += row.grossSales;
    discounts += row.discounts;
    taxes += row.taxes;
    if (excluded) {
      // Excluded categories contribute their full gross sales as a deduction.
      excludedCategorySales += row.grossSales;
    }
    categoryBreakdown.push({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      grossSales: row.grossSales,
      discounts: row.discounts,
      taxes: row.taxes,
      excluded,
      netSales: row.grossSales - row.discounts,
    });
  }
  categoryBreakdown.sort((a, b) => b.grossSales - a.grossSales);

  // --- Refunds: choose the date column based on the configured method --------
  const refundDateColumn =
    rules.refund_deduction_method === 'original_sale_date' ? 'order_created_at' : 'created_at';
  const refundRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount_money), 0) AS refunds
       FROM refunds
       WHERE ${refundDateColumn} >= ? AND ${refundDateColumn} <= ?`
    )
    .get(startIso, endIso) as { refunds: number };
  const refunds = refundRow.refunds;

  // --- Order count -----------------------------------------------------------
  const orderCountRow = db
    .prepare(`SELECT COUNT(*) AS n FROM orders WHERE created_at >= ? AND created_at <= ?`)
    .get(startIso, endIso) as { n: number };

  // --- Apply the fee formula -------------------------------------------------
  const discountDeduction = rules.discounts_reduce ? discounts : 0;
  const taxDeduction = rules.taxes_excluded ? taxes : 0;

  let feeLiableSales =
    grossSales - refunds - discountDeduction - excludedCategorySales - taxDeduction;
  // Never let fee-liable sales go negative.
  if (feeLiableSales < 0) feeLiableSales = 0;

  const feeOwed = percentageOfCents(feeLiableSales, rules.fee_percentage);

  return {
    startDate,
    endDate,
    grossSales,
    refunds,
    discounts,
    excludedCategorySales,
    taxes,
    feeLiableSales,
    feePercentage: rules.fee_percentage,
    feeOwed,
    orderCount: orderCountRow.n,
    categoryBreakdown,
    rulesApplied: {
      discountsReduce: !!rules.discounts_reduce,
      taxesExcluded: !!rules.taxes_excluded,
      refundDeductionMethod: rules.refund_deduction_method,
      excludedCategoryIds: rules.excluded_category_ids,
    },
  };
}
