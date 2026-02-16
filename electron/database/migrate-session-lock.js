/**
 * Migration to add Session Lock configuration keys.
 */
const { getDatabase } = require('./connection');

function runSessionLockMigration() {
    const db = getDatabase();

    const lockConfigs = [
        ['lock_enabled', '0', 'Enable Session Auto Lock'],
        ['lock_timeout_minutes', '5', 'Inactivity timeout in minutes'],
        ['lock_pin', '1111', 'Session Lock PIN']
    ];

    lockConfigs.forEach(([k, v, d]) => {
        db.prepare('INSERT OR IGNORE INTO Configuration (key, value, description) VALUES (?, ?, ?)').run(k, v, d);
    });

    console.log('Session Lock migration completed.');
}

module.exports = { runSessionLockMigration };
