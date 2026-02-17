/**
 * IPC Handlers – bridge between renderer (React) and main process (services).
 */
const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { getDbPath } = require('./database/connection');
const authService = require('./services/auth-service');
const activityService = require('./services/activity-service');
const backupService = require('./services/backup-service');
const configService = require('./services/config-service');
const featureToggleRepo = require('./database/feature-toggle-repository');
const memberService = require('./services/member-service');
const importService = require('./services/import-service');
const bookService = require('./services/book-service');
const categoryService = require('./services/category-service');
const issueService = require('./services/issue-service');
const reportService = require('./services/report-service');
const userService = require('./services/user-service');
const themeService = require('./services/ThemeService');
const idCardService = require('./services/id-card-service');
const logger = require('./logger');

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
    logger.info(`Setting config: ${key} = ${value}`);
    try {
      const result = await configService.set(key, value);
      logger.info(`Successfully set config: ${key}`);
      return result;
    } catch (err) {
      logger.error(`Failed to set config: ${key}`, err);
      throw err;
    }
  });

  // --- Theme ---
  ipcMain.handle('theme:getTheme', async () => themeService.getTheme());

  // --- Logging (from renderer) ---
  ipcMain.handle('log:info', async (_, message) => {
    logger.info(`[Renderer] ${message}`);
  });
  ipcMain.handle('log:error', async (_, message) => {
    logger.error(`[Renderer] ${message}`);
  });

  // --- Feature toggles ---
  ipcMain.handle('features:getAll', async () => featureToggleRepo.getAll());
  ipcMain.handle('features:set', async (_, key, enabled) => {
    const session = authService.getSession();
    if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');
    return featureToggleRepo.set(key, enabled);
  });

  // --- Session Locking ---
  ipcMain.handle('app:logLock', () => {
    const userId = authService.getCurrentUserId();
    if (userId) activityService.logSessionLock(userId);
  });

  ipcMain.handle('app:logUnlock', () => {
    const userId = authService.getCurrentUserId();
    if (userId) activityService.logSessionUnlock(userId);
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
  ipcMain.handle('members:generateCode', async () => memberService.generateMemberCode());
  ipcMain.handle('members:isActive', async (_, id) => memberService.isMembershipActive(id));
  ipcMain.handle('members:getByCode', async (_, code) => memberService.getByCode(code));
  ipcMain.handle('members:getBarcodeImage', async (_, id) => {
    const member = await memberService.getById(id);
    if (member && member.barcode_path && fs.existsSync(member.barcode_path)) {
      const buffer = fs.readFileSync(member.barcode_path);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
    return null;
  });
  ipcMain.handle('members:generateIdCard', async (_, id) => {
    const filePath = await idCardService.generateMemberCard(id);
    if (filePath && fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return `data:application/pdf;base64,${buffer.toString('base64')}`;
    }
    return null;
  });

  // --- Categories ---
  ipcMain.handle('categories:getAll', async () => categoryService.getAll());

  // --- Issues (lend / return / renew) ---
  ipcMain.handle('issues:issueBook', async (_, memberId, bookId) =>
    issueService.issueBook(memberId, bookId)
  );
  ipcMain.handle('issues:returnBook', async (_, issueId) =>
    issueService.returnBook(issueId)
  );
  ipcMain.handle('issues:renewBook', async (_, id) => issueService.renewBook(id));
  ipcMain.handle('issues:returnBookByAnyCode', async (_, code) => issueService.returnBookByAnyCode(code));
  ipcMain.handle('issues:returnBookByMemberAndBook', async (_, memberCode, bookCode) =>
    issueService.returnBookByMemberAndBook(memberCode, bookCode)
  );
  ipcMain.handle('issues:getOverdue', async () => issueService.getOverdue());
  ipcMain.handle('issues:getById', async (_, id) => issueService.getIssueById(id));
  ipcMain.handle('issues:getAll', async (_, filters) =>
    issueService.getAll(filters || {})
  );

  // --- Activity Logs ---
  // API removed as per user request (file-based logging now active)

  // --- Backup & Restore ---
  ipcMain.handle('backup:create', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Database Backup',
      defaultPath: `klms_backup_${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (canceled || !filePath) return { success: false };

    const success = backupService.createManualBackup(filePath);
    return { success };
  });

  ipcMain.handle('backup:restore', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Backup File to Restore',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (canceled || !filePaths || filePaths.length === 0) return { success: false };

    // Confirm before restore
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Cancel', 'Restore & Restart'],
      defaultId: 0,
      title: 'Confirm Restore',
      message: 'Are you sure you want to restore this database?',
      detail: 'Current data will be replaced. The application will restart immediately.'
    });

    if (response === 1) { // Restore & Restart
      try {
        backupService.restoreBackup(filePaths[0]); // Will exit app
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false };
  });

  // --- Reports ---
  ipcMain.handle('reports:getReport', async (_, type, memberId, fromDate, toDate) => {
    const session = authService.getSession();
    if (!session || session.role === 'TEACHER') throw new Error('Unauthorized');
    return reportService.getReport(type, memberId, fromDate, toDate);
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
  ipcMain.handle('books:getByAnyCode', async (_, code) => bookService.getBookByAnyCode(code));
  ipcMain.handle('books:getBarcodeImage', async (_, bookId) => {
    const book = await bookService.getById(bookId);
    if (book && book.barcode_path && fs.existsSync(book.barcode_path)) {
      const buffer = fs.readFileSync(book.barcode_path);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
    return null;
  });

  // --- Book Import ---
  ipcMain.handle('books:downloadTemplate', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Import Template',
      defaultPath: 'klms_book_import_template.csv',
      filters: [{ name: 'CSV File', extensions: ['csv'] }]
    });

    if (canceled || !filePath) return { success: false };

    try {
      fs.writeFileSync(filePath, importService.getTemplateContent());
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('books:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select CSV File',
      properties: ['openFile'],
      filters: [{ name: 'CSV File', extensions: ['csv'] }]
    });

    if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };

    try {
      const result = await importService.importBooks(filePaths[0]);
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // --- Categories ---
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
