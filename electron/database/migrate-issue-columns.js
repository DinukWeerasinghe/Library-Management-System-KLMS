/**
 * One-time migration: add status and fine_amount to Issue table if missing.
 * Safe to run on existing DBs.
 */
const { getDatabase } = require('./connection');

function getTableColumns(db, tableName) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.map((r) => r.name);
}

function runMigration() {
  const db = getDatabase();
  const columns = getTableColumns(db, 'Issue');
  if (!columns.includes('status')) {
    db.exec("ALTER TABLE Issue ADD COLUMN status TEXT NOT NULL DEFAULT 'ISSUED'");
    db.exec("UPDATE Issue SET status = 'RETURNED' WHERE return_date IS NOT NULL");
  }
  if (!columns.includes('fine_amount')) {
    db.exec('ALTER TABLE Issue ADD COLUMN fine_amount REAL NOT NULL DEFAULT 0');
  }
}

module.exports = { runMigration, getTableColumns };
