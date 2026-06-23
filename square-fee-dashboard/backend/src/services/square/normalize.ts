// Pure normalization functions: Square REST API JSON -> local DB row shapes.
// These are intentionally free of any I/O so they can be unit-tested directly.
// All money is integer cents (Square REST "Money.amount" is already minor units).

export interface SquareMoney {
  amount?: number;
  currency?: string;
}

export interface SquareOrderLineItem {
  uid?: string;
  name?: string;
  quantity?: string;
  catalog_object_id?: string;
  base_price_money?: SquareMoney;
  gross_sales_money?: SquareMoney;
  total_discount_money?: SquareMoney;
  total_tax_money?: SquareMoney;
  total_money?: SquareMoney;
}

export interface SquareOrder {
  id: string;
  location_id?: string;
  state?: string;
  created_at?: string;
  total_money?: SquareMoney;
  total_discount_money?: SquareMoney;
  total_tax_money?: SquareMoney;
  line_items?: SquareOrderLineItem[];
}

export interface SquarePayment {
  id: string;
  order_id?: string;
  amount_money?: SquareMoney;
  tip_money?: SquareMoney;
  processing_fee?: Array<{ amount_money?: SquareMoney }>;
  status?: string;
  created_at?: string;
}

export interface SquareRefund {
  id: string;
  payment_id?: string;
  order_id?: string;
  amount_money?: SquareMoney;
  reason?: string;
  status?: string;
  created_at?: string;
}

export interface SquareCatalogObject {
  type: string;
  id: string;
  is_deleted?: boolean;
  category_data?: { name?: string };
  item_data?: {
    name?: string;
    description?: string;
    // Square's category model, newest -> legacy:
    //  - reporting_category: the single category used for reporting (preferred)
    //  - categories[]: all categories assigned to the item (current model)
    //  - category_id: deprecated single-category field (older accounts/API)
    reporting_category?: { id?: string; ordinal?: number };
    categories?: Array<{ id?: string; ordinal?: number }>;
    category_id?: string;
    variations?: Array<{
      id?: string;
      item_variation_data?: {
        sku?: string;
        upc?: string;
        price_money?: SquareMoney;
        track_inventory?: boolean;
      };
    }>;
  };
}

/** Safely read a Money amount as integer cents (defaults to 0). */
export function money(m?: SquareMoney): number {
  return Math.round(m?.amount ?? 0);
}

export interface NormalizedOrder {
  order: {
    id: string;
    location_id: string;
    state: string;
    created_at: string;
    gross_sales_money: number;
    total_discount_money: number;
    total_tax_money: number;
    total_money: number;
  };
  lineItems: Array<{
    order_id: string;
    uid: string;
    name: string;
    category_id: string | null;
    quantity: number;
    base_price_money: number;
    gross_sales_money: number;
    total_discount_money: number;
    total_tax_money: number;
    total_money: number;
    catalog_object_id: string | null;
  }>;
}

/**
 * Normalize a Square Order (with its line items). `resolveCategory` maps a line
 * item's catalog_object_id to a local category id (best-effort; may return null).
 */
export function normalizeOrder(
  o: SquareOrder,
  resolveCategory: (catalogObjectId: string | null | undefined) => string | null = () => null
): NormalizedOrder {
  const lineItems = (o.line_items ?? []).map((li, idx) => {
    const quantity = parseInt(li.quantity ?? '1', 10) || 1;
    const basePrice = money(li.base_price_money);
    // Prefer Square's computed gross_sales_money; fall back to unit price * qty.
    const gross = li.gross_sales_money ? money(li.gross_sales_money) : basePrice * quantity;
    return {
      order_id: o.id,
      uid: li.uid ?? `${o.id}_l${idx}`,
      name: li.name ?? 'Unnamed item',
      category_id: resolveCategory(li.catalog_object_id),
      quantity,
      base_price_money: basePrice,
      gross_sales_money: gross,
      total_discount_money: money(li.total_discount_money),
      total_tax_money: money(li.total_tax_money),
      total_money: money(li.total_money),
      catalog_object_id: li.catalog_object_id ?? null,
    };
  });

  const grossFromLines = lineItems.reduce((s, li) => s + li.gross_sales_money, 0);

  return {
    order: {
      id: o.id,
      location_id: o.location_id ?? '',
      state: o.state ?? 'COMPLETED',
      created_at: o.created_at ?? new Date().toISOString(),
      gross_sales_money: grossFromLines,
      total_discount_money: money(o.total_discount_money),
      total_tax_money: money(o.total_tax_money),
      total_money: money(o.total_money),
    },
    lineItems,
  };
}

export function normalizePayment(p: SquarePayment) {
  const processingFee = (p.processing_fee ?? []).reduce((s, f) => s + money(f.amount_money), 0);
  return {
    id: p.id,
    order_id: p.order_id ?? '',
    amount_money: money(p.amount_money),
    tip_money: money(p.tip_money),
    processing_fee_money: processingFee,
    status: p.status ?? 'COMPLETED',
    created_at: p.created_at ?? new Date().toISOString(),
  };
}

/**
 * Normalize a refund. `resolveOrderDate` returns the original sale date for the
 * refund's order (used for the "deduct by original sale date" fee rule). Falls
 * back to the refund's own created_at when the order date is unknown.
 */
export function normalizeRefund(
  r: SquareRefund,
  resolveOrderDate: (orderId: string | undefined) => string | null = () => null
) {
  const created = r.created_at ?? new Date().toISOString();
  return {
    id: r.id,
    payment_id: r.payment_id ?? '',
    order_id: r.order_id ?? '',
    amount_money: money(r.amount_money),
    reason: r.reason ?? '',
    status: r.status ?? 'COMPLETED',
    created_at: created,
    order_created_at: resolveOrderDate(r.order_id) ?? created,
  };
}

export interface NormalizedCatalog {
  categories: Array<{ id: string; name: string }>;
  items: Array<{
    id: string;
    name: string;
    category_id: string | null;
    price_money: number;
    sku: string | null;
    barcode: string | null;
    description: string | null;
    track_inventory: number;
    square_object_id: string;
    variation_ids: string[];
  }>;
}

/**
 * Resolve a single local category id for an item, preferring Square's reporting
 * category, then the first assigned category in the `categories[]` array, then
 * the deprecated `category_id`. Returns null if none are present.
 */
export function resolveItemCategoryId(
  itemData: NonNullable<SquareCatalogObject['item_data']>
): string | null {
  if (itemData.reporting_category?.id) return itemData.reporting_category.id;
  const fromArray = (itemData.categories ?? []).find((c) => c.id)?.id;
  if (fromArray) return fromArray;
  return itemData.category_id ?? null;
}

/** Split a Square catalog object list into local categories + items. */
export function normalizeCatalog(objects: SquareCatalogObject[]): NormalizedCatalog {
  const categories: Array<{ id: string; name: string }> = [];
  const items: NormalizedCatalog['items'] = [];

  for (const obj of objects) {
    if (obj.is_deleted) continue;
    if (obj.type === 'CATEGORY' && obj.category_data) {
      categories.push({ id: obj.id, name: obj.category_data.name ?? 'Unnamed category' });
    } else if (obj.type === 'ITEM' && obj.item_data) {
      const variations = obj.item_data.variations ?? [];
      const firstVar = variations[0]?.item_variation_data;
      const categoryId = resolveItemCategoryId(obj.item_data);
      items.push({
        id: obj.id,
        name: obj.item_data.name ?? 'Unnamed item',
        category_id: categoryId,
        price_money: money(firstVar?.price_money),
        sku: firstVar?.sku ?? null,
        barcode: firstVar?.upc ?? null,
        description: obj.item_data.description ?? null,
        track_inventory: firstVar?.track_inventory ? 1 : 0,
        square_object_id: obj.id,
        variation_ids: variations.map((v) => v.id).filter((x): x is string => !!x),
      });
    }
  }
  return { categories, items };
}
