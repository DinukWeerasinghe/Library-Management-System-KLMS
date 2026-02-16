/**
 * Book CRUD Service
 * Add, update, delete, search books. Tracks available copies. Optional categories.
 */
const { getDatabase } = require('../database/connection');
const { get: isFeatureEnabled } = require('../database/feature-toggle-repository');
const barcodeService = require('./barcode-service');
const logger = require('../logger');
const activityService = require('./activity-service');
const authService = require('./auth-service');

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

function getBookByAnyCode(code) {
  if (!code) return null;
  const trimmed = String(code).trim();
  const db = getDatabase();
  // Order of check: 1. external_code, 2. isbn, 3. internal_code
  let book = db.prepare('SELECT * FROM Book WHERE external_code = ?').get(trimmed);
  if (!book) book = db.prepare('SELECT * FROM Book WHERE isbn = ?').get(trimmed);
  if (!book) book = db.prepare('SELECT * FROM Book WHERE internal_code = ?').get(trimmed);
  return book;
}

function generateBookCode() {
  const db = getDatabase();
  const last = db.prepare("SELECT internal_code FROM Book WHERE internal_code LIKE 'B%' ORDER BY internal_code DESC LIMIT 1").get();
  let nextNum = 1;
  if (last && last.internal_code) {
    const num = parseInt(last.internal_code.substring(1), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `B${String(nextNum).padStart(6, '0')}`;
}

function create(data) {
  const db = getDatabase();
  const useCategories = isFeatureEnabled('enable_categories');
  const { title, author, isbn, category_id, total_copies, external_code } = data;
  const copies = Math.max(1, parseInt(total_copies, 10) || 1);
  const catId = useCategories && category_id ? category_id : null;

  let finalExternalCode = external_code || null;
  let finalInternalCode = null;

  if (!external_code && !isbn && !data.internal_code) {
    finalInternalCode = generateBookCode();
  } else if (data.internal_code) {
    finalInternalCode = data.internal_code;
  } else {
    // ALWAYS generate an internal code for KLMS tracking/printing if one isn't provided
    finalInternalCode = generateBookCode();
  }

  const stmt = db.prepare(`
    INSERT INTO Book (title, author, isbn, category_id, external_code, internal_code, total_copies, available_copies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    title || '',
    author || null,
    isbn || null,
    catId,
    finalExternalCode,
    finalInternalCode,
    copies,
    copies
  );

  const newId = result.lastInsertRowid;

  // If internal_code was generated, generate barcode image
  if (finalInternalCode) {
    barcodeService.generateBarcode(finalInternalCode, 'book-codes').then(path => {
      db.prepare('UPDATE Book SET barcode_path = ? WHERE id = ?').run(path, newId);
    }).catch(err => {
      logger.error(`Failed to generate book barcode for ${newId}:`, err);
    });
  }

  // Log Activity
  const userId = authService.getCurrentUserId();
  if (userId) {
    activityService.logActivity(userId, activityService.ACTION_TYPES.ADD_BOOK, `Added book: ${title}`);
  }

  return getById(newId);
}

function update(id, data) {
  const db = getDatabase();
  const existing = getById(id);
  if (!existing) throw new Error('Book not found');
  const useCategories = isFeatureEnabled('enable_categories');
  const { title, author, isbn, category_id, total_copies, external_code } = data;
  let available = existing.available_copies;

  const total = total_copies !== undefined ? Math.max(1, parseInt(total_copies, 10) || 1) : existing.total_copies;
  if (total_copies !== undefined) {
    const diff = total - existing.total_copies;
    available = Math.max(0, existing.available_copies + diff);
  }

  db.prepare(`
    UPDATE Book SET 
      title=?, author=?, isbn=?, category_id=?, external_code=?, internal_code=COALESCE(?, internal_code), total_copies=?, available_copies=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    title ?? existing.title,
    author !== undefined ? author : existing.author,
    isbn !== undefined ? isbn : existing.isbn,
    useCategories && category_id !== undefined ? category_id : existing.category_id,
    external_code !== undefined ? external_code : existing.external_code,
    data.internal_code || (existing.internal_code ? null : generateBookCode()),
    total,
    available,
    id
  );

  const updated = getById(id);
  // If barcode is missing but internal_code exists, generate it
  if (!updated.barcode_path && updated.internal_code) {
    barcodeService.generateBarcode(updated.internal_code, 'book-codes').then(path => {
      db.prepare('UPDATE Book SET barcode_path = ? WHERE id = ?').run(path, id);
    }).catch(err => {
      logger.error(`Deferred book barcode generation failed for existing book ${id}: `, err);
    });
  }

  return updated;
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

  // Log Activity
  const userId = authService.getCurrentUserId();
  if (userId) {
    activityService.logActivity(userId, activityService.ACTION_TYPES.DELETE_BOOK, `Deleted book: ${existing.title}`);
  }

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
       WHERE b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.internal_code LIKE ? OR b.external_code LIKE ? ORDER BY b.title`
    : `SELECT * FROM Book WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR internal_code LIKE ? OR external_code LIKE ? ORDER BY title`;
  return db.prepare(sql).all(term, term, term, term, term);
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
  getBookByAnyCode,
  decreaseAvailableCopies,
  increaseAvailableCopies,
  generateBookCode,
};
