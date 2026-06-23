import { Router } from 'express';
import { db } from '../db/database.js';
import { getFeeRules } from '../services/feeCalculator.js';
import type { RefundDeductionMethod } from '../types.js';

export const settingsRouter = Router();

// GET /api/settings/fee-rules
settingsRouter.get('/fee-rules', (_req, res) => {
  res.json(getFeeRules());
});

// PUT /api/settings/fee-rules
settingsRouter.put('/fee-rules', (req, res) => {
  const current = getFeeRules();
  const b = req.body ?? {};

  const feePercentage =
    typeof b.feePercentage === 'number' && b.feePercentage >= 0 && b.feePercentage <= 100
      ? b.feePercentage
      : current.fee_percentage;
  const excludedCategoryIds = Array.isArray(b.excludedCategoryIds)
    ? b.excludedCategoryIds.filter((x: unknown) => typeof x === 'string')
    : current.excluded_category_ids;
  const taxesExcluded = b.taxesExcluded !== undefined ? (b.taxesExcluded ? 1 : 0) : current.taxes_excluded;
  const discountsReduce = b.discountsReduce !== undefined ? (b.discountsReduce ? 1 : 0) : current.discounts_reduce;
  const allowedMethods: RefundDeductionMethod[] = ['refund_date', 'original_sale_date'];
  const refundDeductionMethod: RefundDeductionMethod = allowedMethods.includes(b.refundDeductionMethod)
    ? b.refundDeductionMethod
    : current.refund_deduction_method;

  db.prepare(
    `UPDATE fee_rules SET fee_percentage=?, excluded_category_ids=?, taxes_excluded=?, discounts_reduce=?, refund_deduction_method=?, updated_at=? WHERE id=1`
  ).run(
    feePercentage,
    JSON.stringify(excludedCategoryIds),
    taxesExcluded,
    discountsReduce,
    refundDeductionMethod,
    new Date().toISOString()
  );
  res.json(getFeeRules());
});

// GET /api/settings/categories -> for the excluded-categories selector
settingsRouter.get('/categories', (_req, res) => {
  const rows = db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all();
  res.json(rows);
});
