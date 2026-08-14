/// <reference types="vite/client" />

interface Window {
  ipcRenderer: import('electron').IpcRenderer;
  dbApi: {
    upsertPdf: (filePath: string) => Promise<any>;
    updatePage: (filePath: string, pageNumber: number) => Promise<boolean>;
    updateLocation: (filePath: string, location: string) => Promise<boolean>;
    getLibrary: () => Promise<any[]>;
  };
}
