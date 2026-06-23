// SQLite connection (better-sqlite3) and schema bootstrap.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_SQL } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the DB path relative to the repo root (backend/.. = square-fee-dashboard).
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const defaultDbPath = path.join(repoRoot, 'data', 'square_dashboard.db');
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(repoRoot, process.env.DATABASE_PATH)
  : defaultDbPath;

// Ensure the data directory exists.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/** Create tables (idempotent) and ensure a singleton fee_rules row exists. */
export function initDb(): void {
  db.exec(SCHEMA_SQL);
  const existing = db.prepare('SELECT id FROM fee_rules WHERE id = 1').get();
  if (!existing) {
    db.prepare(
      `INSERT INTO fee_rules (id, fee_percentage, excluded_category_ids, taxes_excluded, discounts_reduce, refund_deduction_method, updated_at)
       VALUES (1, 25, '[]', 0, 1, 'refund_date', ?)`
    ).run(new Date().toISOString());
  }
}

export function getDbPath(): string {
  return dbPath;
}
