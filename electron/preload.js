const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('klms', {
  // Auth
  auth: {
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    changePassword: (oldPassword, newPassword) =>
      ipcRenderer.invoke('auth:changePassword', oldPassword, newPassword),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
  },
  // Config & Feature Toggles
  config: {
    getAll: () => ipcRenderer.invoke('config:getAll'),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value),
  },
  features: {
    getAll: () => ipcRenderer.invoke('features:getAll'),
    set: (key, enabled) => ipcRenderer.invoke('features:set', key, enabled),
  },
  // Members
  members: {
    getAll: (filters) => ipcRenderer.invoke('members:getAll', filters),
    getById: (id) => ipcRenderer.invoke('members:getById', id),
    create: (data) => ipcRenderer.invoke('members:create', data),
    update: (id, data) => ipcRenderer.invoke('members:update', id, data),
    delete: (id) => ipcRenderer.invoke('members:delete', id),
    search: (query, filters) => ipcRenderer.invoke('members:search', query, filters),
    generateCode: () => ipcRenderer.invoke('members:generateCode'),
    getByCode: (code) => ipcRenderer.invoke('members:getByCode', code),
    getBarcodeImage: (id) => ipcRenderer.invoke('members:getBarcodeImage', id),
    generateIdCard: (id) => ipcRenderer.invoke('members:generateIdCard', id),
    downloadTemplate: () => ipcRenderer.invoke('members:downloadTemplate'),
    previewImport: () => ipcRenderer.invoke('members:previewImport'),
    executeImport: (rows) => ipcRenderer.invoke('members:executeImport', rows),
  },
  // Categories (when enable_categories is on)
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
  },
  // Issues (lend / return / renew)
  issues: {
    issueBook: (memberId, bookId) => ipcRenderer.invoke('issues:issueBook', memberId, bookId),
    returnBook: (issueId) => ipcRenderer.invoke('issues:returnBook', issueId),
    renewBook: (issueId) => ipcRenderer.invoke('issues:renewBook', issueId),
    returnBookByAnyCode: (code) => ipcRenderer.invoke('issues:returnBookByAnyCode', code),
    returnBookByMemberAndBook: (memberCode, bookCode) =>
      ipcRenderer.invoke('issues:returnBookByMemberAndBook', memberCode, bookCode),
    getOverdue: () => ipcRenderer.invoke('issues:getOverdue'),
    getById: (id) => ipcRenderer.invoke('issues:getById', id),
    getAll: (filters) => ipcRenderer.invoke('issues:getAll', filters),
  },
  // Books
  books: {
    getAll: (filters) => ipcRenderer.invoke('books:getAll', filters),
    getById: (id) => ipcRenderer.invoke('books:getById', id),
    create: (data) => ipcRenderer.invoke('books:create', data),
    update: (id, data) => ipcRenderer.invoke('books:update', id, data),
    delete: (id) => ipcRenderer.invoke('books:delete', id),
    search: (query, filters) => ipcRenderer.invoke('books:search', query, filters),
    getByAnyCode: (code) => ipcRenderer.invoke('books:getByAnyCode', code),
    getBarcodeImage: (id) => ipcRenderer.invoke('books:getBarcodeImage', id),
    downloadTemplate: () => ipcRenderer.invoke('books:downloadTemplate'),
    previewImport: () => ipcRenderer.invoke('books:previewImport'),
    executeImport: (rows) => ipcRenderer.invoke('books:executeImport', rows),
  },
  // Reports
  reports: {
    getReport: (type, memberId, fromDate, toDate) =>
      ipcRenderer.invoke('reports:getReport', type, memberId, fromDate, toDate),
  },
  // Backup
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
  },
  // Users
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    create: (data) => ipcRenderer.invoke('users:create', data),
    delete: (id) => ipcRenderer.invoke('users:delete', id),
    resetPassword: (id, newPassword) => ipcRenderer.invoke('users:resetPassword', id, newPassword),
  },
  // Branding & Theme
  branding: {
    getTheme: () => ipcRenderer.invoke('theme:getTheme'),
  },
  // Logging
  log: {
    info: (msg) => ipcRenderer.invoke('log:info', msg),
    error: (msg) => ipcRenderer.invoke('log:error', msg),
  },
  quit: () => ipcRenderer.invoke('app:forceQuit'),
  onExitPinRequest: (callback) => ipcRenderer.on('app:requestExitPin', callback),
  lock: () => ipcRenderer.invoke('app:lock'),
  onShowLockScreen: (callback) => ipcRenderer.on('app:showLockScreen', callback),
  activity: {
    logLock: () => ipcRenderer.invoke('app:logLock'),
    logUnlock: () => ipcRenderer.invoke('app:logUnlock')
  },
  import: {
    getHistory: () => ipcRenderer.invoke('import:getHistory'),
    rollback: (batchId) => ipcRenderer.invoke('import:rollback', batchId),
    onProgress: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('import:progress', handler);
      return () => ipcRenderer.removeListener('import:progress', handler);
    }
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getBuildInfo: () => ipcRenderer.invoke('app:getBuildInfo'),
    checkForUpdate: () => ipcRenderer.invoke('app:checkForUpdate')
  },
  license: {
    getStatus: () => ipcRenderer.invoke('license:getStatus'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
  }
});
