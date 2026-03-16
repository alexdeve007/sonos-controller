const { app, BrowserWindow, Tray, nativeImage } = require('electron');
const path = require('path');
const { createTray } = require('./tray');
const { startServer, stopServer } = require('./server/index');

let mainWindow = null;
let tray = null;

const isDev = !app.isPackaged;

function createWindow() {
  const Store = require('electron-store');
  const store = new Store();
  const bounds = store.get('windowBounds', { width: 1000, height: 700 });

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    show: false,
    frame: true,
    resizable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  function saveBounds() {
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  }
}

app.on('ready', async () => {
  if (app.dock) {
    app.dock.hide();
  }

  await startServer();
  createWindow();
  tray = createTray(mainWindow);
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopServer();
});

app.on('window-all-closed', () => {
  // Don't quit on macOS — app stays in tray
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});
