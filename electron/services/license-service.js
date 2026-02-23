/**
 * License Service
 * Handles machine identification, trial tracking, and license activation.
 */
const crypto = require('crypto');
const os = require('os');
const configRepository = require('../database/config-repository');
const logger = require('../logger');

class LicenseService {
    constructor() {
        this.salt = 'KLMS_SECURE_SALT_2026';
    }

    /**
     * Generates a unique machine ID based on hardware info.
     * This is a simplified version; in production, you might use better packages like 'node-machine-id'.
     */
    getMachineId() {
        const interfaces = os.networkInterfaces();
        let macStr = '';
        for (const name in interfaces) {
            for (const iface of interfaces[name]) {
                if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                    macStr += iface.mac;
                }
            }
        }

        // Fallback to hostname + username if no MAC found
        if (!macStr) macStr = os.hostname() + os.userInfo().username;

        return crypto.createHash('sha256').update(macStr + this.salt).digest('hex').substring(0, 16).toUpperCase();
    }

    /**
     * Checks the current license status.
     * @returns {Object} status - { isValid: boolean, type: 'TRIAL'|'ACTIVE'|'EXPIRED', daysRemaining: number }
     */
    getStatus() {
        const status = configRepository.get('license_status') || 'TRIAL';
        const key = configRepository.get('license_key');
        const installDateStr = configRepository.get('installation_date');
        const machineId = this.getMachineId();

        // 1. If Active, verify key matches machine ID
        if (status === 'ACTIVE' && key) {
            if (this.verifyKey(key, machineId)) {
                return { isValid: true, type: 'ACTIVE', daysRemaining: 9999 };
            }
            logger.warn('License key mismatch for this machine.');
            return { isValid: false, type: 'EXPIRED', daysRemaining: 0 };
        }

        // 2. If Trial, calculate days remaining
        if (status === 'TRIAL') {
            if (!installDateStr) {
                // Should have been set in boot/init
                return { isValid: true, type: 'TRIAL', daysRemaining: 30 };
            }

            const installDate = new Date(installDateStr);
            const now = new Date();
            const diffTime = now - installDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const remaining = 30 - diffDays;

            if (remaining <= 0) {
                return { isValid: false, type: 'EXPIRED', daysRemaining: 0 };
            }
            return { isValid: true, type: 'TRIAL', daysRemaining: remaining };
        }

        return { isValid: false, type: 'EXPIRED', daysRemaining: 0 };
    }

    /**
     * Simple algorithm to verify a key against a machine ID.
     * key = hex(sha256(machineId + salt)).substring(0, 12)
     */
    verifyKey(key, machineId) {
        if (!key || !machineId) return false;
        const expected = crypto.createHash('sha256')
            .update(machineId + this.salt + 'LICENSE_KEY')
            .digest('hex')
            .substring(0, 12)
            .toUpperCase();
        return key.toUpperCase() === expected;
    }

    /**
     * Activates the software with a key.
     */
    async activate(key) {
        const machineId = this.getMachineId();
        if (this.verifyKey(key, machineId)) {
            await configRepository.set('license_key', key.toUpperCase());
            await configRepository.set('license_status', 'ACTIVE');
            await configRepository.set('machine_id', machineId);
            logger.info('Software activated successfully.');
            return { success: true };
        }
        return { success: false, error: 'Invalid activation key for this machine.' };
    }
}

module.exports = new LicenseService();
