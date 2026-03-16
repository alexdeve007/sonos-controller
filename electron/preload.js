const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getServerUrl: () => 'http://127.0.0.1:3000',
  onPlaybackChange: (callback) => ipcRenderer.on('playback-change', (_, data) => callback(data)),
});
