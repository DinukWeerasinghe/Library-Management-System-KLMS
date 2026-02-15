const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Get log directory path
const getLogDir = () => {
    try {
        return path.join(app.getPath('userData'), 'logs');
    } catch (e) {
        // Fallback for very early calls
        return path.join(process.cwd(), 'logs');
    }
};

// Get today's log file path
const getLogPath = () => {
    const logDir = getLogDir();
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Format: app-2025-02-16.log
    const today = new Date().toISOString().split('T')[0];
    return path.join(logDir, `app-${today}.log`);
};

// Clean up old log files (keep last N days)
const cleanOldLogs = (keepDays = 7) => {
    try {
        const logDir = getLogDir();
        if (!fs.existsSync(logDir)) return;
        
        const files = fs.readdirSync(logDir);
        const now = Date.now();
        const maxAge = keepDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
        
        files.forEach(file => {
            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old log file: ${file}`);
            }
        });
    } catch (err) {
        console.error('Failed to clean old logs:', err);
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

// Run cleanup on initialization
cleanOldLogs(7); // Keep logs for 7 days

module.exports = {
    info: (msg, ...args) => log('info', msg, ...args),
    error: (msg, ...args) => log('error', msg, ...args),
    warn: (msg, ...args) => log('warn', msg, ...args),
    debug: (msg, ...args) => log('debug', msg, ...args),
    
    // Clear today's log
    clear: () => {
        try {
            fs.writeFileSync(getLogPath(), '');
        } catch (e) {
            console.error('Failed to clear log:', e);
        }
    },
    
    // Get current log file path
    getLogPath,
    
    // Get logs directory
    getLogDir,
    
    // Manually trigger cleanup
    cleanOldLogs
};