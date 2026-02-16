/**
 * Log Service
 * Retrieves filtered activity logs and handles CSV export.
 */
const { getDatabase } = require('../database/connection');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Get all activity logs with optional filters.
 * @param {object} filters { fromDate, toDate, userId, actionType }
 * @returns {array} List of logs with user names
 */
function getAll(filters = {}) {
    const db = getDatabase();

    // Build the base query parts
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (filters.fromDate) {
        whereClause += ' AND date(a.timestamp) >= date(?)';
        params.push(filters.fromDate);
    }
    if (filters.toDate) {
        whereClause += ' AND date(a.timestamp) <= date(?)';
        params.push(filters.toDate);
    }
    if (filters.userId) {
        whereClause += ' AND a.user_id = ?';
        params.push(filters.userId);
    }
    if (filters.actionType) {
        whereClause += ' AND a.action_type = ?';
        params.push(filters.actionType);
    }

    // Count total
    const countSql = `
        SELECT COUNT(*) as count 
        FROM ActivityLog a 
        LEFT JOIN User u ON a.user_id = u.id 
        ${whereClause}
    `;

    let total = 0;
    try {
        const totalResult = db.prepare(countSql).get(...params);
        total = totalResult ? totalResult.count : 0;
    } catch (err) {
        console.error('Error counting logs:', err);
        // Fallback or continue
    }

    // Fetch Data
    let sql = `
    SELECT a.*, u.username as user_name
    FROM ActivityLog a
    LEFT JOIN User u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.timestamp DESC
  `;

    if (filters.page && filters.limit) {
        const limit = parseInt(filters.limit, 10);
        const offset = (parseInt(filters.page, 10) - 1) * limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
    } else {
        sql += ' LIMIT 100';
    }

    try {
        const data = db.prepare(sql).all(...params);
        return { data, total, page: filters.page || 1, limit: filters.limit || 100 };
    } catch (err) {
        console.error('Error fetching logs:', err);
        throw err;
    }
}

/**
 * Generate CSV content from filtered logs.
 * @param {object} filters 
 * @returns {string} CSV string
 */
function getCsvContent(filters = {}) {
    const logs = getAll(filters);
    const header = 'Timestamp,User,Action,Description\n';
    const rows = logs.map(log => {
        const safeDesc = (log.description || '').replace(/"/g, '""'); // Escape quotes
        return `"${log.timestamp}","${log.user_name || 'Unknown'}","${log.action_type}","${safeDesc}"`;
    }).join('\n');
    return header + rows;
}

module.exports = {
    getAll,
    getCsvContent
};
