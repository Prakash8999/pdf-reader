import React, { useState, useEffect, useRef } from 'react';
import { Plus, BookOpen, Settings, Search, X, Filter } from 'lucide-react';
import EditMetadataModal from './EditMetadataModal';
import './Library.css';

interface Book {
  filePath: string;
  title: string;
  author?: string | null;
  cover_image?: string | null;
  tags?: string | null;
}

interface LibraryProps {
  books: Book[];
  onOpenBook: (filePath: string) => void;
  onAddBook: () => void;
  onImportFolder: () => void;
  onUpdateMetadata: (filePath: string, metadata: any) => void;
  onDeleteBook: (filePath: string) => void;
}

const Library: React.FC<LibraryProps> = ({ books, onOpenBook, onAddBook, onImportFolder, onUpdateMetadata, onDeleteBook }) => {
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [displayedBooks, setDisplayedBooks] = useState<Book[]>(books);
  
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  // Fetch all categories from backend on mount
  useEffect(() => {
    window.dbApi.getCategories().then(setAllCategories);
  }, [books]); // Re-fetch when books change (e.g., metadata extracted)

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Debounced backend search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const results = await window.dbApi.searchLibrary(searchQuery, selectedCategories);
      setDisplayedBooks(results.map(b => ({
        filePath: b.file_path,
        title: b.title || b.file_path.split('\\').pop()?.split('/').pop() || 'Unknown Book',
        author: b.author || null,
        cover_image: b.cover_image || null,
        tags: b.tags || null
      })));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategories, books]);

  return (
    <div className="library-container">
      <div className="library-header">
        <h1>My Library</h1>
        
        <div className="library-controls">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by title or author..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="filter-dropdown-container" ref={filterDropdownRef}>
            <button className={`filter-toggle-btn ${selectedCategories.length > 0 ? 'active' : ''}`} onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <Filter size={18} />
              Categories {selectedCategories.length > 0 && `(${selectedCategories.length})`}
            </button>
            
            {isFilterOpen && (
              <div className="filter-dropdown">
                {allCategories.length === 0 ? (
                  <div className="empty-filters">No categories found</div>
                ) : (
                  allCategories.map(cat => (
                    <label key={cat} className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      {cat}
                    </label>
                  ))
                )}
                {selectedCategories.length > 0 && (
                  <button className="clear-filters-btn" onClick={() => setSelectedCategories([])}>
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="books-grid">
        {/* Add Book Card */}
        <div className="book-card add-book-card" onClick={onAddBook}>
          <div className="add-icon-container">
            <Plus size={48} color="var(--text-secondary)" />
          </div>
          <span className="add-book-text">Add Book</span>
        </div>

        {/* Import Folder Card */}
        <div className="book-card add-book-card" onClick={onImportFolder}>
          <div className="add-icon-container">
            <BookOpen size={48} color="var(--text-secondary)" />
          </div>
          <span className="add-book-text">Import Folder</span>
          <span className="add-book-remark">Only .pdf and .epub</span>
        </div>

        {/* Existing Books */}
        {displayedBooks.map((book, index) => {
          const isEpub = book.filePath.toLowerCase().endsWith('.epub');
          
          return (
            <div key={index} className="book-card" onClick={() => onOpenBook(book.filePath)}>
              <div className="book-cover-container">
                {book.cover_image ? (
                  <img src={book.cover_image} alt={book.title} className="book-cover-image" />
                ) : (
                  <div className="book-cover-placeholder">
                    <BookOpen size={48} color="var(--text-secondary)" opacity={0.5} />
                    <span className="book-cover-title">{book.title}</span>
                  </div>
                )}
                <div className={`format-badge ${isEpub ? 'epub' : 'pdf'}`}>
                  {isEpub ? 'EPUB' : 'PDF'}
                </div>
                <button 
                  className="edit-book-btn" 
                  onClick={(e) => { e.stopPropagation(); setEditingBook(book); }}
                  title="Edit Book Details"
                >
                  <Settings size={18} />
                </button>
              </div>
              <div className="book-info">
                <h3 className="book-title" title={book.title}>{book.title}</h3>
                {book.author && <p className="book-author" title={book.author}>{book.author}</p>}
                
                {book.tags && (
                  <div className="book-tags">
                    {book.tags.split(',').slice(0, 2).map((tag, i) => (
                      <span key={i} className="tag-pill">{tag.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingBook && (
        <EditMetadataModal 
          book={editingBook}
          onClose={() => setEditingBook(null)}
          onSave={(filePath, metadata) => {
            onUpdateMetadata(filePath, metadata);
            setEditingBook(null);
          }}
          onDelete={(filePath) => {
            onDeleteBook(filePath);
            setEditingBook(null);
          }}
        />
      )}
    </div>
  );
};

export default Library;
