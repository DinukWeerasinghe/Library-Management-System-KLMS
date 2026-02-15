/**
 * IPC Handlers – bridge between renderer (React) and main process (services).
 */
const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { getDbPath } = require('./database/connection');
const authService = require('./services/auth-service');
const configService = require('./services/config-service');
const featureToggleRepo = require('./database/feature-toggle-repository');
const memberService = require('./services/member-service');
const bookService = require('./services/book-service');
const categoryService = require('./services/category-service');
const issueService = require('./services/issue-service');
const reportService = require('./services/report-service');
const userService = require('./services/user-service');

function registerIpcHandlers() {
  // ensureDatabaseExists() is awaited in main.js before this runs

  // --- Auth ---
  ipcMain.handle('auth:login', async (_, username, password) => {
    return authService.login(username, password);
  });
  ipcMain.handle('auth:logout', async () => authService.logout());
  ipcMain.handle('auth:changePassword', async (_, oldPassword, newPassword) => {
    return authService.changePassword(oldPassword, newPassword);
  });
  ipcMain.handle('auth:getSession', async () => authService.getSession());

  // --- Users (Admin only) ---
  ipcMain.handle('users:getAll', async () => {
    const session = authService.getSession();
    if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');
    return userService.getAll();
  });
  ipcMain.handle('users:create', async (_, { username, password, role }) => {
    const session = authService.getSession();
    if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');
    return userService.create(username, password, role);
  });
  ipcMain.handle('users:delete', async (_, id) => {
    const session = authService.getSession();
    if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');
    return userService.delete(id, session.id);
  });
  ipcMain.handle('users:resetPassword', async (_, id, newPassword) => {
    const session = authService.getSession();
    if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');
    return userService.resetPassword(id, newPassword);
  });

  // --- Config ---
  ipcMain.handle('config:getAll', async () => configService.getAll());
  ipcMain.handle('config:set', async (_, key, value) => {
    const session = authService.getSession();
    if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');
    return configService.set(key, value);
  });

  // --- Feature toggles ---
  ipcMain.handle('features:getAll', async () => featureToggleRepo.getAll());
  ipcMain.handle('features:set', async (_, key, enabled) => {
    const session = authService.getSession();
    if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');
    return featureToggleRepo.set(key, enabled);
  });

  // --- Members ---
  ipcMain.handle('members:getAll', async (_, filters) => memberService.getAll(filters || {}));
  ipcMain.handle('members:getById', async (_, id) => memberService.getById(id));
  ipcMain.handle('members:create', async (_, data) => {
    const session = authService.getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'LIBRARIAN')) throw new Error('Unauthorized');
    return memberService.create(data);
  });
  ipcMain.handle('members:update', async (_, id, data) => {
    const session = authService.getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'LIBRARIAN')) throw new Error('Unauthorized');
    return memberService.update(id, data);
  });
  ipcMain.handle('members:delete', async (_, id) => {
    const session = authService.getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'LIBRARIAN')) throw new Error('Unauthorized');
    return memberService.delete(id);
  });
  ipcMain.handle('members:search', async (_, query) => memberService.search(query));

  // --- Categories ---
  ipcMain.handle('categories:getAll', async () => categoryService.getAll());

  // --- Issues (lend / return / renew) ---
  ipcMain.handle('issues:issueBook', async (_, memberId, bookId) =>
    issueService.issueBook(memberId, bookId)
  );
  ipcMain.handle('issues:returnBook', async (_, issueId) =>
    issueService.returnBook(issueId)
  );
  ipcMain.handle('issues:renewBook', async (_, issueId) =>
    issueService.renewBook(issueId)
  );
  ipcMain.handle('issues:getById', async (_, id) => issueService.getIssueById(id));
  ipcMain.handle('issues:getAll', async (_, filters) =>
    issueService.getAll(filters || {})
  );

  // --- Reports ---
  ipcMain.handle('reports:getReport', async (_, type, memberId) => {
    const session = authService.getSession();
    if (!session || session.role === 'TEACHER') throw new Error('Unauthorized');
    return reportService.getReport(type, memberId);
  });

  // --- Books ---
  ipcMain.handle('books:getAll', async (_, filters) => bookService.getAll(filters || {}));
  ipcMain.handle('books:getById', async (_, id) => bookService.getById(id));
  ipcMain.handle('books:create', async (_, data) => {
    // Teacher can manage books? Requirement says "Manage Books". Assuming create/update/delete.
    // Requirement: TEACHER: Manage Books.
    return bookService.create(data);
  });
  ipcMain.handle('books:update', async (_, id, data) => bookService.update(id, data));
  ipcMain.handle('books:delete', async (_, id) => bookService.delete(id));
  ipcMain.handle('books:search', async (_, query) => bookService.search(query));

  // --- Backup: export DB file ---
  ipcMain.handle('backup:exportDb', async () => {
    const dbPath = getDbPath();
    const defaultName = `klms-backup-${new Date().toISOString().slice(0, 10)}.db`;
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export database backup',
      defaultPath: path.join(require('electron').app.getPath('documents'), defaultName),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    try {
      fs.copyFileSync(dbPath, filePath);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerIpcHandlers };
