const { getDatabase, saveDatabase } = require('./connection');

function runMemberValidityMigration() {
    const db = getDatabase();

    try {
        const memberTableInfo = db.prepare("PRAGMA table_info(Member)").all();
        const existingColumns = memberTableInfo.map(col => col.name);

        const newColumns = [
            { name: 'registration_date', type: 'TEXT' },
            { name: 'expiry_date', type: 'TEXT' },
            { name: 'registration_fee_paid', type: 'REAL' }
        ];

        let modified = false;

        newColumns.forEach(col => {
            if (!existingColumns.includes(col.name)) {
                console.log(`Running Member Validity Migration: Adding ${col.name} column...`);
                try {
                    db.exec(`ALTER TABLE Member ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`Column ${col.name} added successfully.`);
                    modified = true;
                } catch (e) {
                    console.error(`Failed to add column ${col.name}:`, e);
                }
            }
        });

        if (modified) {
            saveDatabase();
            console.log('Member Validity Migration completed.');
        } else {
            console.log('Member Validity Migration: Columns already exist.');
        }

    } catch (error) {
        console.error('Member Validity Migration failed:', error);
    }
}

module.exports = { runMemberValidityMigration };
