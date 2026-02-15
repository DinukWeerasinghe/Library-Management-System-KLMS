/**
 * Category Service (for books).
 * Used only when enable_categories feature is on.
 */
const { getDatabase } = require('../database/connection');

function getAll() {
  const db = getDatabase();
  return db.prepare('SELECT id, name, description FROM Category ORDER BY name').all();
}

function create(data) {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO Category (name, description) VALUES (?, ?)').run(data.name || '', data.description || null);
  return db.prepare('SELECT id, name, description FROM Category WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = { getAll, create };
