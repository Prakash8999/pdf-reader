import React, { useEffect, useRef, useState } from 'react';
import ePub, { Book as EPubBook, Rendition, Location } from 'epubjs';
import { ChevronLeft, ChevronRight, Settings, FileText } from 'lucide-react';
import TypographyControls, { TypographySettings } from './TypographyControls';
import { SelectionToolbar } from './SelectionToolbar';
import { NotePopover } from './NotePopover';
import { AnnotationSidebar } from './AnnotationSidebar';
import { generateCitation } from '../utils/citation';
import './EpubViewer.css';

interface EpubViewerProps {
  filePath: string;
  initialLocation?: string;
}

const EpubViewer: React.FC<EpubViewerProps> = ({ filePath, initialLocation }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState<EPubBook | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | null>(initialLocation || null);
  const [progress, setProgress] = useState(0);
  
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [selectionPos, setSelectionPos] = useState<{x: number, y: number} | null>(null);
  const [currentSelection, setCurrentSelection] = useState<any>(null);
  const [notePopoverPos, setNotePopoverPos] = useState<{x: number, y: number, note: string, annoId: number} | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const [settings, setSettings] = useState<TypographySettings>({
    fontFamily: 'Inter, sans-serif',
    fontSize: 100,
    theme: 'dark',
    readingMode: 'spread'
  });

  // Load Book
  useEffect(() => {
    let isMounted = true;
    
    const loadBook = async () => {
      setLoading(true);
      try {
        const base64 = await window.ipcRenderer.invoke('file:read', filePath);
        if (base64) {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const newBook = ePub(bytes.buffer);
          if (isMounted) setBook(newBook);
          
          const loadedAnnos = await window.dbApi.getAnnotations(filePath);
          if (isMounted) setAnnotations(loadedAnnos || []);
        }
      } catch (err) {
        console.error('Error loading EPUB:', err);
      }
    };
    
    loadBook();
    return () => { isMounted = false; };
  }, [filePath]);

  // Render Book
  useEffect(() => {
    if (!book || !viewerRef.current) return;
    
    viewerRef.current.innerHTML = ''; // Clear previous

    const renderMode = settings.readingMode === 'spread' 
      ? { width: '100%', height: '100%', spread: 'always' }
      : { width: '100%', height: '100%', flow: 'scrolled-doc', spread: 'none' };

    const newRendition = book.renderTo(viewerRef.current, {
      ...renderMode,
      manager: 'continuous'
    });

    setRendition(newRendition);

    newRendition.display(initialLocation || undefined);

    newRendition.on('relocated', (location: Location) => {
      setCurrentLocation(location.start.cfi);
      if (book.locations.length() > 0) {
        setProgress(book.locations.percentageFromCfi(location.start.cfi) * 100);
      }
    });

    newRendition.on('selected', (cfiRange: string, contents: any) => {
      const selection = contents.window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const iframe = contents.document.defaultView.frameElement;
          const iframeRect = iframe.getBoundingClientRect();
          
          const x = iframeRect.left + rect.left + (rect.width / 2);
          const y = iframeRect.top + rect.top - 10;
          
          setCurrentSelection({
              cfiRange,
              text: selection.toString()
          });
          setSelectionPos({ x, y });
      }
    });

    newRendition.on('click', () => {
      setSelectionPos(null);
    });

    book.ready.then(() => {
      return book.locations.generate(1600);
    }).then((_locations) => {
      setLoading(false);
      if (currentLocation) {
        setProgress(book.locations.percentageFromCfi(currentLocation) * 100);
      }
      
      // Render existing annotations
      annotations.forEach(anno => {
        if (anno.locator) {
          if (anno.type === 'highlight') {
            newRendition.annotations.highlight(anno.locator, {}, (e: Event) => {
              const mouseEvent = e as MouseEvent;
              if (anno.note_content !== null) {
                setNotePopoverPos({ x: mouseEvent.clientX, y: mouseEvent.clientY, note: anno.note_content, annoId: anno.id });
              }
            });
          } else if (anno.type === 'underline') {
            newRendition.annotations.underline(anno.locator, {}, (e: Event) => {
              const mouseEvent = e as MouseEvent;
              if (anno.note_content !== null) {
                setNotePopoverPos({ x: mouseEvent.clientX, y: mouseEvent.clientY, note: anno.note_content, annoId: anno.id });
              }
            });
          }
        }
      });
    });

    return () => {
      newRendition.destroy();
    };
  }, [book, settings.readingMode, annotations]);

  // Apply Settings
  useEffect(() => {
    if (!rendition) return;
    
    rendition.themes.fontSize(`${settings.fontSize}%`);
    rendition.themes.font(settings.fontFamily);
    
    // Register Themes
    rendition.themes.register('light', { body: { background: '#f8f9fa', color: '#212529' }});
    rendition.themes.register('dark', { body: { background: '#212529', color: '#f8f9fa' }});
    rendition.themes.register('sepia', { body: { background: '#f4ecd8', color: '#5b4636' }});
    rendition.themes.select(settings.theme);
    
  }, [rendition, settings]);

  // Sync Location to DB
  useEffect(() => {
    if (!currentLocation) return;
    const timer = setTimeout(() => {
      window.dbApi.updateLocation(filePath, currentLocation);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentLocation, filePath]);

  const next = () => rendition?.next();
  const prev = () => rendition?.prev();

  return (
    <div className={`epub-viewer-container theme-${settings.theme}`}>
      <div className="epub-toolbar">
        <span className="file-name">{filePath.split('\\').pop()?.split('/').pop()}</span>
        <div className="toolbar-actions">
          <button className="icon-btn" onClick={() => setShowSidebar(!showSidebar)}>
            <FileText size={20} />
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="epub-progress-wrapper">
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {showSettings && (
        <TypographyControls 
          settings={settings} 
          onChange={setSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      <div className="epub-content">
        <button className="nav-btn prev" onClick={prev}><ChevronLeft size={32}/></button>
        <div ref={viewerRef} className="epub-render-area">
          {loading && <div className="loading-spinner">Loading EPUB...</div>}
        </div>
        <button className="nav-btn next" onClick={next}><ChevronRight size={32}/></button>
      </div>

      <SelectionToolbar
        x={selectionPos?.x || 0}
        y={selectionPos?.y || 0}
        visible={!!selectionPos}
        onHighlight={async (color) => {
          if (!currentSelection) return;
          const newAnno = {
            file_path: filePath,
            type: 'highlight' as const,
            color: color,
            locator: currentSelection.cfiRange,
            text_content: currentSelection.text,
            note_content: null
          };
          const savedAnno = await window.dbApi.addAnnotation(newAnno);
          if (savedAnno) {
            setAnnotations(prev => [...prev, savedAnno]);
            rendition?.annotations.highlight(currentSelection.cfiRange, {}, () => {});
          }
          setSelectionPos(null);
          (rendition?.getContents() as any).forEach((c: any) => c.window.getSelection()?.removeAllRanges());
        }}
        onUnderline={async () => {
          if (!currentSelection) return;
          const newAnno = {
            file_path: filePath,
            type: 'underline' as const,
            color: '#6c5ce7',
            locator: currentSelection.cfiRange,
            text_content: currentSelection.text,
            note_content: null
          };
          const savedAnno = await window.dbApi.addAnnotation(newAnno);
          if (savedAnno) {
            setAnnotations(prev => [...prev, savedAnno]);
            rendition?.annotations.underline(currentSelection.cfiRange, {}, () => {});
          }
          setSelectionPos(null);
          (rendition?.getContents() as any).forEach((c: any) => c.window.getSelection()?.removeAllRanges());
        }}
        onStrikethrough={async () => {
          if (!currentSelection) return;
          const newAnno = {
            file_path: filePath,
            type: 'strikethrough' as const,
            color: '#ff6b6b',
            locator: currentSelection.cfiRange,
            text_content: currentSelection.text,
            note_content: null
          };
          const savedAnno = await window.dbApi.addAnnotation(newAnno);
          if (savedAnno) {
            setAnnotations(prev => [...prev, savedAnno]);
          }
          setSelectionPos(null);
          (rendition?.getContents() as any).forEach((c: any) => c.window.getSelection()?.removeAllRanges());
        }}
        onNote={async () => {
          if (!currentSelection) return;
          const newAnno = {
            file_path: filePath,
            type: 'highlight' as const,
            color: '#ffe066',
            locator: currentSelection.cfiRange,
            text_content: currentSelection.text,
            note_content: ''
          };
          const savedAnno = await window.dbApi.addAnnotation(newAnno);
          if (savedAnno) {
            setAnnotations(prev => [...prev, savedAnno]);
            rendition?.annotations.highlight(currentSelection.cfiRange, {}, () => {});
            setNotePopoverPos({ x: selectionPos!.x, y: selectionPos!.y + 40, note: '', annoId: savedAnno.id });
          }
          setSelectionPos(null);
          (rendition?.getContents() as any).forEach((c: any) => c.window.getSelection()?.removeAllRanges());
        }}
        onDefine={() => {
           const word = currentSelection?.text.trim();
           if (word) window.ipcRenderer.invoke('dictionary:define', word).then((def: any) => {
              if (def) alert(`Definition of ${word}:\n\n${def}`);
              else alert(`No definition found for "${word}"`);
           });
           setSelectionPos(null);
        }}
        onCite={() => {
           if (currentSelection) {
             const title = filePath.split('\\').pop()?.split('/').pop() || 'Document';
             const citation = generateCitation('APA', { title, author: 'Unknown' }, currentSelection.text.trim());
             navigator.clipboard.writeText(citation).then(() => {
               alert('Citation (APA) copied to clipboard!');
             });
           }
           setSelectionPos(null);
        }}
      />

      {showSidebar && (
        <AnnotationSidebar 
          filePath={filePath} 
          isOpen={showSidebar} 
          onClose={() => setShowSidebar(false)} 
        />
      )}

      {notePopoverPos && (
        <NotePopover
          x={notePopoverPos.x}
          y={notePopoverPos.y}
          initialNote={notePopoverPos.note}
          onSave={async (note) => {
             await window.dbApi.updateAnnotationNote(notePopoverPos.annoId, note);
             setAnnotations(prev => prev.map(a => a.id === notePopoverPos.annoId ? { ...a, note_content: note } : a));
             setNotePopoverPos(null);
          }}
          onDelete={async () => {
             await window.dbApi.deleteAnnotation(notePopoverPos.annoId);
             setAnnotations(prev => prev.filter(a => a.id !== notePopoverPos.annoId));
             // Remove from rendition
             const anno = annotations.find(a => a.id === notePopoverPos.annoId);
             if (anno) rendition?.annotations.remove(anno.locator, anno.type);
             setNotePopoverPos(null);
          }}
          onClose={() => setNotePopoverPos(null)}
        />
      )}
    </div>
  );
};

export default EpubViewer;
