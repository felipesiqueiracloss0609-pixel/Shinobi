const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shinobiBase", {
  getStatus: () => ipcRenderer.invoke("base:status"),
  importBase: () => ipcRenderer.invoke("base:import"),
  assetUrl: (relativePath) => ipcRenderer.invoke("base:asset-url", relativePath),
  onProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("base:progress", listener);
    return () => ipcRenderer.removeListener("base:progress", listener);
  }
});
