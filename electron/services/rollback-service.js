const { getDatabase } = require('../database/connection');
const logger = require('../logger');
const activityService = require('./activity-service');
const authService = require('./auth-service');

/**
 * Rollback Service
 * Handles listing import history and rolling back batches.
 */

function listBatches() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM ImportBatch ORDER BY created_at DESC').all();
}

function rollbackImport(batchIdRaw) {
    const db = getDatabase();
    const batchId = Number(batchIdRaw);

    // 1. Find batch
    const batch = db.prepare('SELECT * FROM ImportBatch WHERE id = ?').get(batchId);
    if (!batch) throw new Error('Import batch not found');

    // 2. Process Deletion Based on Type
    if (batch.type === 'BOOK') {
        const anyIssues = db.prepare(`
            SELECT i.id FROM Issue i
            JOIN Book b ON i.book_id = b.id
            WHERE b.batch_id = ?
        `).get(batchId);

        if (anyIssues) {
            throw new Error('Cannot rollback: Some items in this batch have transaction history.');
        }

        const result = db.prepare('DELETE FROM Book WHERE batch_id = ?').run(batchId);
        logger.info(`Rollback Batch #${batchId}: Deleted ${result.changes} books`);

    } else if (batch.type === 'MEMBER') {
        const anyIssues = db.prepare(`
            SELECT i.id FROM Issue i
            JOIN Member m ON i.member_id = m.id
            WHERE m.batch_id = ?
        `).get(batchId);

        if (anyIssues) {
            throw new Error('Cannot rollback: Some members in this batch have transaction history.');
        }

        const result = db.prepare('DELETE FROM Member WHERE batch_id = ?').run(batchId);
        logger.info(`Rollback Batch #${batchId}: Deleted ${result.changes} members`);
    }

    // 3. Delete batch record
    db.prepare('DELETE FROM ImportBatch WHERE id = ?').run(batchId);

    // 4. Log Activity
    const userId = authService.getCurrentUserId();
    if (userId) {
        activityService.logActivity(userId, activityService.ACTION_TYPES.SYSTEM_UPDATE, `Rolled back import batch #${batchId} (${batch.type})`);
    }

    return { success: true };
}

module.exports = {
    listBatches,
    rollbackImport
};
