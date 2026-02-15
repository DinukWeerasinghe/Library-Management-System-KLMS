const { getDatabase, saveDatabase } = require('./connection');

function runMemberCodeMigration() {
    const db = getDatabase();

    try {
        // Check if member_id exists in Member table
        const memberTableInfo = db.prepare("PRAGMA table_info(Member)").all();
        const hasMemberId = memberTableInfo.some(col => col.name === 'member_id');
        const hasMemberCode = memberTableInfo.some(col => col.name === 'member_code');

        if (hasMemberId && !hasMemberCode) {
            console.log('Running Member Code Migration: Renaming member_id to member_code...');

            // sqlite doesn't support RENAME COLUMN in older versions, 
            // but sql.js usually does if it's based on a recent sqlite.
            // However, the safest way is to recreate the table if needed, 
            // but RENAME COLUMN is simpler if supported.
            try {
                db.exec('ALTER TABLE Member RENAME COLUMN member_id TO member_code');
                console.log('Column renamed successfully via ALTER TABLE.');
            } catch (e) {
                console.log('ALTER TABLE failed, using table recreation method...');
                // Fallback: Recreate table method
                db.exec(`
                    CREATE TABLE Member_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        member_type TEXT NOT NULL CHECK (member_type IN ('Student', 'Teacher')),
                        name TEXT NOT NULL,
                        email TEXT,
                        phone TEXT,
                        address TEXT,
                        member_code TEXT UNIQUE,
                        created_at TEXT DEFAULT (datetime('now')),
                        updated_at TEXT DEFAULT (datetime('now'))
                    );
                    INSERT INTO Member_new (id, member_type, name, email, phone, address, member_code, created_at, updated_at)
                    SELECT id, member_type, name, email, phone, address, member_id, created_at, updated_at FROM Member;
                    DROP TABLE Member;
                    ALTER TABLE Member_new RENAME TO Member;
                `);
            }

            saveDatabase();
            console.log('Member Code Migration completed.');
        } else if (hasMemberCode) {
            console.log('Member Code Migration: member_code already exists.');
        }

    } catch (error) {
        console.error('Member Code Migration failed:', error);
    }
}

module.exports = { runMemberCodeMigration };
