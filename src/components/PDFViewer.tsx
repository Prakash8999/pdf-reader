import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import './PDFViewer.css';

// Set up PDF.js worker - use ?url import for Vite asset resolution
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PDFViewerProps {
  filePath: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ filePath }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract filename
  const fileName = filePath.split('\\').pop()?.split('/').pop() || 'Document';

  // Load the PDF Document
  useEffect(() => {
    const loadPDF = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // Fetch file as base64 string via IPC
        const base64 = await window.ipcRenderer.invoke('file:read', filePath);
        if (base64 && typeof base64 === 'string') {
          // Decode base64 to binary
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const loadingTask = pdfjsLib.getDocument({ data: bytes });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setPageCount(doc.numPages);
          setPageNum(1);
        } else {
          setErrorMsg('Failed to load PDF buffer via IPC');
        }
      } catch (err: unknown) {
        console.error('Error loading PDF:', err);
        setErrorMsg('Load Error: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };

    if (filePath) {
      loadPDF();
    }
  }, [filePath]);

  // Render the current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
      } catch (err: unknown) {
        console.error('Error rendering page:', err);
        setErrorMsg('Render Error: ' + (err instanceof Error ? err.message : String(err)));
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale]);

  const goToPrevPage = () => setPageNum((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNum((prev) => Math.min(pageCount, prev + 1));
  const zoomIn = () => setScale((prev) => prev + 0.2);
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.2));

  return (
    <div className="pdf-viewer-container">
      {/* Toolbar */}
      <div className="pdf-toolbar">
        <div className="toolbar-section">
          <span className="file-name" title={fileName}>{fileName}</span>
        </div>
        
        <div className="toolbar-section pagination-controls">
          <button onClick={goToPrevPage} disabled={pageNum <= 1 || loading} className="icon-btn">
            <ChevronLeft size={20} />
          </button>
          <span className="page-indicator">
            {pageCount > 0 ? `Page ${pageNum} of ${pageCount}` : 'Loading...'}
          </span>
          <button onClick={goToNextPage} disabled={pageNum >= pageCount || loading} className="icon-btn">
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="toolbar-section zoom-controls">
          <button onClick={zoomOut} className="icon-btn">
            <ZoomOut size={20} />
          </button>
          <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="icon-btn">
            <ZoomIn size={20} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="pdf-canvas-container">
        {errorMsg ? (
          <div className="error-message" style={{ color: '#ff6b6b', padding: '2rem', textAlign: 'center', background: '#2a1e1e', borderRadius: '8px', margin: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>Something went wrong</h3>
            <p>{errorMsg}</p>
          </div>
        ) : loading ? (
          <div className="loading-spinner">Loading Document...</div>
        ) : (
          <canvas ref={canvasRef} className="pdf-canvas"></canvas>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
