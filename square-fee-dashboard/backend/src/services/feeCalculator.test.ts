// Unit tests for the core location-fee math (the most important business rule).
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFeeFromAggregates } from './feeCalculator.js';

// Shared sample aggregates (integer cents).
const inputs = {
  grossSales: 100000, // $1,000.00
  refunds: 5000, // $50.00
  discounts: 4000, // $40.00
  excludedCategorySales: 10000, // $100.00
  taxes: 8000, // $80.00
};

test('default rules: discounts reduce, taxes NOT excluded, 25%', () => {
  const r = computeFeeFromAggregates(inputs, {
    fee_percentage: 25,
    discounts_reduce: 1,
    taxes_excluded: 0,
  });
  // 100000 - 5000 - 4000 - 10000 - 0 = 81000
  assert.equal(r.feeLiableSales, 81000);
  assert.equal(r.feeOwed, 20250); // 81000 * 25%
});

test('taxes excluded reduces fee-liable sales', () => {
  const r = computeFeeFromAggregates(inputs, {
    fee_percentage: 25,
    discounts_reduce: 1,
    taxes_excluded: 1,
  });
  // 100000 - 5000 - 4000 - 10000 - 8000 = 73000
  assert.equal(r.feeLiableSales, 73000);
  assert.equal(r.feeOwed, 18250);
});

test('discounts not reducing increases fee-liable sales', () => {
  const r = computeFeeFromAggregates(inputs, {
    fee_percentage: 25,
    discounts_reduce: 0,
    taxes_excluded: 0,
  });
  // 100000 - 5000 - 0 - 10000 - 0 = 85000
  assert.equal(r.feeLiableSales, 85000);
  assert.equal(r.feeOwed, 21250);
});

test('custom fee percentage with rounding to nearest cent', () => {
  const r = computeFeeFromAggregates(
    { grossSales: 10003, refunds: 0, discounts: 0, excludedCategorySales: 0, taxes: 0 },
    { fee_percentage: 30, discounts_reduce: 1, taxes_excluded: 0 }
  );
  // 10003 * 30% = 3000.9 -> rounds to 3001
  assert.equal(r.feeLiableSales, 10003);
  assert.equal(r.feeOwed, 3001);
});

test('fee-liable sales are clamped at zero (never negative)', () => {
  const r = computeFeeFromAggregates(
    { grossSales: 1000, refunds: 5000, discounts: 0, excludedCategorySales: 0, taxes: 0 },
    { fee_percentage: 25, discounts_reduce: 1, taxes_excluded: 0 }
  );
  assert.equal(r.feeLiableSales, 0);
  assert.equal(r.feeOwed, 0);
});

test('all deductions applied together', () => {
  const r = computeFeeFromAggregates(inputs, {
    fee_percentage: 25,
    discounts_reduce: 1,
    taxes_excluded: 1,
  });
  // 100000 - 5000 - 4000 - 10000 - 8000 = 73000; reported deductions exposed too
  assert.equal(r.discountDeduction, 4000);
  assert.equal(r.taxDeduction, 8000);
  assert.equal(r.feeLiableSales, 73000);
});
