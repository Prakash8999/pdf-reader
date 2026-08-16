import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookOpen, ScrollText, FileText, StickyNote, Search, X, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import './PDFViewer.css';
import { SelectionToolbar } from './SelectionToolbar';
import { NotePopover } from './NotePopover';
import { AnnotationSidebar } from './AnnotationSidebar';
import { generateCitation } from '../utils/citation';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PDFViewerProps {
  filePath: string;
  initialPage?: number;
}

const PDFPage = React.memo(({ pdfDoc, pageNum, scale, isVertical, onVisible, annotations = [], onNoteClick, showNoteIcons, searchQuery, searchMatches = [], activeMatchIndexOnPage = -1 }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!isVertical);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [searchRects, setSearchRects] = useState<{rects: any[], isActive: boolean}[]>([]);
  const [textLayerRendered, setTextLayerRendered] = useState(0);

  useEffect(() => {
    if (!isVertical) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (onVisible) onVisible(pageNum);
          } else {
            // Unload to save memory in large PDFs
            setIsVisible(false);
          }
        });
      },
      { rootMargin: '100% 0px', threshold: 0 } // Load a full viewport ahead
    );
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [isVertical, pageNum, onVisible]);

  useEffect(() => {
    let isMounted = true;
    const renderPage = async () => {
      if (!isVisible || !pdfDoc || !canvasRef.current || !textLayerRef.current) return;
      
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!isMounted) return;

        const cssViewport = page.getViewport({ scale });
        const pixelRatio = Math.max(2, window.devicePixelRatio || 1);
        const renderViewport = page.getViewport({ scale: scale * pixelRatio });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const textLayer = textLayerRef.current;
        
        if (!context) return;
        
        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = Math.floor(cssViewport.width) + 'px';
        canvas.style.height = Math.floor(cssViewport.height) + 'px';

        const wrapper = canvas.parentElement;
        if (wrapper) {
            wrapper.style.width = Math.floor(cssViewport.width) + 'px';
            wrapper.style.height = Math.floor(cssViewport.height) + 'px';
        }

        const renderContext = { canvasContext: context, viewport: renderViewport, canvas: canvas };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
        
        if (!isMounted) return;

        textLayer.innerHTML = '';
        textLayer.style.setProperty('--scale-factor', cssViewport.scale.toString());
        textLayer.style.setProperty('--total-scale-factor', cssViewport.scale.toString());
        
        const textLayerObj = new pdfjsLib.TextLayer({
            textContentSource: page.streamTextContent(),
            container: textLayer,
            viewport: cssViewport 
        });
        await textLayerObj.render();
        setTextLayerRendered(Date.now());
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    };

    renderPage();
    return () => {
        isMounted = false;
        if (renderTaskRef.current) {
            try { renderTaskRef.current.cancel(); } catch (e) {}
        }
    };
  }, [isVisible, pdfDoc, scale, pageNum]);

  // Separate effect for search highlights to prevent canvas re-renders
  useEffect(() => {
    if (!wrapperRef.current || !textLayerRef.current || textLayerRef.current.innerHTML === '') return;
    
    if (searchMatches.length > 0 && searchQuery) {
      const textLayer = textLayerRef.current;
      const wrapper = wrapperRef.current;
      const spans = Array.from(textLayer.querySelectorAll('span'));
      let fullText = '';
      const spanOffsets: {span: Element, start: number, end: number}[] = [];
      
      spans.forEach((span) => {
        const text = span.textContent || '';
        spanOffsets.push({ span, start: fullText.length, end: fullText.length + text.length });
        fullText += text;
      });
      
      const query = searchQuery.toLowerCase();
      const newSearchRects = [];
      const wrapperRect = wrapper.getBoundingClientRect();
      
      let matchIdx = fullText.toLowerCase().indexOf(query);
      let countOnPage = 0;
      
      while (matchIdx !== -1) {
        const endMatchIdx = matchIdx + query.length;
        
        const startSpanData = spanOffsets.find(o => matchIdx >= o.start && matchIdx < o.end);
        const endSpanData = spanOffsets.find(o => endMatchIdx > o.start && endMatchIdx <= o.end) || spanOffsets.find(o => endMatchIdx >= o.start && endMatchIdx <= o.end);
        
        if (startSpanData && endSpanData) {
           try {
             const range = document.createRange();
             const startTextNode = startSpanData.span.firstChild;
             const endTextNode = endSpanData.span.firstChild;
             
             if (startTextNode && endTextNode) {
               range.setStart(startTextNode, matchIdx - startSpanData.start);
               range.setEnd(endTextNode, endMatchIdx - endSpanData.start);
               
               const clientRects = Array.from(range.getClientRects());
               const relRects = clientRects.filter(r => r.width > 0 && r.height > 0).map(r => ({
                  top: (r.top - wrapperRect.top) / wrapperRect.height,
                  left: (r.left - wrapperRect.left) / wrapperRect.width,
                  width: r.width / wrapperRect.width,
                  height: r.height / wrapperRect.height,
               }));
               
               newSearchRects.push({
                 rects: relRects,
                 isActive: activeMatchIndexOnPage === countOnPage
               });
             }
           } catch(e) {}
        }
        
        countOnPage++;
        matchIdx = fullText.toLowerCase().indexOf(query, matchIdx + 1);
      }
      setSearchRects(newSearchRects);
    } else {
      setSearchRects([]);
    }
  }, [searchMatches, searchQuery, activeMatchIndexOnPage, scale, textLayerRendered]);

  return (
    <div ref={wrapperRef} data-page={pageNum} className={`pdf-page-wrapper ${isVertical ? 'vertical-page' : ''}`} style={{ minHeight: isVertical ? `${800 * scale}px` : 'auto', minWidth: isVertical ? `${600 * scale}px` : 'auto', position: 'relative' }}>
       {isVisible && (
          <>
            <canvas ref={canvasRef} className="pdf-canvas"></canvas>
            <div ref={textLayerRef} className="textLayer"></div>
            {/* Search overlay layer */}
            <div className="search-overlay-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
              {searchRects.map((match, i) => 
                 match.rects.map((r, j) => (
                   <div key={`search-${i}-${j}`} className={`search-highlight-rect ${match.isActive ? 'active' : ''}`} style={{
                     position: 'absolute',
                     left: `${r.left * 100}%`,
                     top: `${r.top * 100}%`,
                     width: `${r.width * 100}%`,
                     height: `${r.height * 100}%`
                   }} />
                 ))
              )}
            </div>
            {/* Annotation overlay layer */}
            <div className="annotation-overlay-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
              {annotations.map((anno: any) => {
                try {
                  const locData = JSON.parse(anno.locator);
                  const rects = locData.rects;
                  if (!rects || rects.length === 0) return null;

                  const isUnderline = anno.type === 'underline';
                  const isStrikethrough = anno.type === 'strikethrough';
                  const isHighlight = anno.type === 'highlight';

                  return rects.map((r: any, idx: number) => (
                    <React.Fragment key={`${anno.id}-${idx}`}>
                      {/* Highlight fill */}
                      {isHighlight && (
                        <div style={{
                          position: 'absolute',
                          top: `${r.top * 100}%`,
                          left: `${r.left * 100}%`,
                          width: `${r.width * 100}%`,
                          height: `${r.height * 100}%`,
                          backgroundColor: anno.color,
                          mixBlendMode: 'multiply',
                          opacity: 0.45,
                          borderRadius: '2px',
                        }} />
                      )}
                      {/* Underline: a 2px line at the bottom of the rect */}
                      {isUnderline && (
                        <div style={{
                          position: 'absolute',
                          top: `calc(${r.top * 100}% + ${r.height * 100}% - 2px)`,
                          left: `${r.left * 100}%`,
                          width: `${r.width * 100}%`,
                          height: '2px',
                          backgroundColor: anno.color,
                          borderRadius: '1px',
                        }} />
                      )}
                      {/* Strikethrough: a 2px line through the middle */}
                      {isStrikethrough && (
                        <div style={{
                          position: 'absolute',
                          top: `calc(${r.top * 100}% + ${r.height * 100}% * 0.5 - 1px)`,
                          left: `${r.left * 100}%`,
                          width: `${r.width * 100}%`,
                          height: '2px',
                          backgroundColor: anno.color,
                          borderRadius: '1px',
                        }} />
                      )}
                      {/* Note icon on first rect if annotation has a non-empty note */}
                      {showNoteIcons && idx === 0 && anno.note_content && anno.note_content.trim() !== '' && (
                        <div 
                          className="annotation-note-icon"
                          style={{ 
                            position: 'absolute', 
                            left: `${r.left * 100}%`, 
                            top: `calc(${r.top * 100}% - 18px)`,
                            cursor: 'pointer', 
                            pointerEvents: 'auto', 
                            color: '#e0e0e0',
                            background: 'rgba(30,30,30,0.8)', 
                            borderRadius: '4px', 
                            padding: '2px 4px', 
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            lineHeight: '1',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={(e) => { e.stopPropagation(); onNoteClick(anno.id, e.clientX, e.clientY); }}
                          title={anno.note_content || 'Click to edit note'}
                        >
                          <StickyNote size={14} />
                        </div>
                      )}
                    </React.Fragment>
                  ));
                } catch(e) { return null; }
              })}
            </div>
          </>
       )}
    </div>
  );
});

const PDFViewer: React.FC<PDFViewerProps> = ({ filePath, initialPage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(initialPage || 1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [annotations, setAnnotations] = useState<any[]>([]);
  const [selectionPos, setSelectionPos] = useState<{x: number, y: number} | null>(null);
  const [currentSelection, setCurrentSelection] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNoteIcons, setShowNoteIcons] = useState(false);
  
  const [notePopoverPos, setNotePopoverPos] = useState<{x: number, y: number, note: string, annoId: number} | null>(null);
  const [hoveredNoteInfo, setHoveredNoteInfo] = useState<{text: string, x: number, y: number, id: number} | null>(null);
  const [editingAnnoId, setEditingAnnoId] = useState<number | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{pageNum: number, matchIndexOnPage: number}[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [showSearchBar, setShowSearchBar] = useState(false);

  const [scrollMode, setScrollMode] = useState<'horizontal' | 'vertical'>(
    () => (localStorage.getItem('pdf_scroll_mode') as 'horizontal' | 'vertical') || 'horizontal'
  );

  const fileName = filePath.split('\\').pop()?.split('/').pop() || 'Document';

  useEffect(() => {
    localStorage.setItem('pdf_scroll_mode', scrollMode);
  }, [scrollMode]);

  useEffect(() => {
    const loadPDF = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const base64 = await window.ipcRenderer.invoke('file:read', filePath);
        if (base64 && typeof base64 === 'string') {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const loadingTask = pdfjsLib.getDocument({ data: bytes });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setPageCount(doc.numPages);
          setPageNum(initialPage || 1);
          
          const loadedAnnos = await window.dbApi.getAnnotations(filePath);
          setAnnotations(loadedAnnos || []);
        } else {
          setErrorMsg('Failed to load PDF buffer via IPC');
        }
      } catch (err: any) {
        setErrorMsg('Load Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    if (filePath) loadPDF();
  }, [filePath]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY * -0.01;
        setScale((prev) => Math.min(Math.max(0.5, prev + zoomFactor), 5.0));
      }
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  useEffect(() => {
    if (!pdfDoc) return;
    const timer = setTimeout(() => {
      window.dbApi.updatePage(filePath, pageNum);
    }, 500);
    return () => clearTimeout(timer);
  }, [pageNum, filePath, pdfDoc]);

  const handleToggleAnnotation = async (type: 'highlight' | 'underline' | 'strikethrough', color: string) => {
    if (!currentSelection) return;
    
    const selRects = currentSelection.rects;
    const pageAnnos = annotations.filter(a => {
       try { return JSON.parse(a.locator).pageNum === currentSelection.pageNum; } catch { return false; }
    });
    
    const overlappingAnnos: any[] = [];
    for (const anno of pageAnnos) {
       if (anno.type !== type) continue; // Only toggle same type
       try {
          const loc = JSON.parse(anno.locator);
          let overlaps = false;
          for (const r1 of loc.rects) {
             for (const r2 of selRects) {
                if (!(r1.left > r2.left + r2.width || r1.left + r1.width < r2.left || r1.top > r2.top + r2.height || r1.top + r1.height < r2.top)) {
                   overlaps = true; break;
                }
             }
             if (overlaps) break;
          }
          if (overlaps) overlappingAnnos.push(anno);
       } catch {}
    }
    
    if (overlappingAnnos.length > 0) {
       let allSameColor = overlappingAnnos.every(a => a.color === color);
       if (type === 'highlight' && !allSameColor) {
           for (const anno of overlappingAnnos) {
               await window.dbApi.updateAnnotationColor(anno.id, color);
           }
           setAnnotations(prev => prev.map(a => overlappingAnnos.some(o => o.id === a.id) ? { ...a, color } : a));
       } else {
           for (const anno of overlappingAnnos) await window.dbApi.deleteAnnotation(anno.id);
           setAnnotations(prev => prev.filter(a => !overlappingAnnos.some(o => o.id === a.id)));
       }
    } else {
       const newAnno = {
         file_path: filePath,
         type: type,
         color: color,
         locator: JSON.stringify({ pageNum: currentSelection.pageNum, rects: currentSelection.rects }),
         text_content: currentSelection.text,
         note_content: null
       };
       const savedAnno = await window.dbApi.addAnnotation(newAnno);
       if (savedAnno) setAnnotations(prev => [...prev, savedAnno]);
    }
    
    setSelectionPos(null);
    window.getSelection()?.removeAllRanges();
  };

  const scrollToMatch = useCallback((match: {pageNum: number}) => {
    if (scrollMode === 'horizontal') {
      setPageNum(match.pageNum);
    } else {
      const pageEl = containerRef.current?.querySelector(`[data-page="${match.pageNum}"]`);
      if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [scrollMode]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !pdfDoc) return;
    setIsSearching(true);
    setSearchResults([]);
    setActiveSearchIndex(-1);
    
    const matches: {pageNum: number, matchIndexOnPage: number}[] = [];
    const query = searchQuery.toLowerCase();
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const tc = await page.getTextContent();
        let fullText = '';
        tc.items.forEach((item: any) => {
          if (item.str) fullText += item.str;
        });
        
        let matchIdx = fullText.toLowerCase().indexOf(query);
        let countOnPage = 0;
        while (matchIdx !== -1) {
          matches.push({ pageNum: i, matchIndexOnPage: countOnPage });
          countOnPage++;
          matchIdx = fullText.toLowerCase().indexOf(query, matchIdx + 1);
        }
      } catch (e) {}
    }
    
    setSearchResults(matches);
    if (matches.length > 0) {
      setActiveSearchIndex(0);
      scrollToMatch(matches[0]);
    }
    setIsSearching(false);
  };

  const handleNextSearch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeSearchIndex + 1) % searchResults.length;
    setActiveSearchIndex(nextIdx);
    scrollToMatch(searchResults[nextIdx]);
  };

  const handlePrevSearch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveSearchIndex(prevIdx);
    scrollToMatch(searchResults[prevIdx]);
  };

  const goToPrevPage = () => setPageNum((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNum((prev) => Math.min(pageCount, prev + 1));
  const zoomIn = () => setScale((prev) => prev + 0.2);
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.2));

  const handleVisiblePage = useCallback((num: number) => {
    setPageNum(num);
  }, []);

  const handleNoteClick = useCallback((annoId: number, clientX: number, clientY: number) => {
    const anno = annotations.find(a => a.id === annoId);
    if (anno) {
      setSelectionPos(null);
      setNotePopoverPos({ x: clientX, y: clientY, note: anno.note_content || '', annoId });
    }
  }, [annotations]);

  const renderPages = useMemo(() => {
    if (!pdfDoc || pageCount === 0) return null;
    
    if (scrollMode === 'horizontal') {
      const pageAnnos = annotations.filter(a => a.locator && JSON.parse(a.locator).pageNum === pageNum);
      return <PDFPage key={`page-${pageNum}`} pdfDoc={pdfDoc} pageNum={pageNum} scale={scale} isVertical={false} annotations={pageAnnos} onNoteClick={handleNoteClick} showNoteIcons={showNoteIcons} searchQuery={searchQuery} searchMatches={searchResults.filter(m => m.pageNum === pageNum)} activeMatchIndexOnPage={searchResults[activeSearchIndex]?.pageNum === pageNum ? searchResults[activeSearchIndex].matchIndexOnPage : -1} />;
    } else {
      // Vertical mode: render all pages with IntersectionObserver
      const pages = [];
      for (let i = 1; i <= pageCount; i++) {
        const pageAnnos = annotations.filter(a => a.locator && JSON.parse(a.locator).pageNum === i);
        pages.push(
          <PDFPage 
            key={`page-${i}`} 
            pdfDoc={pdfDoc} 
            pageNum={i} 
            scale={scale} 
            isVertical={true} 
            onVisible={handleVisiblePage} 
            annotations={pageAnnos}
            onNoteClick={handleNoteClick}
            showNoteIcons={showNoteIcons}
            searchQuery={searchQuery}
            searchMatches={searchResults.filter(m => m.pageNum === i)}
            activeMatchIndexOnPage={searchResults[activeSearchIndex]?.pageNum === i ? searchResults[activeSearchIndex].matchIndexOnPage : -1}
          />
        );
      }
      return <div className="vertical-pages-container">{pages}</div>;
    }
  }, [pdfDoc, pageCount, pageNum, scale, scrollMode, handleVisiblePage, annotations, handleNoteClick, showNoteIcons, searchQuery, searchResults, activeSearchIndex]);

  // Jump to initial page when switching to vertical mode or on load
  useEffect(() => {
    if (scrollMode === 'vertical' && containerRef.current) {
        setTimeout(() => {
            const pageEl = containerRef.current?.querySelector(`[data-page="${pageNum}"]`);
            if (pageEl) pageEl.scrollIntoView();
        }, 100);
    }
  }, [scrollMode, pdfDoc]);

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-toolbar">
        <div className="toolbar-section">
          <span className="file-name" title={fileName}>{fileName}</span>
        </div>
        
        <div className="toolbar-section pagination-controls">
          {scrollMode === 'horizontal' && (
            <button onClick={goToPrevPage} disabled={pageNum <= 1 || loading} className="icon-btn">
              <ChevronLeft size={20} />
            </button>
          )}
          <span className="page-indicator">
            {pageCount > 0 ? `Page ${pageNum} of ${pageCount}` : 'Loading...'}
          </span>
          {scrollMode === 'horizontal' && (
            <button onClick={goToNextPage} disabled={pageNum >= pageCount || loading} className="icon-btn">
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        
        <div className="toolbar-section mode-controls">
          <button onClick={() => setScrollMode('horizontal')} className={`icon-btn mode-btn ${scrollMode === 'horizontal' ? 'active' : ''}`} title="Horizontal Mode">
            <BookOpen size={18} />
          </button>
          <button onClick={() => setScrollMode('vertical')} className={`icon-btn mode-btn ${scrollMode === 'vertical' ? 'active' : ''}`} title="Vertical Mode">
            <ScrollText size={18} />
          </button>
          <div className="toolbar-divider"></div>
          {showSearchBar ? (
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '2px 6px', gap: '4px' }}>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search document..."
                autoFocus
                style={{ background: 'transparent', border: 'none', color: '#e0e0e0', outline: 'none', width: '120px', fontSize: '13px' }}
              />
              <span className="search-count" style={{ fontSize: '12px', color: '#a0a0a0', minWidth: '35px', textAlign: 'center' }}>
                {isSearching ? <Loader2 size={12} className="spin" /> : searchResults.length > 0 ? `${activeSearchIndex + 1}/${searchResults.length}` : '0/0'}
              </span>
              <button onClick={handlePrevSearch} disabled={searchResults.length === 0} className="icon-btn" style={{ padding: '2px' }}><ArrowUp size={14} /></button>
              <button onClick={handleNextSearch} disabled={searchResults.length === 0} className="icon-btn" style={{ padding: '2px' }}><ArrowDown size={14} /></button>
              <button onClick={() => { setShowSearchBar(false); setSearchResults([]); }} className="icon-btn" style={{ padding: '2px' }}><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setShowSearchBar(true)} className="icon-btn mode-btn" title="Search">
              <Search size={18} />
            </button>
          )}
          <div className="toolbar-divider"></div>
          <button onClick={() => setShowNoteIcons(!showNoteIcons)} className={`icon-btn mode-btn ${showNoteIcons ? 'active' : ''}`} title="Toggle Note Icons">
            <StickyNote size={18} />
          </button>
          <div className="toolbar-divider"></div>
          <button onClick={zoomOut} className="icon-btn">
            <ZoomOut size={20} />
          </button>
          <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="icon-btn">
            <ZoomIn size={20} />
          </button>
          <div className="toolbar-divider"></div>
          <button onClick={() => setShowSidebar(!showSidebar)} className={`icon-btn mode-btn ${showSidebar ? 'active' : ''}`} title="Annotations">
            <FileText size={18} />
          </button>
        </div>
      </div>

      <div className="pdf-footer">
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${pageCount > 0 ? (pageNum / pageCount) * 100 : 0}%` }}></div>
        </div>
      </div>

      <div 
        className="pdf-canvas-container" 
        ref={containerRef}
        onMouseMove={(e) => {
          let foundHover: any = null;
          const wrappers = document.querySelectorAll('.pdf-page-wrapper');
          for (let i = 0; i < wrappers.length; i++) {
            const wrapper = wrappers[i];
            const rect = wrapper.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
              const pNum = parseInt(wrapper.getAttribute('data-page') || '0');
              if (!pNum) continue;
              
              const relX = (e.clientX - rect.left) / rect.width;
              const relY = (e.clientY - rect.top) / rect.height;
              
              const pageAnnos = annotations.filter(a => {
                try { return JSON.parse(a.locator).pageNum === pNum; } catch { return false; }
              });
              
              for (const anno of pageAnnos) {
                try {
                  const loc = JSON.parse(anno.locator);
                  for (const r of loc.rects) {
                    if (relX >= r.left - 0.005 && relX <= r.left + r.width + 0.005 && relY >= r.top - 0.005 && relY <= r.top + r.height + 0.005) {
                      foundHover = { text: anno.note_content || '', x: e.clientX, y: e.clientY, id: anno.id };
                      break;
                    }
                  }
                } catch {}
                if (foundHover) break;
              }
              break;
            }
          }
          if (foundHover) {
            setHoveredNoteInfo(foundHover);
          } else {
            setHoveredNoteInfo(null);
          }
        }}
        onClick={(e) => {
          if (hoveredNoteInfo && !window.getSelection()?.toString().trim()) {
            setSelectionPos({ x: e.clientX, y: e.clientY - 20 });
            setEditingAnnoId(hoveredNoteInfo.id);
            setHoveredNoteInfo(null);
          }
        }}
        onMouseUp={() => {
          // Small delay to let selection finalize
          setTimeout(() => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
              const range = selection.getRangeAt(0);
              
              // Walk up from the selection to find the page wrapper
              let node: HTMLElement | null = selection.anchorNode?.parentElement || null;
              let pageNumForSelection = pageNum;
              let wrapperRect: DOMRect | null = null;
              
              while (node && !node.classList.contains('pdf-page-wrapper')) {
                node = node.parentElement;
              }

              if (node) {
                wrapperRect = node.getBoundingClientRect();
                pageNumForSelection = parseInt(node.getAttribute('data-page') || `${pageNum}`);
                
                // Normalize selection rects relative to the page wrapper
                const clientRects = Array.from(range.getClientRects());
                // Deduplicate and filter out zero-size rects
                const rects = clientRects
                  .filter(r => r.width > 0 && r.height > 0)
                  .map(r => ({
                    top: (r.top - wrapperRect!.top) / wrapperRect!.height,
                    left: (r.left - wrapperRect!.left) / wrapperRect!.width,
                    width: r.width / wrapperRect!.width,
                    height: r.height / wrapperRect!.height,
                  }));

                if (rects.length > 0) {
                  const selRect = range.getBoundingClientRect();
                  const toolbarX = selRect.left + selRect.width / 2;
                  const toolbarY = selRect.top;
                  
                  setCurrentSelection({
                    pageNum: pageNumForSelection,
                    rects,
                    text: selection.toString()
                  });
                  setSelectionPos({ x: toolbarX, y: toolbarY });
                }
              }
            } else {
              setSelectionPos(null);
            }
          }, 10);
        }}
        onMouseDown={(e) => {
           // Don't dismiss if clicking inside the toolbar
           if ((e.target as HTMLElement).closest('.selection-toolbar')) return;
           setSelectionPos(null);
           setEditingAnnoId(null);
        }}
      >
        {errorMsg ? (
          <div className="error-message" style={{ color: '#ff6b6b', padding: '2rem', textAlign: 'center', background: '#2a1e1e', borderRadius: '8px', margin: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>Something went wrong</h3>
            <p>{errorMsg}</p>
          </div>
        ) : loading ? (
          <div className="loading-spinner">Loading Document...</div>
        ) : (
          renderPages
        )}
      </div>

      <SelectionToolbar
        x={selectionPos?.x || 0}
        y={selectionPos?.y || 0}
        visible={!!selectionPos}
        onHighlight={async (color) => {
          if (editingAnnoId) {
            await window.dbApi.updateAnnotationColor(editingAnnoId, color);
            setAnnotations(prev => prev.map(a => a.id === editingAnnoId ? { ...a, type: 'highlight', color } : a));
            setSelectionPos(null);
            setEditingAnnoId(null);
            return;
          }
          await handleToggleAnnotation('highlight', color);
        }}
        onUnderline={async () => {
          if (editingAnnoId) {
            await window.dbApi.updateAnnotationColor(editingAnnoId, '#6c5ce7');
            setAnnotations(prev => prev.map(a => a.id === editingAnnoId ? { ...a, type: 'underline', color: '#6c5ce7' } : a));
            setSelectionPos(null);
            setEditingAnnoId(null);
            return;
          }
          await handleToggleAnnotation('underline', '#6c5ce7');
        }}
        onStrikethrough={async () => {
          if (editingAnnoId) {
            await window.dbApi.updateAnnotationColor(editingAnnoId, '#ff6b6b');
            setAnnotations(prev => prev.map(a => a.id === editingAnnoId ? { ...a, type: 'strikethrough', color: '#ff6b6b' } : a));
            setSelectionPos(null);
            setEditingAnnoId(null);
            return;
          }
          await handleToggleAnnotation('strikethrough', '#ff6b6b');
        }}
        onNote={async () => {
          if (editingAnnoId) {
            const anno = annotations.find(a => a.id === editingAnnoId);
            if (anno) {
              setNotePopoverPos({ x: selectionPos!.x, y: selectionPos!.y + 40, note: anno.note_content || '', annoId: editingAnnoId });
            }
            setSelectionPos(null);
            setEditingAnnoId(null);
            return;
          }
          if (!currentSelection) return;
          const newAnno = {
            file_path: filePath,
            type: 'highlight' as const,
            color: '#ffe066',
            locator: JSON.stringify({ pageNum: currentSelection.pageNum, rects: currentSelection.rects }),
            text_content: currentSelection.text,
            note_content: ''
          };
          const savedAnno = await window.dbApi.addAnnotation(newAnno);
          if (savedAnno) {
            setAnnotations(prev => [...prev, savedAnno]);
            setNotePopoverPos({ x: selectionPos!.x, y: selectionPos!.y + 40, note: '', annoId: savedAnno.id });
          }
          setSelectionPos(null);
          window.getSelection()?.removeAllRanges();
        }}
        onDefine={() => {
           if (editingAnnoId) return; // Hide for editing existing
           const word = window.getSelection()?.toString().trim();
           if (word) window.ipcRenderer.invoke('dictionary:define', word).then((def: any) => {
              if (def) alert(`Definition of ${word}:\n\n${def}`);
              else alert(`No definition found for "${word}"`);
           });
           setSelectionPos(null);
        }}
        onCite={() => {
           if (editingAnnoId) return; // Hide for editing existing
           if (currentSelection) {
             const citation = generateCitation('APA', { title: fileName, author: 'Unknown' }, currentSelection.text.trim());
             navigator.clipboard.writeText(citation).then(() => {
               alert('Citation (APA) copied to clipboard!');
             });
           }
           setSelectionPos(null);
        }}
        onRemove={editingAnnoId ? async () => {
           await window.dbApi.deleteAnnotation(editingAnnoId);
           setAnnotations(prev => prev.filter(a => a.id !== editingAnnoId));
           setSelectionPos(null);
           setEditingAnnoId(null);
        } : undefined}
        onClearFormat={async () => {
           if (!currentSelection) return;
           const overlappingAnnoIds: number[] = [];
           const selRects = currentSelection.rects;
           
           const pageAnnos = annotations.filter(a => {
              try { return JSON.parse(a.locator).pageNum === currentSelection.pageNum; } catch { return false; }
           });
           
           for (const anno of pageAnnos) {
              try {
                 const loc = JSON.parse(anno.locator);
                 let overlaps = false;
                 for (const r1 of loc.rects) {
                    for (const r2 of selRects) {
                       // Check for rectangle intersection
                       if (!(r1.left > r2.left + r2.width || 
                             r1.left + r1.width < r2.left || 
                             r1.top > r2.top + r2.height ||
                             r1.top + r1.height < r2.top)) {
                          overlaps = true;
                          break;
                       }
                    }
                    if (overlaps) break;
                 }
                 if (overlaps) overlappingAnnoIds.push(anno.id);
              } catch {}
           }
           
           for (const id of overlappingAnnoIds) {
              await window.dbApi.deleteAnnotation(id);
           }
           if (overlappingAnnoIds.length > 0) {
              setAnnotations(prev => prev.filter(a => !overlappingAnnoIds.includes(a.id)));
           }
           setSelectionPos(null);
           window.getSelection()?.removeAllRanges();
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
          key={notePopoverPos.annoId}
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
             setNotePopoverPos(null);
          }}
          onClose={() => setNotePopoverPos(null)}
        />
      )}

      {hoveredNoteInfo && hoveredNoteInfo.text.trim().length > 0 && !notePopoverPos && !selectionPos && (
        <div style={{
          position: 'fixed',
          left: hoveredNoteInfo.x + 15,
          top: hoveredNoteInfo.y + 15,
          background: 'rgba(30, 30, 30, 0.95)',
          color: '#e0e0e0',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '13px',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          maxWidth: '250px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'popIn 0.15s ease-out'
        }}>
          {hoveredNoteInfo.text}
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
