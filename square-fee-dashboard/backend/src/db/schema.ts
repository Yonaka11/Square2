// SQLite schema (DDL). All money columns are INTEGER cents.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TEXT NOT NULL,
  gross_sales_money INTEGER NOT NULL DEFAULT 0,
  total_discount_money INTEGER NOT NULL DEFAULT 0,
  total_tax_money INTEGER NOT NULL DEFAULT 0,
  total_money INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  base_price_money INTEGER NOT NULL DEFAULT 0,
  gross_sales_money INTEGER NOT NULL DEFAULT 0,
  total_discount_money INTEGER NOT NULL DEFAULT 0,
  total_tax_money INTEGER NOT NULL DEFAULT 0,
  total_money INTEGER NOT NULL DEFAULT 0,
  catalog_object_id TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_line_items_order ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_line_items_category ON order_line_items(category_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  amount_money INTEGER NOT NULL DEFAULT 0,
  tip_money INTEGER NOT NULL DEFAULT 0,
  processing_fee_money INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount_money INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TEXT NOT NULL,
  order_created_at TEXT NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);
CREATE INDEX IF NOT EXISTS idx_refunds_order_created_at ON refunds(order_created_at);

CREATE TABLE IF NOT EXISTS catalog_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT,
  price_money INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  barcode TEXT,
  description TEXT,
  track_inventory INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  ready_to_sync INTEGER NOT NULL DEFAULT 0,
  square_object_id TEXT,
  is_draft INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Maps Square catalog item-variation ids -> their item + category, so order
-- line items (which reference variation ids) can be attributed to a category.
CREATE TABLE IF NOT EXISTS catalog_variations (
  variation_id TEXT PRIMARY KEY,
  item_id TEXT,
  category_id TEXT
);

CREATE TABLE IF NOT EXISTS fee_rules (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fee_percentage REAL NOT NULL DEFAULT 25,
  excluded_category_ids TEXT NOT NULL DEFAULT '[]',
  taxes_excluded INTEGER NOT NULL DEFAULT 0,
  discounts_reduce INTEGER NOT NULL DEFAULT 1,
  refund_deduction_method TEXT NOT NULL DEFAULT 'refund_date',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_fee_report_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  fee_owed_money INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,
  orders_synced INTEGER NOT NULL DEFAULT 0,
  payments_synced INTEGER NOT NULL DEFAULT 0,
  refunds_synced INTEGER NOT NULL DEFAULT 0,
  catalog_items_synced INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error TEXT,
  created_at TEXT NOT NULL
);
`;
