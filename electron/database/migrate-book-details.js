const { getDatabase, saveDatabase } = require('./connection');
const logger = require('../logger');

function runBookDetailsMigration() {
    const db = getDatabase();

    try {
        const bookTableInfo = db.prepare("PRAGMA table_info(Book)").all();
        const hasPublishedYear = bookTableInfo.some(col => col.name === 'published_year');
        const hasPrice = bookTableInfo.some(col => col.name === 'price');
        const hasAcquisitionType = bookTableInfo.some(col => col.name === 'acquisition_type');

        if (!hasPublishedYear || !hasPrice || !hasAcquisitionType) {
            logger.info('Running Book Details Migration: Adding new columns...');

            if (!hasPublishedYear) {
                db.exec('ALTER TABLE Book ADD COLUMN published_year INTEGER');
            }
            if (!hasPrice) {
                db.exec('ALTER TABLE Book ADD COLUMN price REAL');
            }
            if (!hasAcquisitionType) {
                db.exec('ALTER TABLE Book ADD COLUMN acquisition_type TEXT');
            }

            saveDatabase();
            logger.info('Book Details Migration completed.');
        } else {
            logger.info('Book Details Migration: Columns already exist.');
        }
    } catch (error) {
        logger.error('Book Details Migration failed:', error);
    }
}

module.exports = { runBookDetailsMigration };
