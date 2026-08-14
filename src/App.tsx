import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PDFViewer from './components/PDFViewer';
import EpubViewer from './components/EpubViewer';
import Library from './components/Library';
import './App.css';

interface Book {
  filePath: string;
  title: string;
  last_page_read?: number;
  last_location?: string;
}

function App() {
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [view, setView] = useState<'library' | 'reader'>('library');
  const [initialLocation, setInitialLocation] = useState<string | number>(1);

  useEffect(() => {
    const fetchLibrary = async () => {
      const library = await window.dbApi.getLibrary();
      const mappedBooks = library.map((b: any) => ({
        filePath: b.file_path,
        title: b.title || b.file_path.split('\\').pop()?.split('/').pop() || 'Unknown Book',
        last_page_read: b.last_page_read,
        last_location: b.last_location
      }));
      setBooks(mappedBooks);

      if (mappedBooks.length > 0) {
        setCurrentFile(mappedBooks[0].filePath);
        setInitialLocation(mappedBooks[0].last_location || mappedBooks[0].last_page_read || 1);
      }
    };
    fetchLibrary();
  }, []);

  const handleAddBook = async () => {
    const filePath = await window.ipcRenderer.invoke('dialog:openFile');
    if (filePath) {
      await handleOpenBook(filePath);
    }
  };

  const handleOpenBook = async (filePath: string) => {
    const pdfState = await window.dbApi.upsertPdf(filePath);

    const library = await window.dbApi.getLibrary();
    setBooks(library.map((b: any) => ({
      filePath: b.file_path,
      title: b.title || b.file_path.split('\\').pop()?.split('/').pop() || 'Unknown Book',
      last_page_read: b.last_page_read,
      last_location: b.last_location
    })));

    setCurrentFile(filePath);
    setInitialLocation(pdfState?.last_location || pdfState?.last_page_read || 1);
    setView('reader');
  };

  const goToLibrary = () => {
    setView('library');
  };

  const goToReader = () => {
    if (currentFile) setView('reader');
  };

  return (
    <div className="app-container">
      <Sidebar
        onAddBook={handleAddBook}
        currentFile={currentFile}
        onGoToLibrary={goToLibrary}
        onGoToReader={goToReader}
        currentView={view}
      />
      <main className="main-content">
        {view === 'library' ? (
          <Library books={books} onOpenBook={handleOpenBook} onAddBook={handleAddBook} />
        ) : currentFile ? (
          currentFile.toLowerCase().endsWith('.epub')
            ? <EpubViewer key={currentFile} filePath={currentFile} initialLocation={typeof initialLocation === 'string' ? initialLocation : undefined} />
            : <PDFViewer key={currentFile} filePath={currentFile} initialPage={typeof initialLocation === 'number' ? initialLocation : 1} />
        ) : (
          <div className="empty-state">
            <h2>Select a book from your library</h2>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
