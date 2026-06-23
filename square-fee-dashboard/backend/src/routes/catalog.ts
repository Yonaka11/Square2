import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';

export const catalogRouter = Router();

// GET /api/catalog/items
catalogRouter.get('/items', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT ci.*, c.name AS category_name
       FROM catalog_items ci
       LEFT JOIN categories c ON c.id = ci.category_id
       ORDER BY ci.name ASC`
    )
    .all();
  res.json(rows);
});

// POST /api/catalog/items  -> create a local draft catalog item
catalogRouter.post('/items', (req, res) => {
  const b = req.body ?? {};
  if (!b.name || typeof b.name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  const now = new Date().toISOString();
  const id = `item_${randomUUID()}`;
  db.prepare(
    `INSERT INTO catalog_items (id, name, category_id, price_money, sku, barcode, description, track_inventory, quantity, ready_to_sync, square_object_id, is_draft, created_at, updated_at)
     VALUES (@id, @name, @category_id, @price_money, @sku, @barcode, @description, @track_inventory, @quantity, @ready_to_sync, NULL, 1, @created_at, @updated_at)`
  ).run({
    id,
    name: b.name,
    category_id: b.categoryId ?? null,
    price_money: Number.isInteger(b.priceMoney) ? b.priceMoney : 0,
    sku: b.sku ?? null,
    barcode: b.barcode ?? null,
    description: b.description ?? null,
    track_inventory: b.trackInventory ? 1 : 0,
    quantity: Number.isInteger(b.quantity) ? b.quantity : 0,
    ready_to_sync: b.readyToSync ? 1 : 0,
    created_at: now,
    updated_at: now,
  });
  const created = db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(id);
  res.status(201).json(created);
});

// PUT /api/catalog/items/:id  -> edit an existing catalog item
catalogRouter.put('/items/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Catalog item not found' });

  const b = req.body ?? {};
  const merged = {
    name: b.name ?? existing.name,
    category_id: b.categoryId !== undefined ? b.categoryId : existing.category_id,
    price_money: Number.isInteger(b.priceMoney) ? b.priceMoney : existing.price_money,
    sku: b.sku !== undefined ? b.sku : existing.sku,
    barcode: b.barcode !== undefined ? b.barcode : existing.barcode,
    description: b.description !== undefined ? b.description : existing.description,
    track_inventory: b.trackInventory !== undefined ? (b.trackInventory ? 1 : 0) : existing.track_inventory,
    quantity: Number.isInteger(b.quantity) ? b.quantity : existing.quantity,
    ready_to_sync: b.readyToSync !== undefined ? (b.readyToSync ? 1 : 0) : existing.ready_to_sync,
    updated_at: new Date().toISOString(),
    id,
  };
  db.prepare(
    `UPDATE catalog_items SET name=@name, category_id=@category_id, price_money=@price_money,
       sku=@sku, barcode=@barcode, description=@description, track_inventory=@track_inventory,
       quantity=@quantity, ready_to_sync=@ready_to_sync, updated_at=@updated_at
     WHERE id=@id`
  ).run(merged);
  const updated = db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(id);
  res.json(updated);
});

// GET /api/catalog/reports/missing-barcode
catalogRouter.get('/reports/missing-barcode', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM catalog_items WHERE barcode IS NULL OR barcode = '' ORDER BY name ASC`)
    .all();
  res.json(rows);
});

// GET /api/catalog/reports/uncategorized
catalogRouter.get('/reports/uncategorized', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM catalog_items WHERE category_id IS NULL OR category_id = '' ORDER BY name ASC`)
    .all();
  res.json(rows);
});
