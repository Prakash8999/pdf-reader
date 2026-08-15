import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Epub from 'epubjs';

// Setup pdf worker
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Book {
  filePath: string;
  title: string | null;
  author: string | null;
  cover_image: string | null;
  tags: string | null;
}

interface MetadataExtractorProps {
  books: Book[];
  onMetadataExtracted: () => void;
}

const MetadataExtractor: React.FC<MetadataExtractorProps> = ({ books, onMetadataExtracted }) => {
  const [processedFiles, setProcessedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const processBooks = async () => {
      // Find books missing a cover that we haven't tried to process yet this session
      const toProcess = books.filter(b => !b.cover_image && !processedFiles.has(b.filePath));
      
      for (const book of toProcess) {
        setProcessedFiles(prev => new Set(prev).add(book.filePath));
        
        try {
           const base64 = await window.ipcRenderer.invoke('file:read', book.filePath);
           if (!base64) continue;

           if (book.filePath.toLowerCase().endsWith('.pdf')) {
             await processPdf(book.filePath, base64);
           } else if (book.filePath.toLowerCase().endsWith('.epub')) {
             await processEpub(book.filePath, base64);
           }
           onMetadataExtracted();
        } catch (e) {
           console.error("Failed to extract metadata for", book.filePath, e);
        }
      }
    };
    processBooks();
  }, [books, processedFiles, onMetadataExtracted]);
  
  const processPdf = async (filePath: string, base64: string) => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const metadata = await doc.getMetadata();
      
      let title = (metadata?.info as any)?.Title || undefined;
      let author = (metadata?.info as any)?.Author || undefined;

      // Render first page for cover
      try {
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Target width of ~400px for a good quality thumbnail
        const scale = Math.min(400 / viewport.width, 1.0);
        const scaledViewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            await page.render({ canvasContext: context, viewport: scaledViewport, canvas }).promise;
            const coverImage = canvas.toDataURL('image/jpeg', 0.8);
            
            await window.dbApi.updateMetadata(filePath, { title, author, coverImage });
            return;
        }
      } catch (e) {
        console.error("Failed to generate PDF cover", e);
      }

      // If cover generation failed, just save title and author
      await window.dbApi.updateMetadata(filePath, { title, author });
  };

  const processEpub = async (filePath: string, base64: string) => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const book = Epub(bytes.buffer);
      await book.ready;
      
      let title = undefined;
      let author = undefined;
      
      const meta = await book.loaded.metadata;
      if (meta) {
        title = meta.title;
        author = meta.creator;
      }

      let coverImage = undefined;
      const coverUrl = await book.coverUrl();
      if (coverUrl) {
         try {
             // coverUrl from epubjs is usually a blob URL in browser
             const response = await fetch(coverUrl);
             const blob = await response.blob();
             const reader = new FileReader();
             coverImage = await new Promise<string>((resolve) => {
                 reader.onloadend = () => resolve(reader.result as string);
                 reader.readAsDataURL(blob);
             });
         } catch(e) {
            console.error("Failed to load epub cover blob", e);
         }
      }

      await window.dbApi.updateMetadata(filePath, { title, author, coverImage });
  };

  return null;
};

export default MetadataExtractor;
