import React, { useState, useEffect } from 'react';
import { Download, Trash2 } from 'lucide-react';
import './AnnotationSidebar.css';

interface Annotation {
  id: number;
  type: string;
  color: string;
  text_content: string;
  note_content: string | null;
  created_at: string;
}

interface AnnotationSidebarProps {
  filePath: string;
  isOpen: boolean;
  onClose: () => void;
  onJumpToAnnotation?: (anno: Annotation) => void;
}

export const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({ filePath, isOpen, onClose, onJumpToAnnotation }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    if (isOpen) {
      window.dbApi.getAnnotations(filePath).then((data: Annotation[]) => {
        setAnnotations(data || []);
      });
    }
  }, [isOpen, filePath]);

  const handleDelete = async (id: number) => {
    await window.dbApi.deleteAnnotation(id);
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const handleExport = async () => {
    if (annotations.length === 0) {
      alert("No annotations to export.");
      return;
    }

    const title = filePath.split('\\').pop()?.split('/').pop() || 'Document';
    let md = `# Annotations for ${title}\n\n`;
    
    annotations.forEach(a => {
      md += `> ${a.text_content}\n\n`;
      if (a.note_content) {
        md += `**Note:** ${a.note_content}\n\n`;
      }
      md += `---\n\n`;
    });

    try {
       // Since we don't have an explicit export handler, we can use the HTML5 download attribute trick in renderer
       const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
       const link = document.createElement('a');
       const url = URL.createObjectURL(blob);
       link.setAttribute('href', url);
       link.setAttribute('download', `${title}-annotations.md`);
       link.style.visibility = 'hidden';
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
    } catch (err) {
       console.error("Export failed:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="annotation-sidebar">
      <div className="annotation-sidebar-header">
        <h3>Annotations</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      
      <div className="annotation-sidebar-actions">
        <button className="export-btn" onClick={handleExport}>
          <Download size={16} /> Export Markdown
        </button>
      </div>

      <div className="annotation-sidebar-content">
        {annotations.length === 0 ? (
          <div className="no-annotations">No highlights or notes yet.</div>
        ) : (
          annotations.map(anno => (
            <div key={anno.id} className="annotation-card" onClick={() => onJumpToAnnotation?.(anno)}>
              <div 
                className="annotation-color-bar" 
                style={{ backgroundColor: anno.color === 'underline' || anno.color === 'strikethrough' ? 'var(--text-color)' : anno.color }}
              ></div>
              <div className="annotation-card-body">
                <p className={`annotation-text ${anno.type}`}>{anno.text_content}</p>
                {anno.note_content && (
                  <div className="annotation-note">
                    <strong>Note:</strong> {anno.note_content}
                  </div>
                )}
                <div className="annotation-card-footer">
                  <span className="annotation-date">{new Date(anno.created_at).toLocaleDateString()}</span>
                  <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(anno.id); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
