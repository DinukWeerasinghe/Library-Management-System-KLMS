const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database/connection');
const activityService = require('./activity-service');

let currentUserId = null;

function login(username, password) {
  const db = getDatabase();
  const user = db.prepare('SELECT id, username, password_hash, role FROM User WHERE username = ?').get(username);
  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return { success: false, error: 'Invalid username or password' };
  }
  currentUserId = user.id;
  activityService.logSessionStart(user.id);
  activityService.logActivity(user.id, activityService.ACTION_TYPES.LOGIN, 'User logged in');
  return {
    success: true,
    user: { id: user.id, username: user.username, role: user.role },
  };
}

function logout() {
  if (currentUserId) {
    activityService.logSessionEnd(currentUserId);
    activityService.logActivity(currentUserId, activityService.ACTION_TYPES.LOGOUT, 'User logged out');
  }
  currentUserId = null;
  return { success: true };
}

function getSession() {
  if (!currentUserId) return null;
  const db = getDatabase();
  const user = db.prepare('SELECT id, username, role FROM User WHERE id = ?').get(currentUserId);
  return user ? { id: user.id, username: user.username, role: user.role } : null;
}

function changePassword(oldPassword, newPassword) {
  if (!currentUserId) {
    return { success: false, error: 'Not authenticated' };
  }
  const db = getDatabase();
  const user = db.prepare('SELECT password_hash FROM User WHERE id = ?').get(currentUserId);
  if (!user || !bcrypt.compareSync(oldPassword, user.password_hash)) {
    return { success: false, error: 'Current password is incorrect' };
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE User SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, currentUserId);
  return { success: true };
}

module.exports = {
  login,
  logout,
  getSession,
  changePassword,
  getCurrentUserId: () => currentUserId,
};
