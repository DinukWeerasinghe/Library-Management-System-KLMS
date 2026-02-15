const { getDatabase, saveDatabase } = require('./connection');

function runMemberBarcodeMigration() {
    const db = getDatabase();

    try {
        // Check if barcode_path exists in Member table
        const memberTableInfo = db.prepare("PRAGMA table_info(Member)").all();
        const hasBarcodePath = memberTableInfo.some(col => col.name === 'barcode_path');

        if (!hasBarcodePath) {
            console.log('Running Member Barcode Migration: Adding barcode_path column...');

            try {
                db.exec('ALTER TABLE Member ADD COLUMN barcode_path TEXT');
                console.log('Column added successfully via ALTER TABLE.');
            } catch (e) {
                console.error('ALTER TABLE failed:', e);
            }

            saveDatabase();
            console.log('Member Barcode Migration completed.');
        } else {
            console.log('Member Barcode Migration: barcode_path already exists.');
        }

    } catch (error) {
        console.error('Member Barcode Migration failed:', error);
    }
}

module.exports = { runMemberBarcodeMigration };
