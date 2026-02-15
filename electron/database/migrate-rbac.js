const { getDatabase, saveDatabase } = require('./connection');

function runRbacMigration() {
    const db = getDatabase();

    try {
        // Check if User table already exists
        const userTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'").get();

        if (userTableExists) {
            // Check if role column exists (idempotency)
            try {
                db.prepare('SELECT role FROM User LIMIT 1').get();
                return; // Already migrated
            } catch (e) {
                // User table exists but maybe no role? Should not happen if we created it correctly.
                // But for safety, we could add it.
                console.log('User table exists but might be missing role. Checking...');
            }
        }

        console.log('Running RBAC Migration...');

        // 1. Create User table
        db.exec(`
      CREATE TABLE IF NOT EXISTS User (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'LIBRARIAN', 'TEACHER')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

        // 2. Copy data from Admin if it exists
        const adminTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Admin'").get();
        if (adminTableExists) {
            console.log('Migrating Admin to User...');
            const admins = db.prepare('SELECT * FROM Admin').all();
            const insertUser = db.prepare('INSERT INTO User (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

            for (const admin of admins) {
                insertUser.run(admin.id, admin.username, admin.password_hash, 'ADMIN', admin.created_at, admin.updated_at);
            }

            // 3. Drop Admin table
            db.exec('DROP TABLE Admin');
            console.log('Admin table dropped.');
        }

        saveDatabase();
        console.log('RBAC Migration completed.');

    } catch (error) {
        console.error('RBAC Migration failed:', error);
    }
}

module.exports = { runRbacMigration };
