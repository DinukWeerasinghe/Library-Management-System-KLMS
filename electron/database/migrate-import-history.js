const { getDatabase } = require('./connection');
const logger = require('../logger');

function runImportHistoryMigration() {
    const db = getDatabase();

    logger.info('Running Import History Migration...');

    // 1. Create ImportBatch table
    db.exec(`
        CREATE TABLE IF NOT EXISTS ImportBatch (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK (type IN ('BOOK', 'MEMBER')),
            row_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // 2. Add batch_id to Book
    try {
        db.exec('ALTER TABLE Book ADD COLUMN batch_id INTEGER REFERENCES ImportBatch(id)');
        logger.info('Added batch_id to Book table');
    } catch (e) {
        // Column might already exist
    }

    // 3. Add batch_id to Member
    try {
        db.exec('ALTER TABLE Member ADD COLUMN batch_id INTEGER REFERENCES ImportBatch(id)');
        logger.info('Added batch_id to Member table');
    } catch (e) {
        // Column might already exist
    }
}

module.exports = { runImportHistoryMigration };
