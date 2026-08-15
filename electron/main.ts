import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initDatabase, upsertPdf, updateLastPageRead, updateLastLocation, getLibrary, updateMetadata, getAllCategories, searchLibrary, deletePdf } from './database'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  initDatabase();

  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'E-Books & PDFs', extensions: ['pdf', 'epub'] }]
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle('file:read', async (_event, filePath) => {
    try {
      const buffer = await fs.promises.readFile(filePath)
      // Return as base64 string for reliable IPC transfer
      return buffer.toString('base64')
    } catch (error) {
      console.error("Error reading file:", error)
      return null
    }
  })

  ipcMain.handle('db:upsertPdf', async (_event, filePath) => {
    try {
      return upsertPdf(filePath);
    } catch (error) {
      console.error("Error upserting PDF:", error);
      return null;
    }
  })

  ipcMain.handle('db:updatePage', async (_event, filePath, pageNumber) => {
    try {
      updateLastPageRead(filePath, pageNumber);
      return true;
    } catch (error) {
      console.error("Error updating last page:", error);
      return false;
    }
  })

  ipcMain.handle('db:updateLocation', async (_event, filePath, location) => {
    try {
      updateLastLocation(filePath, location);
      return true;
    } catch (error) {
      console.error("Error updating last location:", error);
      return false;
    }
  })

  ipcMain.handle('db:getLibrary', async () => {
    try {
      return getLibrary();
    } catch (error) {
      console.error("Error getting library:", error);
      return [];
    }
  })

  ipcMain.handle('db:updateMetadata', async (_event, filePath, metadata) => {
    try {
      updateMetadata(filePath, metadata);
      return true;
    } catch (error) {
      console.error("Error updating metadata:", error);
      return false;
    }
  })

  ipcMain.handle('db:getCategories', async () => {
    try {
      return getAllCategories();
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  })

  ipcMain.handle('db:deletePdf', async (_event, filePath) => {
    try {
      deletePdf(filePath);
      return true;
    } catch (error) {
      console.error("Error deleting PDF:", error);
      return false;
    }
  })

  ipcMain.handle('db:searchLibrary', async (_event, query: string, tags: string[]) => {
    try {
      return searchLibrary(query, tags);
    } catch (error) {
      console.error("Error searching library:", error);
      return [];
    }
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle('file:scanDirectory', async (_event, dirPath) => {
    const results: string[] = [];
    async function scan(directory: string) {
      try {
        const files = await fs.promises.readdir(directory, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(directory, file.name);
          if (file.isDirectory()) {
            await scan(fullPath);
          } else if (file.isFile()) {
            const ext = path.extname(fullPath).toLowerCase();
            if (ext === '.pdf' || ext === '.epub') {
              results.push(fullPath);
            }
          }
        }
      } catch (err) {
        console.error("Error scanning directory:", err);
      }
    }
    await scan(dirPath);
    return results;
  })

  createWindow()
})
