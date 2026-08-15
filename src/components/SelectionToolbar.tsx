import React from 'react';
import { Trash2, Eraser } from 'lucide-react';
import './SelectionToolbar.css';

interface SelectionToolbarProps {
  x: number;
  y: number;
  visible: boolean;
  onHighlight: (color: string) => void;
  onUnderline: () => void;
  onStrikethrough: () => void;
  onNote: () => void;
  onDefine: () => void;
  onCite: () => void;
  onRemove?: () => void;
  onClearFormat?: () => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  x, y, visible, onHighlight, onUnderline, onStrikethrough, onNote, onDefine, onCite, onRemove, onClearFormat
}) => {
  if (!visible) return null;

  return (
    <div 
      className="selection-toolbar"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      <div className="st-section">
        <button className="color-btn yellow" onClick={() => onHighlight('#ffe066')} title="Yellow"></button>
        <button className="color-btn green" onClick={() => onHighlight('#69db7c')} title="Green"></button>
        <button className="color-btn blue" onClick={() => onHighlight('#74c0fc')} title="Blue"></button>
        <button className="color-btn pink" onClick={() => onHighlight('#f783ac')} title="Pink"></button>
      </div>
      
      <div className="st-divider" />
      
      <div className="st-section">
        <button className="tool-btn underline" onClick={onUnderline} title="Underline">U</button>
        <button className="tool-btn strikethrough" onClick={onStrikethrough} title="Strikethrough">S</button>
        {!onRemove && onClearFormat && (
          <button className="tool-btn clear-format" onClick={onClearFormat} title="Clear Formatting" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eraser size={14} />
          </button>
        )}
      </div>
      
      <div className="st-divider" />
      
      <div className="st-section">
        <button className="action-btn" onClick={onNote} title="Add/Edit Note">📝</button>
        {!onRemove && <button className="action-btn" onClick={onDefine} title="Define">📖</button>}
        {!onRemove && <button className="action-btn" onClick={onCite} title="Cite">🎓</button>}
        {onRemove && (
          <button className="action-btn delete" onClick={onRemove} title="Remove Annotation" style={{ color: '#ff6b6b' }}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
