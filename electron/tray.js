const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const Store = require('electron-store');

let tray = null;

function createTray(mainWindow) {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22 });
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('Sonos Controller');

  const store = new Store();

  function buildMenu() {
    const launchAtLogin = store.get('launchAtLogin', false);
    const menu = Menu.buildFromTemplate([
      {
        label: 'Show Window',
        click: () => mainWindow.show(),
      },
      {
        label: 'Discover Speakers',
        click: () => {
          const http = require('http');
          const req = http.request({ hostname: '127.0.0.1', port: 3000, path: '/api/discover', method: 'POST' });
          req.end();
        },
      },
      { type: 'separator' },
      {
        label: 'Launch at Login',
        type: 'checkbox',
        checked: launchAtLogin,
        click: (menuItem) => {
          store.set('launchAtLogin', menuItem.checked);
          app.setLoginItemSettings({ openAtLogin: menuItem.checked });
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
  }

  buildMenu();

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  return tray;
}

function setPlayingIcon(isPlaying) {
  if (!tray) return;
  const iconName = isPlaying ? 'tray-icon-playing.png' : 'tray-icon.png';
  const iconPath = path.join(__dirname, '..', 'assets', iconName);
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22 });
  icon.setTemplateImage(true);
  tray.setImage(icon);
}

module.exports = { createTray, setPlayingIcon };
