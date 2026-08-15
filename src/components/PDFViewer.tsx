import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookOpen, ScrollText } from 'lucide-react';
import './PDFViewer.css';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PDFViewerProps {
  filePath: string;
  initialPage?: number;
}

const PDFPage = React.memo(({ pdfDoc, pageNum, scale, isVertical, onVisible }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!isVertical);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

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
        
        const textLayerObj = new pdfjsLib.TextLayer({
            textContentSource: page.streamTextContent(),
            container: textLayer,
            viewport: cssViewport 
        });
        await textLayerObj.render();
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

  return (
    <div ref={wrapperRef} data-page={pageNum} className={`pdf-page-wrapper ${isVertical ? 'vertical-page' : ''}`} style={{ minHeight: isVertical ? `${800 * scale}px` : 'auto', minWidth: isVertical ? `${600 * scale}px` : 'auto' }}>
       {isVisible && (
          <>
            <canvas ref={canvasRef} className="pdf-canvas"></canvas>
            <div ref={textLayerRef} className="textLayer"></div>
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

  const goToPrevPage = () => setPageNum((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNum((prev) => Math.min(pageCount, prev + 1));
  const zoomIn = () => setScale((prev) => prev + 0.2);
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.2));

  const handleVisiblePage = useCallback((num: number) => {
    setPageNum(num);
  }, []);

  const renderPages = useMemo(() => {
    if (!pdfDoc || pageCount === 0) return null;
    
    if (scrollMode === 'horizontal') {
      return <PDFPage key={`page-${pageNum}`} pdfDoc={pdfDoc} pageNum={pageNum} scale={scale} isVertical={false} />;
    } else {
      // Vertical mode: render all pages with IntersectionObserver
      const pages = [];
      for (let i = 1; i <= pageCount; i++) {
        pages.push(
          <PDFPage 
            key={`page-${i}`} 
            pdfDoc={pdfDoc} 
            pageNum={i} 
            scale={scale} 
            isVertical={true} 
            onVisible={handleVisiblePage} 
          />
        );
      }
      return <div className="vertical-pages-container">{pages}</div>;
    }
  }, [pdfDoc, pageCount, pageNum, scale, scrollMode, handleVisiblePage]);

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
          <button onClick={zoomOut} className="icon-btn">
            <ZoomOut size={20} />
          </button>
          <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="icon-btn">
            <ZoomIn size={20} />
          </button>
        </div>
      </div>

      <div className="pdf-footer">
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${pageCount > 0 ? (pageNum / pageCount) * 100 : 0}%` }}></div>
        </div>
      </div>

      <div className="pdf-canvas-container" ref={containerRef}>
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
    </div>
  );
};

export default PDFViewer;
