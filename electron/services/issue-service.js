/**
 * Issue (Lending) Service
 * issueBook, returnBook, renewBook. Respects feature toggles and configuration.
 */
const { getDatabase } = require('../database/connection');
const { get: getConfig } = require('../database/config-repository');
const { get: isFeatureEnabled } = require('../database/feature-toggle-repository');
const bookService = require('./book-service');
const memberService = require('./member-service');

/**
 * Issue (lend) a book to a member.
 * @param {number} memberId
 * @param {number} bookId
 * @returns {object} Created issue record
 */
function issueBook(memberId, bookId) {
  const db = getDatabase();

  const book = bookService.getById(bookId);
  if (!book) throw new Error('Book not found');

  // 1.5. Check membership validity
  if (!memberService.isMembershipActive(memberId)) {
    throw new Error('Membership expired. Please renew.');
  }

  // 2. Check available copies
  if (book.available_copies <= 0) {
    throw new Error('Book not available');
  }

  // 3. Borrow limit (if enabled)
  if (isFeatureEnabled('enable_borrow_limit')) {
    const maxBooks = parseInt(getConfig('max_books_per_member'), 10) || 3;
    const countRow = db.prepare(
      'SELECT COUNT(*) as c FROM Issue WHERE member_id = ? AND return_date IS NULL'
    ).get(memberId);
    const count = (countRow && countRow.c) || 0;
    if (count >= maxBooks) {
      throw new Error('Borrow limit exceeded');
    }
  }

  // 4. Due date (if enabled)
  let dueDate = null;
  if (isFeatureEnabled('enable_due_date')) {
    const maxDays = parseInt(getConfig('max_borrow_days'), 10) || 14;
    const result = db.prepare("SELECT date('now') as today").get();
    const issueDate = result.today;
    const dueResult = db.prepare("SELECT date(?, '+' || ? || ' days') as d").get(issueDate, maxDays);
    dueDate = dueResult.d;
  }

  // 5. Insert Issue (use date('now') in SQL so format is consistent)
  db.prepare(`
    INSERT INTO Issue (member_id, book_id, issue_date, due_date, return_date, status, fine_amount)
    VALUES (?, ?, date('now'), ?, NULL, 'ISSUED', 0)
  `).run(memberId, bookId, dueDate);

  const created = db.prepare('SELECT id FROM Issue ORDER BY id DESC LIMIT 1').get();
  const issueId = created && (created.id != null) ? Number(created.id) : 0;
  if (!issueId) throw new Error('Failed to create issue');

  // 6. Reduce available copies
  bookService.decreaseAvailableCopies(bookId);

  return getIssueById(issueId);
}

/**
 * Get issue by id (with book and member info).
 */
function getIssueById(id) {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT i.*, b.title AS book_title, b.author AS book_author,
           m.name AS member_name, m.member_type
    FROM Issue i
    JOIN Book b ON i.book_id = b.id
    JOIN Member m ON i.member_id = m.id
    WHERE i.id = ?
  `).get(id);
  return row;
}

/**
 * Return a book (end lending).
 * @param {number} issueId
 * @returns {object} Updated issue
 */
function returnBook(issueId) {
  const db = getDatabase();

  // 1. Find issue
  const issue = db.prepare('SELECT * FROM Issue WHERE id = ?').get(issueId);
  if (!issue) throw new Error('Issue not found');
  if (issue.return_date) throw new Error('Book already returned');

  const returnDateRow = db.prepare("SELECT date('now') as d").get();
  const returnDate = returnDateRow.d;

  // 2 & 3. Set return_date and status
  let fineAmount = 0;
  if (isFeatureEnabled('enable_fine') && issue.due_date) {
    const gracePeriod = parseInt(getConfig('grace_period'), 10) || 0;
    const finePerDay = parseFloat(getConfig('fine_per_day')) || 0;
    const lateRow = db.prepare(`
      SELECT MAX(0, CAST(
        julianday(?) - julianday(?) - ? AS INTEGER
      )) AS late_days
    `).get(returnDate, issue.due_date, gracePeriod);
    const lateDays = (lateRow && lateRow.late_days) || 0;
    fineAmount = lateDays * finePerDay;
  }

  db.prepare(`
    UPDATE Issue SET return_date = ?, status = 'RETURNED', fine_amount = ?
    WHERE id = ?
  `).run(returnDate, fineAmount, issueId);

  // 4. Increase available copies
  bookService.increaseAvailableCopies(issue.book_id);

  return getIssueById(issueId);
}

/**
 * Return a book using any code (ISBN, external, or internal).
 * @param {string} scannedCode
 * @returns {object} Updated issue
 */
function returnBookByAnyCode(scannedCode) {
  const db = getDatabase();

  // 1. Find book
  const book = bookService.getBookByAnyCode(scannedCode);
  if (!book) throw new Error('Book not found with the scanned code');

  // 2. Find active issue
  const issue = db.prepare(`
    SELECT id FROM Issue 
    WHERE book_id = ? AND status = 'ISSUED'
  `).get(book.id);

  if (!issue) throw new Error(`The book "${book.title}" is not currently issued`);

  // 3. Process return
  return returnBook(issue.id);
}

/**
 * Renew an issue (extend due date by max_borrow_days).
 * @param {number} issueId
 * @returns {object} Updated issue
 */
function renewBook(issueId) {
  if (!isFeatureEnabled('enable_renewal')) {
    throw new Error('Renewal is not enabled');
  }

  const db = getDatabase();
  const issue = db.prepare('SELECT * FROM Issue WHERE id = ?').get(issueId);
  if (!issue) throw new Error('Issue not found');
  if (issue.return_date) throw new Error('Cannot renew returned book');

  const maxDays = parseInt(getConfig('max_borrow_days'), 10) || 14;
  const currentDue = issue.due_date || issue.issue_date;
  const newDueRow = db.prepare("SELECT date(?, '+' || ? || ' days') as d").get(currentDue, maxDays);
  const newDueDate = newDueRow.d;

  db.prepare('UPDATE Issue SET due_date = ?, renewed = 1 WHERE id = ?').run(newDueDate, issueId);

  return getIssueById(issueId);
}

/**
 * List issues (optionally filter by status or member).
 */
function getAll(filters = {}) {
  const db = getDatabase();
  let sql = `
    SELECT i.*, b.title AS book_title, b.author AS book_author,
           m.name AS member_name, m.member_type
    FROM Issue i
    JOIN Book b ON i.book_id = b.id
    JOIN Member m ON i.member_id = m.id
    WHERE 1=1
  `;
  const params = [];
  if (filters.status) {
    sql += ' AND i.status = ?';
    params.push(filters.status);
  }
  if (filters.memberId) {
    sql += ' AND i.member_id = ?';
    params.push(filters.memberId);
  }
  sql += ' ORDER BY i.id DESC';
  return params.length ? db.prepare(sql).all(...params) : db.prepare(sql).all();
}

/**
 * Overdue: due_date < today AND status = ISSUED (return_date IS NULL).
 */
function getOverdue() {
  const db = getDatabase();
  return db.prepare(`
    SELECT i.*, b.title AS book_title, b.author AS book_author,
           m.name AS member_name, m.member_type
    FROM Issue i
    JOIN Book b ON i.book_id = b.id
    JOIN Member m ON i.member_id = m.id
    WHERE i.return_date IS NULL AND i.due_date IS NOT NULL AND i.due_date < date('now')
    ORDER BY i.due_date ASC
  `).all();
}

module.exports = {
  issueBook,
  returnBook,
  returnBookByAnyCode,
  renewBook,
  getIssueById,
  getAll,
  getOverdue,
};
