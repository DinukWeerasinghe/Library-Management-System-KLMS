const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// --- Logging Setup ---
const logPath = path.join(app.getPath('userData'), 'app.log');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

// Clear log on startup
try {
  fs.writeFileSync(logPath, '');
} catch (e) { }

logToFile('App starting...');
logToFile(`Environment: ${isDev ? 'Development' : 'Production'}`);
logToFile(`NODE_ENV: ${process.env.NODE_ENV}`);
logToFile(`app.isPackaged: ${app.isPackaged}`);
logToFile(`UserData Path: ${app.getPath('userData')}`);

let mainWindow;

function createWindow() {
  logToFile('Creating window...');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    logToFile(`Loading file: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch(e => {
      logToFile(`FAILED to load file: ${e.message}`);
    });
    // Auto-open devtools to debug white screen issue
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    logToFile('Window ready to show');
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logToFile(`Page failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('crashed', () => {
    logToFile('Renderer process crashed!');
  });
}

app.whenReady().then(async () => {
  logToFile('App ready event received');

  const { registerIpcHandlers } = require('./ipc-handlers');

  // COPY DB TO USERDATA IF NOT EXISTS (FIRST RUN)
  if (app.isPackaged) {
    const userDataPath = app.getPath('userData');
    const targetDbPath = path.join(userDataPath, 'klms.db');
    const targetDbDir = path.dirname(targetDbPath);

    if (!fs.existsSync(targetDbPath)) {
      logToFile('Database not found in User Data. Attempting to copy...');
      // Ensure target directory exists
      if (!fs.existsSync(targetDbDir)) {
        fs.mkdirSync(targetDbDir, { recursive: true });
      }

      // Source DB in the app bundle
      // Structure: app.asar/electron/main.js -> ../database/klms.db
      const sourceDbPath = path.join(__dirname, '../database/klms.db');
      logToFile(`Looking for source DB at: ${sourceDbPath}`);

      try {
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, targetDbPath);
          logToFile('Database copied successfully.');
        } else {
          logToFile('ERROR: Source database not found!');
        }
      } catch (err) {
        logToFile(`ERROR: Failed to copy database: ${err.message}`);
      }
    } else {
      logToFile('Database already exists in User Data.');
    }
  }

  const { ensureDatabaseExists } = require('./database/connection');
  try {
    logToFile('Initializing database connection...');
    await ensureDatabaseExists();
    logToFile('Database connection initialized.');
  } catch (err) {
    logToFile(`CRITICAL ERROR: Database initialization failed: ${err.message}`);
    // Show error dialog
    const { dialog } = require('electron');
    dialog.showErrorBox('Database Error', `Failed to initialize database: ${err.message}`);
  }

  try {
    const { runMigration } = require('./database/migrate-issue-columns');
    runMigration();
  } catch (e) {
    // Migration may fail if columns already exist or table missing
    logToFile(`Migration 1 warning: ${e.message}`);
  }
  try {
    const { runRbacMigration } = require('./database/migrate-rbac');
    runRbacMigration();
  } catch (e) {
    logToFile(`RBAC Migration error: ${e.message}`);
  }

  try {
    registerIpcHandlers();
    logToFile('IPC handlers registered.');
  } catch (err) {
    logToFile(`ERROR registering IPC handlers: ${err.message}`);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  logToFile('All windows closed');
  const { closeDatabase } = require('./database/connection');
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
  logToFile(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}`);
});
