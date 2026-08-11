import React from 'react';
import { Book, Library as LibraryIcon, PlusCircle } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  onAddBook: () => void;
  onGoToLibrary: () => void;
  onGoToReader: () => void;
  currentFile: string | null;
  currentView: 'library' | 'reader';
}

const Sidebar: React.FC<SidebarProps> = ({ onAddBook, onGoToLibrary, onGoToReader, currentFile, currentView }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Book size={28} color="var(--accent-primary)" />
        <span className="sidebar-title">ReadZen</span>
      </div>
      
      <nav className="sidebar-nav">
        <div 
          className={`nav-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={onGoToLibrary}
        >
          <LibraryIcon size={20} />
          <span>My Library</span>
        </div>
        
        {currentFile && (
          <div 
            className={`nav-item ${currentView === 'reader' ? 'active' : ''}`}
            onClick={onGoToReader}
          >
            <Book size={20} />
            <span>Now Reading</span>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button onClick={onAddBook} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          <PlusCircle size={18} />
          <span>Add Book</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
