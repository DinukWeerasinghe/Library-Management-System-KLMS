/**
 * Category Service (for books).
 * Used only when enable_categories feature is on.
 */
const { getDatabase } = require('../database/connection');

function getAll() {
  const db = getDatabase();
  return db.prepare('SELECT id, name, description FROM Category ORDER BY name').all();
}

function getByName(name) {
  const db = getDatabase();
  return db.prepare('SELECT id, name, description FROM Category WHERE lower(name) = lower(?)').get(name.trim());
}

function create(data) {
  const db = getDatabase();
  const name = (data.name || '').trim();

  // Safety: check if exists first
  const existing = getByName(name);
  if (existing) return existing;

  const result = db.prepare('INSERT INTO Category (name, description) VALUES (?, ?)').run(name, data.description || null);
  return db.prepare('SELECT id, name, description FROM Category WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = { getAll, getByName, create };
