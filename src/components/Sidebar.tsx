import React from 'react';
import { Book, Library as LibraryIcon, PlusCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  onAddBook: () => void;
  onGoToLibrary: () => void;
  onGoToReader: () => void;
  currentFile: string | null;
  currentView: 'library' | 'reader';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddBook, onGoToLibrary, onGoToReader, currentFile, currentView, isCollapsed, onToggleCollapse }) => {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo-container">
          <Book size={28} color="var(--accent-primary)" />
          {!isCollapsed && <span className="sidebar-title">ReadZen</span>}
        </div>
        <button className="collapse-toggle-btn icon-btn" onClick={onToggleCollapse} title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      
      <nav className="sidebar-nav">
        <div 
          className={`nav-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={onGoToLibrary}
          title={isCollapsed ? "My Library" : ""}
        >
          <LibraryIcon size={20} />
          {!isCollapsed && <span>My Library</span>}
        </div>
        
        {currentFile && (
          <div 
            className={`nav-item ${currentView === 'reader' ? 'active' : ''}`}
            onClick={onGoToReader}
            title={isCollapsed ? "Now Reading" : ""}
          >
            <Book size={20} />
            {!isCollapsed && <span>Now Reading</span>}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button onClick={onAddBook} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: isCollapsed ? '0.75rem 0' : '0.75rem 1.5rem' }} title={isCollapsed ? "Add Book" : ""}>
          <PlusCircle size={18} />
          {!isCollapsed && <span>Add Book</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
