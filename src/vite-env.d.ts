/// <reference types="vite/client" />

interface Window {
  ipcRenderer: import('electron').IpcRenderer;
  dbApi: {
    upsertPdf: (filePath: string) => Promise<any>;
    updatePage: (filePath: string, pageNumber: number) => Promise<boolean>;
    updateLocation: (filePath: string, location: string) => Promise<boolean>;
    getLibrary: () => Promise<any[]>;
    updateMetadata: (filePath: string, metadata: { title?: string, author?: string, coverImage?: string, tags?: string }) => Promise<boolean>;
    getCategories: () => Promise<string[]>;
    searchLibrary: (query: string, tags: string[]) => Promise<any[]>;
    deletePdf: (filePath: string) => Promise<boolean>;
    updateReadingStats: (filePath: string, timeIncrement: number, wordsIncrement: number) => Promise<boolean>;
    
    // Annotation API
    getAnnotations: (filePath: string) => Promise<any[]>;
    addAnnotation: (annotation: any) => Promise<any>;
    updateAnnotationNote: (id: number, noteContent: string | null) => Promise<boolean>;
    updateAnnotationColor: (id: number, color: string) => Promise<boolean>;
    deleteAnnotation: (id: number) => Promise<boolean>;
  };
}
