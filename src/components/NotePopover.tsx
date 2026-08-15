import React, { useState, useEffect } from 'react';
import './NotePopover.css';

interface NotePopoverProps {
  x: number;
  y: number;
  initialNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
  onDelete?: () => void;
}

export const NotePopover: React.FC<NotePopoverProps> = ({
  x, y, initialNote, onSave, onClose, onDelete
}) => {
  const [note, setNote] = useState(initialNote);

  // Focus textarea on mount
  useEffect(() => {
    const el = document.getElementById('note-textarea');
    if (el) el.focus();
  }, []);

  return (
    <>
      <div className="note-popover-overlay" onClick={onClose} />
      <div 
        className="note-popover"
        style={{ left: x, top: y }}
      >
        <div className="note-header">
          <span>Edit Annotation</span>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <textarea
          id="note-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
          rows={4}
        />
        <div className="note-footer">
          {onDelete && <button className="delete-btn" onClick={onDelete}>Delete</button>}
          <div style={{ flex: 1 }}></div>
          <button className="save-btn" onClick={() => onSave(note)}>Save</button>
        </div>
      </div>
    </>
  );
};
