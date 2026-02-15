/**
 * Feature Toggle Repository
 * Reads/writes FeatureToggle table. Used by feature service.
 */
const { getDatabase } = require('./connection');

function getAll() {
  const db = getDatabase();
  const rows = db.prepare('SELECT key, enabled, description FROM FeatureToggle').all();
  const features = {};
  rows.forEach((r) => {
    features[r.key] = Boolean(r.enabled);
  });
  return features;
}

function get(key) {
  const db = getDatabase();
  const row = db.prepare('SELECT enabled FROM FeatureToggle WHERE key = ?').get(key);
  return row ? Boolean(row.enabled) : false;
}

function set(key, enabled) {
  const db = getDatabase();
  db.prepare(`
    UPDATE FeatureToggle SET enabled = ?, updated_at = datetime('now') WHERE key = ?
  `).run(enabled ? 1 : 0, key);
  return get(key);
}

module.exports = { getAll, get, set };
