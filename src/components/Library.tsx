import React from 'react';
import { Plus } from 'lucide-react';
import './Library.css';

interface Book {
  filePath: string;
  title: string;
  cover?: string;
}

interface LibraryProps {
  books: Book[];
  onOpenBook: (filePath: string) => void;
  onAddBook: () => void;
}

const Library: React.FC<LibraryProps> = ({ books, onOpenBook, onAddBook }) => {
  return (
    <div className="library-container">
      <div className="library-header">
        <h1>My Library</h1>
      </div>
      
      <div className="books-grid">
        {/* Add Book Card */}
        <div className="book-card add-book-card" onClick={onAddBook}>
          <div className="add-icon-container">
            <Plus size={48} color="var(--text-secondary)" />
          </div>
          <span className="add-book-text">Add Book</span>
        </div>

        {/* Existing Books */}
        {books.map((book, index) => (
          <div key={index} className="book-card" onClick={() => onOpenBook(book.filePath)}>
            <div className="book-cover-placeholder">
              <span className="book-cover-title">{book.title}</span>
            </div>
            <div className="book-info">
              <h3 className="book-title" title={book.title}>{book.title}</h3>
              <p className="book-format">PDF</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Library;
