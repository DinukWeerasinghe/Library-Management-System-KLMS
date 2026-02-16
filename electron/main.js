const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// --- Logging Setup ---
const logger = require('./logger');
const configRepository = require('./database/config-repository');
logger.clear();
logger.info('App starting...');
logger.info(`Environment: ${isDev ? 'Development' : 'Production'}`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`app.isPackaged: ${app.isPackaged}`);
logger.info(`UserData Path: ${app.getPath('userData')}`);

let mainWindow;

function createWindow() {
  logger.info('Creating window...');
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
    logger.info(`Loading file: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch(e => {
      logger.info(`FAILED to load file: ${e.message}`);
    });
    // Auto-open devtools to debug white screen issue
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    logger.info('Window ready to show');
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.info(`Page failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('crashed', () => {
    logger.info('Renderer process crashed!');
  });

  mainWindow.on('close', async (e) => {
    const isPinEnabled = configRepository.get('exit_pin_enabled') === '1';
    if (isPinEnabled && !app.isQuitting) {
      e.preventDefault();
      mainWindow.webContents.send('app:requestExitPin');
    }
  });
}

app.whenReady().then(async () => {
  logger.info('App ready event received');

  const { registerIpcHandlers } = require('./ipc-handlers');

  // COPY DB TO USERDATA IF NOT EXISTS (FIRST RUN)
  if (app.isPackaged) {
    const userDataPath = app.getPath('userData');
    const targetDbPath = path.join(userDataPath, 'klms.db');
    const targetDbDir = path.dirname(targetDbPath);

    if (!fs.existsSync(targetDbPath)) {
      logger.info('Database not found in User Data. Attempting to copy...');
      // Ensure target directory exists
      if (!fs.existsSync(targetDbDir)) {
        fs.mkdirSync(targetDbDir, { recursive: true });
      }

      // Source DB in the app bundle
      // Structure: app.asar/electron/main.js -> ../database/klms.db
      const sourceDbPath = path.join(__dirname, '../database/klms.db');
      logger.info(`Looking for source DB at: ${sourceDbPath}`);

      try {
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, targetDbPath);
          logger.info('Database copied successfully.');
        } else {
          logger.info('ERROR: Source database not found!');
        }
      } catch (err) {
        logger.info(`ERROR: Failed to copy database: ${err.message}`);
      }
    } else {
      logger.info('Database already exists in User Data.');
    }
  }

  const { ensureDatabaseExists } = require('./database/connection');
  try {
    logger.info('Initializing database connection...');
    await ensureDatabaseExists();
    logger.info('Database connection initialized.');
  } catch (err) {
    logger.info(`CRITICAL ERROR: Database initialization failed: ${err.message}`);
    // Show error dialog
    const { dialog } = require('electron');
    dialog.showErrorBox('Database Error', `Failed to initialize database: ${err.message}`);
  }

  try {
    const { runMigration } = require('./database/migrate-issue-columns');
    runMigration();
  } catch (e) {
    // Migration may fail if columns already exist or table missing
    logger.info(`Migration 1 warning: ${e.message}`);
  }
  try {
    const { runRbacMigration } = require('./database/migrate-rbac');
    runRbacMigration();
  } catch (e) {
    logger.info(`RBAC Migration error: ${e.message}`);
  }
  try {
    const { runBrandingMigration } = require('./database/migrate-branding');
    runBrandingMigration();
  } catch (e) {
    logger.error(`Branding Migration error: ${e.message}`);
  }

  try {
    const { runMemberCodeMigration } = require('./database/migrate-member-code');
    const { runMemberBarcodeMigration } = require('./database/migrate-member-barcode');
    const { runBookHybridIdMigration } = require('./database/migrate-book-barcode');
    const { runMemberValidityMigration } = require('./database/migrate-member-validity');
    const { runBookBarcodeFillMigration } = require('./database/migrate-book-barcode-fill');
    const { runExitPinMigration } = require('./database/migrate-exit-pin');

    runMemberCodeMigration();
    runMemberBarcodeMigration();
    runBookHybridIdMigration();
    runMemberValidityMigration();
    await runBookBarcodeFillMigration();
    runExitPinMigration();

    registerIpcHandlers();
    logger.info('IPC handlers registered.');
  } catch (err) {
    logger.info(`ERROR registering IPC handlers: ${err.message}`);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  ipcMain.handle('app:forceQuit', () => {
    app.isQuitting = true;
    app.quit();
  });
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');
  const { closeDatabase } = require('./database/connection');
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
  logger.error(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}`);
});
