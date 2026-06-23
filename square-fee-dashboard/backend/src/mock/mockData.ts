// Realistic mock Square data generator (>= 90 days).
// Produces categories, catalog items (some missing barcodes / uncategorized),
// orders with line items, discounts, taxes, payments, and refunds.
// All money values are integer cents. Uses a seeded RNG for reproducibility.
import { db } from '../db/database.js';

// --- Seeded RNG (mulberry32) so seeding is deterministic ---------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeedResult {
  orders: number;
  lineItems: number;
  payments: number;
  refunds: number;
  catalogItems: number;
  categories: number;
}

interface MockMenuItem {
  name: string;
  categoryKey: string | null; // null => uncategorized
  price: number; // cents
  sku: string;
  barcode: string | null; // null => missing barcode
  popularity: number; // relative weight
}

const CATEGORIES: Array<{ id: string; name: string }> = [
  { id: 'cat_coffee', name: 'Coffee & Espresso' },
  { id: 'cat_pastries', name: 'Pastries' },
  { id: 'cat_sandwiches', name: 'Sandwiches' },
  { id: 'cat_merch', name: 'Merchandise' },
  { id: 'cat_giftcards', name: 'Gift Cards' },
  { id: 'cat_catering', name: 'Catering' },
];

const MENU: MockMenuItem[] = [
  { name: 'House Drip Coffee', categoryKey: 'cat_coffee', price: 325, sku: 'COF-001', barcode: '0011000000017', popularity: 10 },
  { name: 'Cappuccino', categoryKey: 'cat_coffee', price: 475, sku: 'COF-002', barcode: '0011000000024', popularity: 9 },
  { name: 'Latte', categoryKey: 'cat_coffee', price: 525, sku: 'COF-003', barcode: '0011000000031', popularity: 9 },
  { name: 'Cold Brew', categoryKey: 'cat_coffee', price: 495, sku: 'COF-004', barcode: null, popularity: 7 },
  { name: 'Espresso Shot', categoryKey: 'cat_coffee', price: 275, sku: 'COF-005', barcode: '0011000000055', popularity: 5 },
  { name: 'Croissant', categoryKey: 'cat_pastries', price: 395, sku: 'PAS-001', barcode: '0012000000014', popularity: 8 },
  { name: 'Blueberry Muffin', categoryKey: 'cat_pastries', price: 350, sku: 'PAS-002', barcode: null, popularity: 6 },
  { name: 'Chocolate Chip Cookie', categoryKey: 'cat_pastries', price: 295, sku: 'PAS-003', barcode: '0012000000038', popularity: 7 },
  { name: 'Cinnamon Roll', categoryKey: 'cat_pastries', price: 450, sku: 'PAS-004', barcode: '0012000000045', popularity: 5 },
  { name: 'Turkey Club', categoryKey: 'cat_sandwiches', price: 895, sku: 'SAN-001', barcode: '0013000000013', popularity: 6 },
  { name: 'Veggie Wrap', categoryKey: 'cat_sandwiches', price: 825, sku: 'SAN-002', barcode: null, popularity: 5 },
  { name: 'Grilled Cheese', categoryKey: 'cat_sandwiches', price: 695, sku: 'SAN-003', barcode: '0013000000037', popularity: 5 },
  { name: 'Branded Tumbler', categoryKey: 'cat_merch', price: 1899, sku: 'MER-001', barcode: '0014000000012', popularity: 2 },
  { name: 'Coffee Bag 12oz', categoryKey: 'cat_merch', price: 1599, sku: 'MER-002', barcode: '0014000000029', popularity: 3 },
  { name: 'Logo T-Shirt', categoryKey: 'cat_merch', price: 2499, sku: 'MER-003', barcode: null, popularity: 1 },
  { name: 'Gift Card $25', categoryKey: 'cat_giftcards', price: 2500, sku: 'GC-025', barcode: '0015000000025', popularity: 2 },
  { name: 'Gift Card $50', categoryKey: 'cat_giftcards', price: 5000, sku: 'GC-050', barcode: '0015000000056', popularity: 1 },
  { name: 'Catering Box (12)', categoryKey: 'cat_catering', price: 4500, sku: 'CAT-001', barcode: null, popularity: 1 },
  { name: 'Mystery Daily Special', categoryKey: null, price: 599, sku: 'MISC-001', barcode: null, popularity: 3 },
];

const TAX_RATE = 0.085; // 8.5% sales tax applied to (gross - discount)

function pad(n: number, len = 4): string {
  return n.toString().padStart(len, '0');
}

/** Wipe transactional + catalog data but keep fee_rules. */
function clearData(): void {
  db.exec(`
    DELETE FROM refunds;
    DELETE FROM payments;
    DELETE FROM order_line_items;
    DELETE FROM orders;
    DELETE FROM catalog_items;
    DELETE FROM categories;
    DELETE FROM locations;
    DELETE FROM sync_logs;
  `);
}

export function generateMockData(days = 95): SeedResult {
  const rng = mulberry32(42);
  const now = new Date();
  const locationId = 'loc_mock_001';

  const result: SeedResult = { orders: 0, lineItems: 0, payments: 0, refunds: 0, catalogItems: 0, categories: 0 };

  const insertAll = db.transaction(() => {
    clearData();

    // Location
    db.prepare(`INSERT INTO locations (id, name, currency, created_at) VALUES (?, ?, 'USD', ?)`).run(
      locationId,
      'Downtown Cafe (Sandbox)',
      now.toISOString()
    );

    // Categories
    const insertCat = db.prepare(`INSERT INTO categories (id, name) VALUES (?, ?)`);
    for (const c of CATEGORIES) {
      insertCat.run(c.id, c.name);
      result.categories++;
    }

    // Catalog items
    const insertItem = db.prepare(
      `INSERT INTO catalog_items (id, name, category_id, price_money, sku, barcode, description, track_inventory, quantity, ready_to_sync, square_object_id, is_draft, created_at, updated_at)
       VALUES (@id, @name, @category_id, @price_money, @sku, @barcode, @description, @track_inventory, @quantity, @ready_to_sync, NULL, @is_draft, @created_at, @updated_at)`
    );
    MENU.forEach((m, i) => {
      insertItem.run({
        id: `item_${pad(i + 1)}`,
        name: m.name,
        category_id: m.categoryKey,
        price_money: m.price,
        sku: m.sku,
        barcode: m.barcode,
        description: `${m.name} - mock catalog item`,
        track_inventory: m.categoryKey === 'cat_merch' ? 1 : 0,
        quantity: m.categoryKey === 'cat_merch' ? Math.floor(rng() * 50) + 5 : 0,
        ready_to_sync: 0,
        is_draft: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      result.catalogItems++;
    });

    // Weighted item picker
    const weightedItems: MockMenuItem[] = [];
    for (const m of MENU) for (let i = 0; i < m.popularity; i++) weightedItems.push(m);
    const pickItem = () => weightedItems[Math.floor(rng() * weightedItems.length)];

    const insertOrder = db.prepare(
      `INSERT INTO orders (id, location_id, state, created_at, gross_sales_money, total_discount_money, total_tax_money, total_money)
       VALUES (?, ?, 'COMPLETED', ?, ?, ?, ?, ?)`
    );
    const insertLine = db.prepare(
      `INSERT INTO order_line_items (order_id, uid, name, category_id, quantity, base_price_money, gross_sales_money, total_discount_money, total_tax_money, total_money, catalog_object_id)
       VALUES (@order_id, @uid, @name, @category_id, @quantity, @base_price_money, @gross_sales_money, @total_discount_money, @total_tax_money, @total_money, @catalog_object_id)`
    );
    const insertPayment = db.prepare(
      `INSERT INTO payments (id, order_id, amount_money, tip_money, processing_fee_money, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)`
    );
    const insertRefund = db.prepare(
      `INSERT INTO refunds (id, payment_id, order_id, amount_money, reason, status, created_at, order_created_at)
       VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`
    );

    let orderSeq = 0;
    // Hour weights model a cafe: morning + lunch rush, quiet evenings.
    const hourWeights = [0,0,0,0,0,0, 3,8,12,10,7,9, 12,8,5,4,3,2, 2,1,1,0,0,0];
    const totalHourWeight = hourWeights.reduce((a, b) => a + b, 0);
    const pickHour = () => {
      let r = rng() * totalHourWeight;
      for (let h = 0; h < 24; h++) {
        r -= hourWeights[h];
        if (r <= 0) return h;
      }
      return 12;
    };

    for (let d = days - 1; d >= 0; d--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      const dow = day.getDay();
      // Weekends are busier; one in ~12 days is unusually slow.
      const isWeekend = dow === 0 || dow === 6;
      const slowDay = rng() < 0.08;
      let baseOrders = isWeekend ? 22 : 14;
      if (slowDay) baseOrders = Math.floor(baseOrders * 0.4);
      const numOrders = baseOrders + Math.floor(rng() * 8);

      for (let o = 0; o < numOrders; o++) {
        orderSeq++;
        const hour = pickHour();
        const minute = Math.floor(rng() * 60);
        const created = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, Math.floor(rng() * 60));
        if (created.getTime() > now.getTime()) continue; // never seed the future
        const orderId = `order_${pad(orderSeq, 6)}`;

        const numLines = 1 + Math.floor(rng() * 4);
        let orderGross = 0;
        let orderDiscount = 0;
        let orderTax = 0;

        const lines: any[] = [];
        for (let li = 0; li < numLines; li++) {
          const item = pickItem();
          const quantity = 1 + Math.floor(rng() * 2);
          const gross = item.price * quantity;
          // ~18% of line items receive a 10-25% discount.
          let discount = 0;
          if (rng() < 0.18) {
            const pct = 0.1 + rng() * 0.15;
            discount = Math.round(gross * pct);
          }
          // Gift cards are not taxed; everything else taxed on (gross - discount).
          const taxable = item.categoryKey === 'cat_giftcards' ? 0 : gross - discount;
          const tax = Math.round(taxable * TAX_RATE);
          const total = gross - discount + tax;
          orderGross += gross;
          orderDiscount += discount;
          orderTax += tax;
          const itemIndex = MENU.indexOf(item);
          lines.push({
            order_id: orderId,
            uid: `${orderId}_l${li}`,
            name: item.name,
            category_id: item.categoryKey,
            quantity,
            base_price_money: item.price,
            gross_sales_money: gross,
            total_discount_money: discount,
            total_tax_money: tax,
            total_money: total,
            catalog_object_id: `item_${pad(itemIndex + 1)}`,
          });
        }
        const orderTotal = orderGross - orderDiscount + orderTax;

        insertOrder.run(orderId, locationId, created.toISOString(), orderGross, orderDiscount, orderTax, orderTotal);
        result.orders++;
        for (const l of lines) {
          insertLine.run(l);
          result.lineItems++;
        }

        const paymentId = `pay_${pad(orderSeq, 6)}`;
        const tip = rng() < 0.4 ? Math.round(orderTotal * (0.1 + rng() * 0.1)) : 0;
        const processingFee = Math.round(orderTotal * 0.029) + 10;
        insertPayment.run(paymentId, orderId, orderTotal, tip, processingFee, created.toISOString());
        result.payments++;

        // ~5% of orders get a refund (full or partial), refunded 0-9 days later.
        if (rng() < 0.05) {
          const full = rng() < 0.5;
          const refundAmount = full ? orderTotal : Math.round(orderTotal * (0.2 + rng() * 0.5));
          const refundDate = new Date(created.getTime() + Math.floor(rng() * 10) * 86400000);
          if (refundDate.getTime() <= now.getTime() && refundAmount > 0) {
            insertRefund.run(
              `ref_${pad(orderSeq, 6)}`,
              paymentId,
              orderId,
              refundAmount,
              full ? 'Customer return' : 'Partial adjustment',
              refundDate.toISOString(),
              created.toISOString()
            );
            result.refunds++;
          }
        }
      }
    }

    // Record a sync log entry for this mock seed.
    db.prepare(
      `INSERT INTO sync_logs (sync_type, orders_synced, payments_synced, refunds_synced, catalog_items_synced, status, error, created_at)
       VALUES ('mock', ?, ?, ?, ?, 'success', NULL, ?)`
    ).run(result.orders, result.payments, result.refunds, result.catalogItems, now.toISOString());
  });

  insertAll();
  return result;
}
