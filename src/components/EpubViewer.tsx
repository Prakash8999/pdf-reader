import React, { useEffect, useRef, useState } from 'react';
import ePub, { Book as EPubBook, Rendition, Location } from 'epubjs';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import TypographyControls, { TypographySettings } from './TypographyControls';
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

    book.ready.then(() => {
      return book.locations.generate(1600);
    }).then((_locations) => {
      setLoading(false);
      if (currentLocation) {
        setProgress(book.locations.percentageFromCfi(currentLocation) * 100);
      }
    });

    return () => {
      newRendition.destroy();
    };
  }, [book, settings.readingMode]);

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
    </div>
  );
};

export default EpubViewer;
