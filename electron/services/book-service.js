/**
 * Book CRUD Service
 * Add, update, delete, search books. Tracks available copies. Optional categories.
 */
const { getDatabase } = require('../database/connection');
const { get: isFeatureEnabled } = require('../database/feature-toggle-repository');

function getAll(filters = {}) {
  const db = getDatabase();
  const useCategories = isFeatureEnabled('enable_categories');
  let sql = useCategories
    ? `SELECT b.*, c.name AS category_name FROM Book b LEFT JOIN Category c ON b.category_id = c.id WHERE 1=1`
    : 'SELECT b.* FROM Book b WHERE 1=1';
  const params = [];
  if (filters.categoryId) {
    sql += ' AND b.category_id = ?';
    params.push(filters.categoryId);
  }
  sql += ' ORDER BY b.title';
  return db.prepare(sql).all(...params);
}

function getById(id) {
  const db = getDatabase();
  const useCategories = isFeatureEnabled('enable_categories');
  if (useCategories) {
    return db.prepare(`
      SELECT b.*, c.name AS category_name FROM Book b
      LEFT JOIN Category c ON b.category_id = c.id WHERE b.id = ?
    `).get(id);
  }
  return db.prepare('SELECT * FROM Book WHERE id = ?').get(id);
}

function create(data) {
  const db = getDatabase();
  const useCategories = isFeatureEnabled('enable_categories');
  const { title, author, isbn, category_id, total_copies } = data;
  const copies = Math.max(1, parseInt(total_copies, 10) || 1);
  const catId = useCategories && category_id ? category_id : null;
  const stmt = db.prepare(`
    INSERT INTO Book (title, author, isbn, category_id, total_copies, available_copies)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    title || '',
    author || null,
    isbn || null,
    catId,
    copies,
    copies
  );
  return getById(result.lastInsertRowid);
}

function update(id, data) {
  const db = getDatabase();
  const existing = getById(id);
  if (!existing) throw new Error('Book not found');
  const useCategories = isFeatureEnabled('enable_categories');
  const { title, author, isbn, category_id, total_copies } = data;
  let available = existing.available_copies;
  if (total_copies !== undefined) {
    const total = Math.max(1, parseInt(total_copies, 10) || 1);
    const diff = total - existing.total_copies;
    available = Math.max(0, existing.available_copies + diff);
    db.prepare(`
      UPDATE Book SET title=?, author=?, isbn=?, category_id=?, total_copies=?, available_copies=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      title ?? existing.title,
      author !== undefined ? author : existing.author,
      isbn !== undefined ? isbn : existing.isbn,
      useCategories && category_id !== undefined ? category_id : existing.category_id,
      total,
      available,
      id
    );
  } else {
    db.prepare(`
      UPDATE Book SET title=?, author=?, isbn=?, category_id=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      title ?? existing.title,
      author !== undefined ? author : existing.author,
      isbn !== undefined ? isbn : existing.isbn,
      useCategories && category_id !== undefined ? category_id : existing.category_id,
      id
    );
  }
  return getById(id);
}

function deleteBook(id) {
  const db = getDatabase();
  const existing = getById(id);
  if (!existing) throw new Error('Book not found');
  const out = db.prepare('SELECT id FROM Issue WHERE book_id = ? AND return_date IS NULL').all(id);
  if (out.length > 0) {
    throw new Error('Cannot delete book with active issues. Process returns first.');
  }
  db.prepare('DELETE FROM Book WHERE id = ?').run(id);
  return { deleted: true, id };
}

function search(query) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return getAll({});
  }
  const db = getDatabase();
  const useCategories = isFeatureEnabled('enable_categories');
  const term = `%${query.trim()}%`;
  const sql = useCategories
    ? `SELECT b.*, c.name AS category_name FROM Book b LEFT JOIN Category c ON b.category_id = c.id
       WHERE b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? ORDER BY b.title`
    : `SELECT * FROM Book WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? ORDER BY title`;
  return db.prepare(sql).all(term, term, term);
}

function decreaseAvailableCopies(bookId) {
  const db = getDatabase();
  const book = getById(bookId);
  if (!book) throw new Error('Book not found');
  const available = parseInt(book.available_copies, 10) || 0;
  if (available <= 0) throw new Error('Book has no available copies');
  db.prepare(
    'UPDATE Book SET available_copies = available_copies - 1, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(bookId);
  return getById(bookId);
}

function increaseAvailableCopies(bookId) {
  const db = getDatabase();
  const book = getById(bookId);
  if (!book) throw new Error('Book not found');
  const available = parseInt(book.available_copies, 10) || 0;
  const total = parseInt(book.total_copies, 10) || 1;
  const newAvailable = Math.min(available + 1, total);
  db.prepare(
    'UPDATE Book SET available_copies = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(newAvailable, bookId);
  return getById(bookId);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteBook,
  search,
  decreaseAvailableCopies,
  increaseAvailableCopies,
};
