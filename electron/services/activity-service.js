/**
 * Activity & Session Logging Service
 * Tracks user sessions and system activities for audit and security.
 */
const { getDatabase } = require('../database/connection');
const logger = require('../logger');

// Activity Types
const ACTION_TYPES = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOCK_SESSION: 'LOCK_SESSION',
    UNLOCK_SESSION: 'UNLOCK_SESSION',
    ISSUE_BOOK: 'ISSUE_BOOK',
    RETURN_BOOK: 'RETURN_BOOK',
    ADD_BOOK: 'ADD_BOOK',
    DELETE_BOOK: 'DELETE_BOOK',
    REGISTER_MEMBER: 'REGISTER_MEMBER',
    DELETE_MEMBER: 'DELETE_MEMBER',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    EXPORT_REPORT: 'EXPORT_REPORT',
    RESET_PASSWORD: 'RESET_PASSWORD'
};

/**
 * Starts a new user session.
 * @param {number} userId 
 * @returns {number|null} session_id
 */
function logSessionStart(userId) {
    try {
        const db = getDatabase();
        const stmt = db.prepare(`
      INSERT INTO SessionLog (user_id, login_time, status)
      VALUES (?, datetime('now'), 'ACTIVE')
    `);
        const result = stmt.run(userId);
        return result.lastInsertRowid;
    } catch (err) {
        logger.error('Failed to log session start:', err);
        return null;
    }
}

/**
 * Ends a user session.
 * Finds the latest ACTIVE or LOCKED session for the user.
 * @param {number} userId 
 */
function logSessionEnd(userId) {
    try {
        const db = getDatabase();
        db.prepare(`
      UPDATE SessionLog 
      SET logout_time = datetime('now'), status = 'CLOSED' 
      WHERE user_id = ? AND status IN ('ACTIVE', 'LOCKED')
    `).run(userId);
    } catch (err) {
        logger.error('Failed to log session end:', err);
    }
}

/**
 * Locks the current session.
 * @param {number} userId 
 */
function logSessionLock(userId) {
    try {
        const db = getDatabase();
        db.prepare(`
      UPDATE SessionLog 
      SET status = 'LOCKED' 
      WHERE user_id = ? AND status = 'ACTIVE'
    `).run(userId);
    } catch (err) {
        logger.error('Failed to log session lock:', err);
    }
}

/**
 * Unlocks the current session.
 * @param {number} userId 
 */
function logSessionUnlock(userId) {
    try {
        const db = getDatabase();
        db.prepare(`
      UPDATE SessionLog 
      SET status = 'ACTIVE' 
      WHERE user_id = ? AND status = 'LOCKED'
    `).run(userId);
    } catch (err) {
        logger.error('Failed to log session unlock:', err);
    }
}

/**
 * Logs a specific system activity.
 * @param {number} userId 
 * @param {string} actionType 
 * @param {string} description 
 */
function logActivity(userId, actionType, description = '') {
    try {
        const db = getDatabase();
        db.prepare(`
      INSERT INTO ActivityLog (user_id, action_type, description, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `).run(userId, actionType, description);
    } catch (err) {
        logger.error('Failed to log activity:', err);
    }
}

module.exports = {
    logSessionStart,
    logSessionEnd,
    logSessionLock,
    logSessionUnlock,
    logActivity,
    ACTION_TYPES
};
