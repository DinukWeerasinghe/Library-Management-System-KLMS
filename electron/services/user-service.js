const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database/connection');

function getAll() {
    const db = getDatabase();
    return db.prepare('SELECT id, username, role, created_at, updated_at FROM User ORDER BY created_at DESC').all();
}

function create(username, password, role) {
    const db = getDatabase();

    // Check if username exists
    const existing = db.prepare('SELECT id FROM User WHERE username = ?').get(username);
    if (existing) {
        throw new Error('Username already exists');
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO User (username, password_hash, role) VALUES (?, ?, ?)')
        .run(username, hash, role);

    return { id: result.lastInsertRowid, username, role };
}

function deleteUser(id, currentUserId) {
    const db = getDatabase();

    if (id === currentUserId) {
        throw new Error('Cannot delete yourself');
    }

    // Check if user exists
    const user = db.prepare('SELECT role FROM User WHERE id = ?').get(id);
    if (!user) {
        throw new Error('User not found');
    }

    // If deleting an admin, ensure at least one admin remains
    if (user.role === 'ADMIN') {
        const adminCount = db.prepare("SELECT COUNT(*) as count FROM User WHERE role = 'ADMIN'").get().count;
        if (adminCount <= 1) {
            throw new Error('Cannot delete the last admin');
        }
    }

    db.prepare('DELETE FROM User WHERE id = ?').run(id);
    return { success: true };
}

function resetPassword(id, newPassword) {
    const db = getDatabase();
    const hash = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare('UPDATE User SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(hash, id);

    if (result.changes === 0) {
        throw new Error('User not found');
    }
    return { success: true };
}

module.exports = {
    getAll,
    create,
    delete: deleteUser,
    resetPassword
};
