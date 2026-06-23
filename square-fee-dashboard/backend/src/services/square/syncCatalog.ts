// Sync Catalog (categories + items) from the Square Catalog API into SQLite.
// Read-only against Square: we never push destructive changes here.
import { db } from '../../db/database.js';
import { squareFetch } from './squareClient.js';
import { normalizeCatalog, type SquareCatalogObject } from './normalize.js';

export interface SyncResult {
  count: number;
}

export async function syncCatalog(): Promise<SyncResult> {
  // Page through GET /v2/catalog/list for ITEM + CATEGORY objects.
  const objects: SquareCatalogObject[] = [];
  let cursor: string | undefined;
  do {
    const qs = new URLSearchParams({ types: 'ITEM,CATEGORY' });
    if (cursor) qs.set('cursor', cursor);
    const resp = await squareFetch<{ objects?: SquareCatalogObject[]; cursor?: string }>(
      `/v2/catalog/list?${qs.toString()}`
    );
    objects.push(...(resp.objects ?? []));
    cursor = resp.cursor;
  } while (cursor);

  const { categories, items } = normalizeCatalog(objects);
  const now = new Date().toISOString();

  // Only keep category references that actually exist as CATEGORY objects, so we
  // never violate the foreign keys on catalog_items / catalog_variations /
  // order_line_items (an item can reference an archived/absent category).
  const validCategoryIds = new Set(categories.map((c) => c.id));
  const safeCategory = (id: string | null): string | null => (id && validCategoryIds.has(id) ? id : null);

  const upsert = db.transaction(() => {
    const upsertCategory = db.prepare(
      `INSERT INTO categories (id, name) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name`
    );
    for (const c of categories) upsertCategory.run(c.id, c.name);

    // Square-sourced items: not local drafts. Preserve nothing local (source of truth = Square).
    const upsertItem = db.prepare(
      `INSERT INTO catalog_items
         (id, name, category_id, price_money, sku, barcode, description, track_inventory, quantity, ready_to_sync, square_object_id, is_draft, created_at, updated_at)
       VALUES (@id, @name, @category_id, @price_money, @sku, @barcode, @description, @track_inventory, 0, 0, @square_object_id, 0, @created_at, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, category_id=excluded.category_id, price_money=excluded.price_money,
         sku=excluded.sku, barcode=excluded.barcode, description=excluded.description,
         track_inventory=excluded.track_inventory, square_object_id=excluded.square_object_id,
         is_draft=0, updated_at=excluded.updated_at`
    );
    const upsertVariation = db.prepare(
      `INSERT INTO catalog_variations (variation_id, item_id, category_id) VALUES (?, ?, ?)
       ON CONFLICT(variation_id) DO UPDATE SET item_id=excluded.item_id, category_id=excluded.category_id`
    );
    for (const it of items) {
      const catId = safeCategory(it.category_id);
      upsertItem.run({
        id: it.id,
        name: it.name,
        category_id: catId,
        price_money: it.price_money,
        sku: it.sku,
        barcode: it.barcode,
        description: it.description,
        track_inventory: it.track_inventory,
        square_object_id: it.square_object_id,
        created_at: now,
        updated_at: now,
      });
      for (const vid of it.variation_ids) upsertVariation.run(vid, it.id, catId);
    }
  });
  upsert();

  return { count: items.length };
}
