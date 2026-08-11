# Master Implementation Plan: Offline PDF & E-Book Reader (Phase 1 Enhancements)

This plan outlines the extended features for Phase 1 of the advanced offline PDF and e-book reader, incorporating the core requirements and adding additional power-user features.

## Proposed Changes: Phase 1 (The Advanced Reader)

This phase focuses entirely on consumption, library management, and non-destructive study tools, prioritizing a fast, bloat-free experience. New features are marked with **[NEW]**.

### 1. Universal Format Support & Library Management
*   **Multi-Format Engine:** Support for standard PDFs alongside EPUB, MOBI, AZW3 (Kindle format), comic book archives (CBZ/CBR), XPS, DjVu, and CHM.
*   **Local Library Hub:** A bookshelf interface that automatically scans local Windows directories to organize books by author, series, format, and recent reads.
*   **Progress Tracking:** Visual progress bars for each book, remembering the exact page and scroll position.
*   **[NEW] Metadata Management:** Ability to manually edit book metadata (Title, Author, Tags) and replace cover images locally.
*   **[NEW] Advanced Search & Indexing:** Offline full-text search across the entire library using a local index (e.g., SQLite or Lunr.js).
*   **[NEW] Custom Collections & Tags:** Organize books into custom "shelves" or apply multiple tags for granular sorting.

### 2. Distraction-Free & Customizable UI
*   **Custom Typography:** Change font family, font size, line height, and text alignment for reflowable formats.
*   **Advanced Theming:** True dark mode, sepia, customizable background colors, and a blue-light filtering option.
*   **Reading Modes:** Continuous vertical scrolling, horizontal two-page spread, and full-screen presentation mode.
*   **Custom Keybindings:** Map keyboard shortcuts for high-speed navigation and tool switching.
*   **[NEW] Reading Statistics & Insights:** Track time spent reading, reading speed (WPM), and estimated time to finish the current chapter or book.
*   **[NEW] Focus Mode & Pomodoro Timer:** Built-in study timers to encourage distraction-free reading sessions.
*   **[NEW] Accessibility Suite:** Integrated offline Text-to-Speech (TTS) using native Windows APIs, and OpenDyslexic font support.

### 3. Native Text Interaction & Annotation
*   **Smart Selection:** Click and drag to select native text smoothly.
*   **Multi-Color Highlighting:** Highlight, underline, or apply a strikethrough in customizable colors.
*   **Sticky Notes & Margin Comments:** Attach pop-up text boxes for study notes, minimized as margin icons.
*   **Annotation Export:** Centralized panel to export all highlights and notes to a local Markdown (.md) or text (.txt) file.
*   **[NEW] Offline Dictionary:** Integration with local dictionary databases (e.g., StarDict format) to define words on double-click without internet access.
*   **[NEW] Citation Generator:** Automatically generate academic citations (APA, MLA, Chicago) for highlighted text.
*   **[NEW] Image Extraction:** Right-click to extract and save high-quality images directly from native PDFs and EPUBs.

### 4. Phase 1 Final Sub-Phase: Local OCR (PaddleOCR Integration)
*   **On-Demand Text Extraction:** Extract text from scanned PDFs or comic books via PaddleOCR offline.
*   **Invisible Text Overlays:** Map coordinates of words and place invisible, selectable text over images.
*   **OCR Export:** Export OCR results as a brand new, searchable PDF or plain text document.
*   **[NEW] Background Batch Processing:** Queue up multiple scanned books to process OCR in the background without interrupting the reading experience.
*   **[NEW] Multi-Language Models:** Support for installing multiple local PaddleOCR language models for multi-lingual text extraction.

## Verification Plan

### Automated Tests
- Ensure core reading engine renders PDF and EPUB without blocking the main Electron thread.
- Verify local file scanning and indexing performance for the library hub.

### Manual Verification
- Test library scanning with large folders of assorted formats.
- Verify annotation bounding boxes match selected text.
- Test PaddleOCR integration speed and text overlay accuracy on sample scanned documents.
