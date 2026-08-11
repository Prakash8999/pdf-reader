import  { useState } from 'react';
import Sidebar from './components/Sidebar';
import PDFViewer from './components/PDFViewer';
import Library from './components/Library';
import './App.css';

interface Book {
  filePath: string;
  title: string;
}

function App() {
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [view, setView] = useState<'library' | 'reader'>('library');

  const handleAddBook = async () => {
    const filePath = await window.ipcRenderer.invoke('dialog:openFile');
    if (filePath) {
      if (!books.find(b => b.filePath === filePath)) {
        setBooks([...books, { 
          filePath, 
          title: filePath.split('\\').pop()?.split('/').pop() || 'Unknown Book'
        }]);
      }
      setCurrentFile(filePath);
      setView('reader');
    }
  };

  const handleOpenBook = (filePath: string) => {
    setCurrentFile(filePath);
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
          <PDFViewer filePath={currentFile} />
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
