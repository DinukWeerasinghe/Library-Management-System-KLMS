/**
 * Boot Service
 * Handles the sequential initialization of the application before the main UI is shown.
 */
const { ensureDatabaseExists } = require('../database/connection');
const configRepository = require('../database/config-repository');
const logger = require('../logger');

/**
 * Executes the full boot sequence.
 * @param {Function} onProgress - Callback for progress updates (message, progressPercent)
 */
async function runBootSequence(onProgress) {
    logger.info('Starting Boot Sequence...');

    // 1. Load Database
    onProgress('Connecting to database...', 10);
    await loadDatabase();

    // 2. Load Configuration
    onProgress('Loading configurations...', 30);
    await loadConfig();

    // 3. System Integrity Checks
    onProgress('Verifying system integrity...', 50);
    await detectClockTamper();

    // 4. Verify License/Trial
    onProgress('Validating license...', 70);
    await validateTrial();
    await validateLicense();

    // 5. Initialize Services
    onProgress('Initializing services...', 90);
    await initTheme();
    await initSession();

    onProgress('Boot complete!', 100);
    logger.info('Boot Sequence Complete.');
}

async function loadDatabase() {
    logger.debug('Boot: Ensuring database exists...');
    await ensureDatabaseExists();

    // Run migrations (logic moved here from main.js)
    const { runMigration } = require('../database/migrate-issue-columns');
    const { runRbacMigration } = require('../database/migrate-rbac');
    const { runBrandingMigration } = require('../database/migrate-branding');
    const { runMemberCodeMigration } = require('../database/migrate-member-code');
    const { runMemberBarcodeMigration } = require('../database/migrate-member-barcode');
    const { runBookHybridIdMigration } = require('../database/migrate-book-barcode');
    const { runMemberValidityMigration } = require('../database/migrate-member-validity');
    const { runBookBarcodeFillMigration } = require('../database/migrate-book-barcode-fill');
    const { runExitPinMigration } = require('../database/migrate-exit-pin');
    const { runSessionLockMigration } = require('../database/migrate-session-lock');
    const { runActivityLogMigration } = require('../database/migrate-activity-log');
    const { runImportHistoryMigration } = require('../database/migrate-import-history');
    const { runVersionMigration } = require('../database/migrate-version');

    runMigration();
    runRbacMigration();
    runBrandingMigration();
    runMemberCodeMigration();
    runMemberBarcodeMigration();
    runBookHybridIdMigration();
    runMemberValidityMigration();
    await runBookBarcodeFillMigration();
    runExitPinMigration();
    runSessionLockMigration();
    runActivityLogMigration();
    runImportHistoryMigration();
    await runVersionMigration();
}

async function loadConfig() {
    logger.debug('Boot: Loading config repository...');
    // config-repository loads data in its constructor or first get call
    // We can explicitly trigger a load here if needed.
}

async function validateTrial() {
    logger.debug('Boot: Validating trial status...');
    // Placeholder for future trial logic
    return true;
}

async function validateLicense() {
    logger.debug('Boot: Validating license...');
    // Placeholder for future license logic
    return true;
}

async function detectClockTamper() {
    logger.debug('Boot: Checking for system clock tampering...');
    // Basic check: Ensure current time is not earlier than some marker
    return true;
}

async function initTheme() {
    logger.debug('Boot: Initializing theme...');
    const themeService = require('./ThemeService');
    await themeService.getTheme();
}

async function initSession() {
    logger.debug('Boot: Initializing active sessions...');
    // Cleanup any orphaned session logs marked 'ACTIVE' but not closed
    const { getDatabase } = require('../database/connection');
    const db = getDatabase();
    db.run("UPDATE SessionLog SET status = 'CLOSED', logout_time = datetime('now') WHERE status = 'ACTIVE' OR status = 'LOCKED'");
}

module.exports = {
    runBootSequence,
    loadDatabase,
    loadConfig,
    validateTrial,
    validateLicense,
    detectClockTamper,
    initTheme,
    initSession
};
