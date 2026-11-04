const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  openImage: () => ipcRenderer.invoke('open-image'),
  savePieces: (baseName, stamp, startIndex, pieces) => ipcRenderer.invoke('save-pieces', { baseName, stamp, startIndex, pieces }),
  startDrag: (file) => ipcRenderer.send('drag-start', file),
  openFolder: (dir) => ipcRenderer.invoke('open-folder', dir),
  showItem: (file) => ipcRenderer.invoke('show-item', file),
  copyImage: (file) => ipcRenderer.invoke('copy-image', file),
  openPiece: (file) => ipcRenderer.invoke('open-piece', file),
  winState: () => ipcRenderer.invoke('win-state'),
  appInfo: () => ipcRenderer.invoke('app-info'),
  winAction: (type, value) => ipcRenderer.invoke('win-action', { type, value })
});