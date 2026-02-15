/**
 * Configuration Repository
 * Reads/writes Configuration table. Used by config service.
 */
const { getDatabase } = require('./connection');

function getAll() {
  const db = getDatabase();
  const rows = db.prepare('SELECT key, value, description FROM Configuration').all();
  const config = {};
  rows.forEach((r) => {
    config[r.key] = r.value;
  });
  return config;
}

function get(key) {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM Configuration WHERE key = ?').get(key);
  return row ? row.value : null;
}

function set(key, value) {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO Configuration (key, value, description, updated_at)
    VALUES (?, ?, (SELECT description FROM Configuration WHERE key = ?), datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(key, String(value), key, String(value));
  return get(key);
}

module.exports = { getAll, get, set };
