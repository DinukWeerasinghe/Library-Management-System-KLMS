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
    search: (query) => ipcRenderer.invoke('members:search', query),
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
    search: (query) => ipcRenderer.invoke('books:search', query),
  },
  // Reports
  reports: {
    getReport: (type, memberId) => ipcRenderer.invoke('reports:getReport', type, memberId),
  },
  // Backup
  backup: {
    exportDb: (filePath) => ipcRenderer.invoke('backup:exportDb', filePath),
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
});
