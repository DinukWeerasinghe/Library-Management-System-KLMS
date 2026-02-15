const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure app is ready to get paths if called early
const getLogPath = () => {
    try {
        return path.join(app.getPath('userData'), 'app.log');
    } catch (e) {
        // Fallback for very early calls
        return 'app.log';
    }
};

function log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (args.length > 0) {
        args.forEach(arg => {
            if (typeof arg === 'object') {
                formattedMessage += ` ${JSON.stringify(arg)}`;
            } else {
                formattedMessage += ` ${arg}`;
            }
        });
    }

    formattedMessage += '\n';

    try {
        fs.appendFileSync(getLogPath(), formattedMessage);

        // Also log to console in dev
        if (process.env.NODE_ENV === 'development') {
            console.log(formattedMessage.trim());
        }
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

module.exports = {
    info: (msg, ...args) => log('info', msg, ...args),
    error: (msg, ...args) => log('error', msg, ...args),
    warn: (msg, ...args) => log('warn', msg, ...args),
    clear: () => {
        try {
            fs.writeFileSync(getLogPath(), '');
        } catch (e) { }
    }
};
