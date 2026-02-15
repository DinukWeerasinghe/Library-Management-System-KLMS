const { getDatabase, saveDatabase } = require('./connection');

function runBookHybridIdMigration() {
    const db = getDatabase();

    try {
        const bookTableInfo = db.prepare("PRAGMA table_info(Book)").all();
        const hasExternalCode = bookTableInfo.some(col => col.name === 'external_code');
        const hasInternalCode = bookTableInfo.some(col => col.name === 'internal_code');
        const hasBarcodePath = bookTableInfo.some(col => col.name === 'barcode_path');

        if (!hasExternalCode || !hasInternalCode || !hasBarcodePath) {
            console.log('Running Book Hybrid ID Migration: Adding columns...');

            if (!hasExternalCode) {
                db.exec('ALTER TABLE Book ADD COLUMN external_code TEXT');
            }
            if (!hasInternalCode) {
                db.exec('ALTER TABLE Book ADD COLUMN internal_code TEXT');
            }
            if (!hasBarcodePath) {
                db.exec('ALTER TABLE Book ADD COLUMN barcode_path TEXT');
            }

            saveDatabase();
            console.log('Book Hybrid ID Migration completed.');
        } else {
            console.log('Book Hybrid ID Migration: Columns already exist.');
        }

    } catch (error) {
        console.error('Book Hybrid ID Migration failed:', error);
    }
}

module.exports = { runBookHybridIdMigration };
