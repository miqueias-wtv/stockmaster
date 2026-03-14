import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'stockmaster.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create products table (initial schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 100),
    category TEXT NOT NULL CHECK(category IN ('computador', 'notebook', 'celular', 'outro')),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    price REAL NOT NULL DEFAULT 0 CHECK(price >= 0),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: Add userId column if it doesn't exist
try {
  const tableInfo = db.pragma('table_info(products)') as any[];
  const hasUserId = tableInfo.some(col => col.name === 'userId');

  if (!hasUserId) {
    console.log('Migrating database: adding userId column to products table...');
    db.exec(`ALTER TABLE products ADD COLUMN userId TEXT NOT NULL DEFAULT 'legacy-user'`);
  }
} catch (error) {
  console.error('Migration failed:', error);
}

export default db;
