/**
 * Backup Service
 * Handles manual and automated database backups and restoration.
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { getDbPath, saveDatabase, closeDatabase } = require('../database/connection');
const logger = require('../logger');

const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');

/**
 * Ensures backup directory exists.
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

/**
 * Creates a manual backup to the specified destination.
 * @param {string} destinationPath 
 * @returns {boolean} success
 */
function createManualBackup(destinationPath) {
    try {
        // Ensure data is flushed to disk
        saveDatabase();

        const sourcePath = getDbPath();
        fs.copyFileSync(sourcePath, destinationPath);
        logger.info(`Manual backup created at: ${destinationPath}`);
        return true;
    } catch (err) {
        logger.error(`Manual backup failed: ${err.message}`);
        return false;
    }
}

/**
 * Performs an automated backup to the AppData/backups folder.
 * Keeps only the last 5 backups to save space.
 */
function performAutoBackup() {
    try {
        ensureBackupDir();
        saveDatabase();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `auto_backup_${timestamp}.db`;
        const destPath = path.join(BACKUP_DIR, filename);
        const sourcePath = getDbPath();

        fs.copyFileSync(sourcePath, destPath);
        logger.info(`Auto backup created: ${filename}`);

        // Cleanup old backups (Keep last 5)
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('auto_backup_') && f.endsWith('.db'))
            .map(f => path.join(BACKUP_DIR, f))
            .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

        if (files.length > 5) {
            files.slice(5).forEach(f => {
                fs.unlinkSync(f);
                logger.info(`Deleted old backup: ${path.basename(f)}`);
            });
        }
    } catch (err) {
        logger.error(`Auto backup failed: ${err.message}`);
    }
}

/**
 * Restores the database from a backup file.
 * WARNING: Overwrites current DB and restarts application.
 * @param {string} backupFilePath 
 */
function restoreBackup(backupFilePath) {
    try {
        logger.info(`Restoring database from: ${backupFilePath}`);

        // 1. Close current DB connection
        closeDatabase();

        const dbPath = getDbPath();

        // 2. Create a safety backup of current state
        if (fs.existsSync(dbPath)) {
            const safetyPath = path.join(BACKUP_DIR, 'safety_before_restore.db');
            ensureBackupDir();
            fs.copyFileSync(dbPath, safetyPath);
            logger.info('Safety backup created.');
        }

        // 3. Overwrite DB
        fs.copyFileSync(backupFilePath, dbPath);
        logger.info('Database restored successfully.');

        // 4. Restart App
        app.relaunch();
        app.exit(0);
    } catch (err) {
        logger.error(`Restore failed: ${err.message}`);
        throw err;
    }
}

module.exports = {
    createManualBackup,
    performAutoBackup,
    restoreBackup
};
