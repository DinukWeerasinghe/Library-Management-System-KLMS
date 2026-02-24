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
let splashWindow;

function createSplashWindow() {
  logger.info('Creating splash window...');
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });

  splashWindow.loadFile(path.join(__dirname, 'splash', 'splash.html'));

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
}

function createWindow() {
  logger.info('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, 'build/icon.ico'),
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
  }

  mainWindow.once('ready-to-show', () => {
    logger.info('Window ready to show');
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
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

  // 1. Show Splash Immediately
  createSplashWindow();

  // 2. Start Boot Process
  const bootService = require('./services/boot-service');
  const { registerIpcHandlers } = require('./ipc-handlers');

  try {
    await bootService.runBootSequence((message, progress) => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('boot-status', { message, progress });
      }
    });

    // 3. Register handlers after DB/Config loaded
    registerIpcHandlers();
    logger.info('IPC handlers registered.');

    // 4. Show Main Window
    createWindow();

  } catch (err) {
    logger.error(`BOOT FAILED: ${err.message}`);

    // If it's a license error, we still want to show the main window 
    // The React app handles the "invalid license" state by showing the ActivationDialog
    if (err.message.includes('license') || err.message.includes('Machine ID')) {
      logger.warn('Boot continued despite license error for recovery.');
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      createWindow();
    } else {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      dialog.showErrorBox('Critical Boot Failure', `The application failed to start: ${err.message}`);
      app.quit();
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && mainWindow === undefined) {
      // This shouldn't really happen with splash logic but good for safety
    }
  });

  ipcMain.handle('app:forceQuit', () => {
    app.isQuitting = true;
    app.quit();
  });

  ipcMain.handle('app:lock', () => {
    if (mainWindow) {
      mainWindow.webContents.send('app:showLockScreen');
    }
  });

});


app.on('window-all-closed', () => {
  logger.info('All windows closed');

  // Auto Backup on Exit
  try {
    const { performAutoBackup } = require('./services/backup-service');
    performAutoBackup();
  } catch (e) {
    logger.error(`Auto backup failed on exit: ${e.message}`);
  }

  const { closeDatabase } = require('./database/connection');
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
  logger.error(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}`);
});
