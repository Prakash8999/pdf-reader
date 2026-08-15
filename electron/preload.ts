import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('dbApi', {
  upsertPdf: (filePath: string) => ipcRenderer.invoke('db:upsertPdf', filePath),
  updatePage: (filePath: string, pageNumber: number) => ipcRenderer.invoke('db:updatePage', filePath, pageNumber),
  updateLocation: (filePath: string, location: string) => ipcRenderer.invoke('db:updateLocation', filePath, location),
  getLibrary: () => ipcRenderer.invoke('db:getLibrary'),
  updateMetadata: (filePath: string, metadata: any) => ipcRenderer.invoke('db:updateMetadata', filePath, metadata),
  getCategories: () => ipcRenderer.invoke('db:getCategories'),
  searchLibrary: (query: string, tags: string[]) => ipcRenderer.invoke('db:searchLibrary', query, tags),
  deletePdf: (filePath: string) => ipcRenderer.invoke('db:deletePdf', filePath),
})
