const { getDatabase } = require('./connection');
const versionService = require('../services/version-service');

async function runVersionMigration() {
    const db = getDatabase();

    db.exec(`
        CREATE TABLE IF NOT EXISTS AppMeta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version_name TEXT NOT NULL,
            version_code INTEGER NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Check and update version if package.json changed
    await versionService.checkAndUpdateVersion();
}

module.exports = { runVersionMigration };
