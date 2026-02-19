const { getDatabase } = require('../database/connection');
const logger = require('../logger');
const pkg = require('../../package.json');

/**
 * Version Service
 * Handles application version tracking and update checks.
 */
class VersionService {
    constructor() {
        this.versionName = pkg.version;
        // Version code calculation: major * 10000 + minor * 100 + patch
        // Version 1.0.0 -> Code 10000
        // Version 1.10.0 -> Code 11000
        // Version 1.0.10 -> Code 10010
        // Version 2.5.3 -> Code 20503
        const parts = this.versionName.split('.').map(p => parseInt(p, 10));
        this.versionCode = (parts[0] * 10000) + ((parts[1] || 0) * 100) + (parts[2] || 0);
        this.buildDate = new Date().toISOString();
    }

    /**
     * Returns consolidated build metadata.
     */
    getAppBuildInfo() {
        return {
            versionName: this.versionName,
            versionCode: this.versionCode,
            buildDate: this.buildDate
        };
    }

    /**
     * Checks if the current package.json version differs from the database version.
     * Updates the database if a new version is detected.
     * @returns {Promise<boolean>} True if version was updated, false otherwise
     */
    async checkAndUpdateVersion() {
        try {
            const db = getDatabase();
            const stored = db.prepare('SELECT version_name, version_code FROM AppMeta ORDER BY id DESC LIMIT 1').get();
            
            if (!stored) {
                // No version in database, insert current
                const buildInfo = this.getAppBuildInfo();
                db.prepare('INSERT INTO AppMeta (version_name, version_code) VALUES (?, ?)').run(
                    `KLMS v${buildInfo.versionName}`,
                    buildInfo.versionCode
                );
                logger.info(`Initial version recorded: ${buildInfo.versionName} (${buildInfo.versionCode})`);
                return true;
            }

            // Check if version changed
            if (stored.version_code !== this.versionCode) {
                const buildInfo = this.getAppBuildInfo();
                db.prepare('INSERT INTO AppMeta (version_name, version_code) VALUES (?, ?)').run(
                    `KLMS v${buildInfo.versionName}`,
                    buildInfo.versionCode
                );
                logger.info(`Version updated: ${stored.version_name} (${stored.version_code}) -> ${buildInfo.versionName} (${buildInfo.versionCode})`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error(`Failed to check/update version: ${error.message}`);
            return false;
        }
    }

    /**
     * Retrieves the current application version from the database.
     * @returns {Promise<{version_name: string, version_code: number}>}
     */
    async getCurrentVersion() {
        try {
            const db = getDatabase();
            const version = db.prepare('SELECT version_name, version_code FROM AppMeta ORDER BY id DESC LIMIT 1').get();
            return version || { version_name: `KLMS v${this.versionName}`, version_code: this.versionCode };
        } catch (error) {
            logger.error(`Failed to get current version: ${error.message}`);
            return { version_name: `KLMS v${this.versionName}`, version_code: this.versionCode };
        }
    }

    /**
     * Placeholder for future update check logic.
     * @returns {Promise<{updateAvailable: boolean, latestVersion?: string}>}
     */
    async checkForUpdate() {
        logger.info('Checking for updates...');
        // logic for remote update check goes here
        return { updateAvailable: false };
    }
}

module.exports = new VersionService();
