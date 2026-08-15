import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PDFViewer from './components/PDFViewer';
import EpubViewer from './components/EpubViewer';
import Library from './components/Library';
import MetadataExtractor from './components/MetadataExtractor';
import SettingsModal from './components/SettingsModal';
import PomodoroTimer from './components/PomodoroTimer';
import { Minimize2 } from 'lucide-react';
import './App.css';

interface Book {
  filePath: string;
  title: string;
  last_page_read?: number;
  last_location?: string;
  author: string | null;
  cover_image: string | null;
  tags: string | null;
  time_spent_seconds?: number;
  words_read?: number;
}

function App() {
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [view, setView] = useState<'library' | 'reader'>('library');
  const [initialLocation, setInitialLocation] = useState<string | number>(1);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('readzen_theme') || 'dark');
  const [isFocusMode, setFocusMode] = useState(false);
  const [isBlueLightFilterEnabled, setBlueLightFilterEnabled] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('readzen_theme', theme);
  }, [theme]);

  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity, true);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity, true);
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === 'reader' && currentFile) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now - lastActivity < 2 * 60 * 1000) {
          window.dbApi.updateReadingStats(currentFile, 10, 40).catch(console.error);
        }
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [view, currentFile, lastActivity]);

  const fetchLibrary = async () => {
    const library = await window.dbApi.getLibrary();
    const mappedBooks = library.map((b: any) => ({
      filePath: b.file_path,
      title: b.title || b.file_path.split('\\').pop()?.split('/').pop() || 'Unknown Book',
      last_page_read: b.last_page_read,
      last_location: b.last_location,
      author: b.author || null,
      cover_image: b.cover_image || null,
      tags: b.tags || null,
      time_spent_seconds: b.time_spent_seconds,
      words_read: b.words_read
    }));
    setBooks(mappedBooks);

    if (mappedBooks.length > 0 && !currentFile) {
      setCurrentFile(mappedBooks[0].filePath);
      setInitialLocation(mappedBooks[0].last_location || mappedBooks[0].last_page_read || 1);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleAddBook = async () => {
    const filePath = await window.ipcRenderer.invoke('dialog:openFile');
    if (filePath) {
      await handleOpenBook(filePath);
    }
  };

  const handleImportFolder = async () => {
    const dirPath = await window.ipcRenderer.invoke('dialog:openDirectory');
    if (!dirPath) return;

    const files = await window.ipcRenderer.invoke('file:scanDirectory', dirPath);
    if (!files || files.length === 0) {
      alert(`No PDF or EPUB files found in that folder.`);
      return;
    }

    const confirm = window.confirm(`Found ${files.length} supported books in the selected folder. Would you like to import them?`);
    if (confirm) {
      for (const file of files) {
         await window.dbApi.upsertPdf(file);
      }
      fetchLibrary();
    }
  };

  const handleOpenBook = async (filePath: string) => {
    const pdfState = await window.dbApi.upsertPdf(filePath);

    const library = await window.dbApi.getLibrary();
    setBooks(library.map((b: any) => ({
      filePath: b.file_path,
      title: b.title || b.file_path.split('\\').pop()?.split('/').pop() || 'Unknown Book',
      last_page_read: b.last_page_read,
      last_location: b.last_location,
      author: b.author || null,
      cover_image: b.cover_image || null,
      tags: b.tags || null,
      time_spent_seconds: b.time_spent_seconds,
      words_read: b.words_read
    })));

    setCurrentFile(filePath);
    setInitialLocation(pdfState?.last_location || pdfState?.last_page_read || 1);
    setView('reader');
  };

  const handleUpdateMetadata = async (filePath: string, metadata: any) => {
    const success = await window.dbApi.updateMetadata(filePath, metadata);
    if (success) {
      fetchLibrary();
    }
  };

  const handleDeleteBook = async (filePath: string) => {
    const success = await window.dbApi.deletePdf(filePath);
    if (success) {
      if (currentFile === filePath) {
        setCurrentFile(null);
        setView('library');
      }
      fetchLibrary();
    }
  };

  const goToLibrary = () => {
    setView('library');
  };

  const goToReader = () => {
    if (currentFile) setView('reader');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className={`app-container ${isFocusMode ? 'focus-mode-active' : ''}`}>
      <Sidebar
        onAddBook={handleAddBook}
        currentFile={currentFile}
        onGoToLibrary={goToLibrary}
        onGoToReader={goToReader}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPomodoro={() => setIsPomodoroOpen(true)}
        currentView={view}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <main className="main-content">
        {view === 'library' ? (
          <Library 
            books={books} 
            onOpenBook={handleOpenBook} 
            onAddBook={handleAddBook} 
            onImportFolder={handleImportFolder}
            onUpdateMetadata={handleUpdateMetadata}
            onDeleteBook={handleDeleteBook}
          />
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
      
      {/* Hidden component to extract covers and metadata in the background */}
      <MetadataExtractor books={books} onMetadataExtracted={fetchLibrary} />

      {isFocusMode && (
        <button 
          className="exit-focus-btn" 
          onClick={() => setFocusMode(false)}
          title="Exit Focus Mode"
        >
          <Minimize2 size={24} />
        </button>
      )}

      <div className={`blue-light-overlay ${isBlueLightFilterEnabled ? 'active' : ''}`}></div>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        isFocusMode={isFocusMode}
        setFocusMode={setFocusMode}
        isBlueLightFilterEnabled={isBlueLightFilterEnabled}
        setBlueLightFilterEnabled={setBlueLightFilterEnabled}
      />

      <PomodoroTimer 
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
      />
    </div>
  );
}

export default App;
