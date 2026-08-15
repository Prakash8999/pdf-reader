import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import './EditMetadataModal.css';

interface Book {
  filePath: string;
  title: string;
  author?: string | null;
  cover_image?: string | null;
  tags?: string | null;
  time_spent_seconds?: number;
  words_read?: number;
}

interface EditMetadataModalProps {
  book: Book;
  onClose: () => void;
  onSave: (filePath: string, metadata: { title: string; author: string; tags: string; coverImage?: string }) => void;
  onDelete: (filePath: string) => void;
}

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({ book, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(book.title || '');
  const [author, setAuthor] = useState(book.author || '');
  const [tags, setTags] = useState(book.tags || '');
  const [customTag, setCustomTag] = useState('');
  const [coverImage, setCoverImage] = useState<string | undefined>(book.cover_image || undefined);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  useEffect(() => {
    window.dbApi.getCategories().then(setAvailableCategories);
  }, []);

  const currentTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  const addTag = (tag: string) => {
    if (!currentTags.includes(tag)) {
      setTags([...currentTags, tag].join(', '));
    }
  };

  const removeTag = (tag: string) => {
    setTags(currentTags.filter(t => t !== tag).join(', '));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(book.filePath, { title, author, tags, coverImage });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Book Details</h2>
          <button className="icon-btn close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSave} className="edit-form">
          <div className="form-layout">
            <div className="cover-edit-section">
              <div 
                className="cover-preview" 
                onClick={() => fileInputRef.current?.click()}
                style={{ backgroundImage: coverImage ? `url(${coverImage})` : 'none' }}
              >
                {!coverImage && <span className="no-cover-text">No Cover</span>}
                <div className="cover-overlay">
                  <Upload size={24} />
                  <span>Change Cover</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/png, image/jpeg" 
                hidden 
              />
            </div>
            
            <div className="details-edit-section">
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              
              <div className="form-group">
                <label>Author</label>
                <input type="text" value={author} onChange={e => setAuthor(e.target.value)} />
              </div>
              
              <div className="form-group stats-group">
                <label>Reading Statistics</label>
                <div className="stats-display" style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span>⏱️ {book.time_spent_seconds ? `${Math.floor(book.time_spent_seconds / 3600)}h ${Math.floor((book.time_spent_seconds % 3600) / 60)}m` : '0h 0m'}</span>
                  <span>📖 {book.words_read || 0} words est.</span>
                </div>
              </div>

              <div className="form-group tag-group">
                <label>Categories & Tags</label>
                <div className="tag-manager">
                  <div className="current-tags">
                    {currentTags.map(tag => (
                      <span key={tag} className="tag-pill-editable">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                  
                  <input 
                    type="text" 
                    value={customTag} 
                    onChange={e => setCustomTag(e.target.value)} 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customTag.trim()) {
                          addTag(customTag.trim());
                          setCustomTag('');
                        }
                      }
                    }}
                    placeholder="Type custom tag and press Enter" 
                  />

                  <div className="suggested-tags">
                    <span className="suggested-label">Suggested:</span>
                    <div className="suggested-tags-list">
                      {availableCategories.filter(c => !currentTags.includes(c)).map(cat => (
                        <button type="button" key={cat} className="suggested-tag-btn" onClick={() => addTag(cat)}>
                          <Plus size={12} /> {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-danger" onClick={() => {
              if (window.confirm('Are you sure you want to remove this book from your library?')) {
                onDelete(book.filePath);
              }
            }}>
              Remove from Library
            </button>
            <div className="footer-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMetadataModal;
