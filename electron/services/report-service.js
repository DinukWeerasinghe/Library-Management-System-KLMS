const { getDatabase } = require('../database/connection');
const logger = require('../logger');

/**
 * Filter SQL helper for date range.
 */
function getDateRangeFilter(fromDate, toDate, tableAlias = 'i') {
  let sql = '';
  const params = [];
  const prefix = tableAlias ? `${tableAlias}.` : '';
  if (fromDate) {
    sql += ` AND ${prefix}issue_date >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    sql += ` AND ${prefix}issue_date <= ?`;
    params.push(toDate);
  }
  return { sql, params };
}

function getMostBorrowedBooks(fromDate, toDate) {
  const db = getDatabase();
  const filter = getDateRangeFilter(fromDate, toDate, 'i');
  const sql = `
    SELECT b.title, b.author, COUNT(i.id) as borrow_count
    FROM Issue i
    LEFT JOIN Book b ON i.book_id = b.id
    WHERE 1=1 ${filter.sql}
    GROUP BY i.book_id
    ORDER BY borrow_count DESC
    LIMIT 5
  `;
  return db.prepare(sql).all(...filter.params);
}

function getTopActiveMembers(fromDate, toDate) {
  const db = getDatabase();
  const filter = getDateRangeFilter(fromDate, toDate, 'i');
  const sql = `
    SELECT m.name, m.member_code, COUNT(i.id) as issue_count
    FROM Issue i
    LEFT JOIN Member m ON i.member_id = m.id
    WHERE 1=1 ${filter.sql}
    GROUP BY i.member_id
    ORDER BY issue_count DESC
    LIMIT 5
  `;
  return db.prepare(sql).all(...filter.params);
}

function getSummary(fromDate, toDate) {
  const db = getDatabase();
  const filter = getDateRangeFilter(fromDate, toDate, ''); // No alias for Issue table direct count

  const totalIssued = db.prepare(`SELECT COUNT(*) as c FROM Issue WHERE 1=1 ${filter.sql}`).get(...filter.params)?.c || 0;
  const totalReturned = db.prepare(`SELECT COUNT(*) as c FROM Issue WHERE status = 'RETURNED' ${filter.sql}`).get(...filter.params)?.c || 0;
  const totalOverdue = db.prepare(`SELECT COUNT(*) as c FROM Issue WHERE status = 'ISSUED' AND due_date < date('now') ${filter.sql}`).get(...filter.params)?.c || 0;
  const totalFineCollected = db.prepare(`SELECT SUM(fine_amount) as s FROM Issue WHERE status = 'RETURNED' ${filter.sql}`).get(...filter.params)?.s || 0;

  return { totalIssued, totalReturned, totalOverdue, totalFineCollected };
}

/**
 * Get report data by type.
 */
function getReport(type, memberId, fromDate, toDate) {
  const db = getDatabase();
  const dateFilter = getDateRangeFilter(fromDate, toDate, 'i');

  logger.info(`Generating report: ${type}, range: ${fromDate} to ${toDate}, memberId: ${memberId}`);

  let data = [];

  // Custom fetch logic for filtered reports if not using issueService.getAll()
  // But issueService.getAll() only supports memberId and status. 
  // For date range, we'll implement it here or update issueService.

  const getFilteredIssues = (extraSql = '', extraParams = []) => {
    let sql = `
      SELECT i.*, b.title AS book_title, b.author AS book_author,
             m.name AS member_name, m.member_type
      FROM Issue i
      LEFT JOIN Book b ON i.book_id = b.id
      LEFT JOIN Member m ON i.member_id = m.id
      WHERE 1=1 ${dateFilter.sql} ${extraSql}
      ORDER BY i.id DESC
    `;
    const finalParams = [...dateFilter.params, ...extraParams];
    return db.prepare(sql).all(...finalParams);
  };

  switch (type) {
    case 'issued':
      data = getFilteredIssues("AND i.status = 'ISSUED'");
      break;
    case 'returned':
      data = getFilteredIssues("AND i.status = 'RETURNED'");
      break;
    case 'overdue':
      data = getFilteredIssues("AND i.return_date IS NULL AND i.due_date < date('now')");
      break;
    case 'member':
      if (memberId) {
        data = getFilteredIssues("AND i.member_id = ?", [memberId]);
      } else {
        data = getFilteredIssues();
      }
      break;
    default:
      data = [];
  }

  const result = {
    data,
    summary: getSummary(fromDate, toDate),
    mostBorrowed: getMostBorrowedBooks(fromDate, toDate),
    topMembers: getTopActiveMembers(fromDate, toDate)
  };

  logger.info(`Report generated successfully. Results: ${data.length} records found.`);
  return result;
}

module.exports = {
  getReport,
  getMostBorrowedBooks,
  getTopActiveMembers,
};
