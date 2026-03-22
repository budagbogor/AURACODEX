const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),

  // Dialog
  showOpenDialog: (options) => ipcRenderer.invoke('dialog-open', options),

  // FS (Minimal for bridge)
  isElectron: true,
});
