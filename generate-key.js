/**
 * KLMS Activation Key Generator
 * Use this to generate a key for a specific Machine ID.
 */
const crypto = require('crypto');

const SALT = 'KLMS_SECURE_SALT_2026';
const SUFFIX = 'LICENSE_KEY';

function generateKey(machineId) {
    if (!machineId) {
        console.error('Usage: node generate-key.js <MACHINE_ID>');
        process.exit(1);
    }

    const key = crypto.createHash('sha256')
        .update(machineId.toUpperCase() + SALT + SUFFIX)
        .digest('hex')
        .substring(0, 12)
        .toUpperCase();

    console.log('\n====================================');
    console.log(`MACHINE ID: ${machineId.toUpperCase()}`);
    console.log(`ACTIVATION KEY: ${key}`);
    console.log('====================================\n');
}

const mid = process.argv[2];
generateKey(mid);
