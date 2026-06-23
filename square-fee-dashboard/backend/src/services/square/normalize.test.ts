// Unit tests for the pure Square -> local normalization functions.
// Run with: npm test  (uses Node's built-in test runner via tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  money,
  normalizeOrder,
  normalizePayment,
  normalizeRefund,
  normalizeCatalog,
  type SquareOrder,
  type SquarePayment,
  type SquareRefund,
  type SquareCatalogObject,
} from './normalize.js';

test('money() reads integer cents and defaults to 0', () => {
  assert.equal(money({ amount: 1099, currency: 'USD' }), 1099);
  assert.equal(money(undefined), 0);
  assert.equal(money({}), 0);
});

test('normalizeOrder sums line gross sales and resolves categories', () => {
  const order: SquareOrder = {
    id: 'order_1',
    location_id: 'L1',
    state: 'COMPLETED',
    created_at: '2026-06-01T15:00:00Z',
    total_money: { amount: 1170, currency: 'USD' },
    total_discount_money: { amount: 100, currency: 'USD' },
    total_tax_money: { amount: 70, currency: 'USD' },
    line_items: [
      {
        uid: 'li1',
        name: 'Latte',
        quantity: '2',
        catalog_object_id: 'VAR_LATTE',
        base_price_money: { amount: 500, currency: 'USD' },
        gross_sales_money: { amount: 1000, currency: 'USD' },
        total_discount_money: { amount: 100, currency: 'USD' },
        total_tax_money: { amount: 70, currency: 'USD' },
        total_money: { amount: 970, currency: 'USD' },
      },
      {
        uid: 'li2',
        name: 'Cookie',
        quantity: '1',
        catalog_object_id: 'VAR_UNKNOWN',
        base_price_money: { amount: 200, currency: 'USD' },
        // no gross_sales_money -> fall back to base * qty
      },
    ],
  };
  const resolve = (id?: string | null) => (id === 'VAR_LATTE' ? 'cat_coffee' : null);
  const { order: o, lineItems } = normalizeOrder(order, resolve);

  assert.equal(o.gross_sales_money, 1200); // 1000 + (200*1)
  assert.equal(o.total_discount_money, 100);
  assert.equal(o.total_tax_money, 70);
  assert.equal(o.total_money, 1170);
  assert.equal(lineItems.length, 2);
  assert.equal(lineItems[0].category_id, 'cat_coffee');
  assert.equal(lineItems[0].quantity, 2);
  assert.equal(lineItems[1].category_id, null);
  assert.equal(lineItems[1].gross_sales_money, 200);
});

test('normalizePayment sums processing fees', () => {
  const p: SquarePayment = {
    id: 'pay_1',
    order_id: 'order_1',
    amount_money: { amount: 1170 },
    tip_money: { amount: 200 },
    processing_fee: [{ amount_money: { amount: 34 } }, { amount_money: { amount: 10 } }],
    status: 'COMPLETED',
    created_at: '2026-06-01T15:00:05Z',
  };
  const n = normalizePayment(p);
  assert.equal(n.amount_money, 1170);
  assert.equal(n.tip_money, 200);
  assert.equal(n.processing_fee_money, 44);
});

test('normalizeRefund resolves original sale date with fallback', () => {
  const r: SquareRefund = {
    id: 'ref_1',
    payment_id: 'pay_1',
    order_id: 'order_1',
    amount_money: { amount: 500 },
    reason: 'Customer return',
    status: 'COMPLETED',
    created_at: '2026-06-05T10:00:00Z',
  };
  const withOrder = normalizeRefund(r, (id) => (id === 'order_1' ? '2026-06-01T15:00:00Z' : null));
  assert.equal(withOrder.order_created_at, '2026-06-01T15:00:00Z');
  assert.equal(withOrder.created_at, '2026-06-05T10:00:00Z');

  const noResolver = normalizeRefund(r);
  assert.equal(noResolver.order_created_at, '2026-06-05T10:00:00Z'); // falls back to refund date
});

test('normalizeCatalog splits categories and items, maps variations', () => {
  const objects: SquareCatalogObject[] = [
    { type: 'CATEGORY', id: 'CAT_COFFEE', category_data: { name: 'Coffee' } },
    {
      type: 'ITEM',
      id: 'ITEM_LATTE',
      item_data: {
        name: 'Latte',
        description: 'Espresso + milk',
        category_id: 'CAT_COFFEE',
        variations: [
          {
            id: 'VAR_LATTE',
            item_variation_data: { sku: 'COF-003', upc: '012345678905', price_money: { amount: 525 }, track_inventory: true },
          },
        ],
      },
    },
    { type: 'ITEM', id: 'ITEM_DELETED', is_deleted: true, item_data: { name: 'Gone' } },
  ];
  const { categories, items } = normalizeCatalog(objects);
  assert.equal(categories.length, 1);
  assert.equal(categories[0].name, 'Coffee');
  assert.equal(items.length, 1); // deleted item skipped
  assert.equal(items[0].name, 'Latte');
  assert.equal(items[0].category_id, 'CAT_COFFEE');
  assert.equal(items[0].price_money, 525);
  assert.equal(items[0].sku, 'COF-003');
  assert.equal(items[0].barcode, '012345678905');
  assert.equal(items[0].track_inventory, 1);
  assert.deepEqual(items[0].variation_ids, ['VAR_LATTE']);
});
