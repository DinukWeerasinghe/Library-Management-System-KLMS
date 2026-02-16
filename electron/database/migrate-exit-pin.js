/**
 * Migration to add Exit PIN configuration keys.
 */
const { getDatabase } = require('./connection');

function runExitPinMigration() {
    const db = getDatabase();

    const exitPinConfigs = [
        ['exit_pin_enabled', '0', 'Enable Exit PIN Security'],
        ['exit_pin', '1234', 'Application Exit PIN']
    ];

    exitPinConfigs.forEach(([k, v, d]) => {
        db.prepare('INSERT OR IGNORE INTO Configuration (key, value, description) VALUES (?, ?, ?)').run(k, v, d);
    });

    console.log('Exit PIN migration completed.');
}

module.exports = { runExitPinMigration };
