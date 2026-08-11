# Implementation Plan: Offline PDF & E-Book Reader (Phase 1 Sub-stages)

This plan outlines Phase 1 of the advanced offline PDF and e-book reader, broken down into manageable, sequential sub-stages. As requested, local OCR has been excluded for now. We will tackle this project sub-stage by sub-stage, ensuring each piece is robust before moving on.

## Phase 1 Sub-Stages

### Sub-Stage 1.1: Core Setup & PDF Rendering
*   **Electron Shell Setup:** Initialize the Electron app with a modern front-end setup (e.g., React + Vite for high-performance, dynamic UI).
*   **Basic UI Layout:** Create the foundational layout (Sidebar for navigation, main canvas for reading).
*   **PDF.js Integration:** Implement the core PDF rendering engine for standard PDFs.
*   **Basic Navigation:** Add page turning, scrolling, and basic zoom controls.

### Sub-Stage 1.2: Expanded Formats & Custom Typography
*   **Multi-Format Engine:** Integrate support for EPUB and MOBI (e.g., using `epub.js`).
*   **Custom Typography:** Add controls to change font family, font size, line height, and text alignment for reflowable formats.
*   **Reading Modes:** Implement continuous vertical scrolling, horizontal two-page spread, and full-screen presentation mode.
*   **Progress Tracking:** Add visual progress bars and ensure the app remembers the exact page/scroll position upon closing.

### Sub-Stage 1.3: Local Library Hub & File Management
*   **Local Directory Scanner:** Build a background process to scan specified Windows folders for supported book files.
*   **Metadata Extraction:** Extract Title, Author, and Cover Images from PDF and EPUB files locally.
*   **Bookshelf UI:** Create a visually appealing grid and list view for the library, organized by author, series, and recent reads.
*   **Metadata Management:** Allow users to manually edit book metadata and swap cover images locally.
*   **Collections & Tags:** Enable users to create custom "shelves" or apply tags for granular organization.

### Sub-Stage 1.4: Customization, Stats & Accessibility
*   **Advanced Theming:** Implement true dark mode, sepia, customizable background colors, and a blue-light filtering option.
*   **Reading Statistics:** Track time spent reading, reading speed (WPM), and estimated time to finish the book.
*   **Focus Mode & Timers:** Add a built-in Pomodoro timer to encourage distraction-free reading.
*   **Custom Keybindings:** Allow users to map keyboard shortcuts for high-speed navigation.
*   **Accessibility:** Integrate offline Text-to-Speech (TTS) using native Windows APIs and OpenDyslexic font support.

### Sub-Stage 1.5: Native Text Interaction & Annotation
*   **Smart Selection:** Ensure smooth click-and-drag text selection across all formats.
*   **Multi-Color Highlighting:** Implement highlighting, underlining, and strikethrough in customizable colors.
*   **Sticky Notes:** Allow users to attach pop-up text boxes to highlighted text, minimized as margin icons.
*   **Annotation Export:** Create a centralized panel to export all highlights and notes to a local Markdown (.md) or text (.txt) file.
*   **Offline Dictionary:** Integrate with local dictionary databases (e.g., StarDict format) to define words on double-click.
*   **Citation Generator:** Automatically generate academic citations (APA, MLA, Chicago) for highlighted text.

## Verification Plan

### Automated Tests
- Test that the Electron main process communicates efficiently with the renderer process for local file access.
- Verify core reading engines render documents without blocking the UI thread.

### Manual Verification
- After completing each sub-stage, we will manually test the new features (e.g., opening a PDF in 1.1, changing fonts in 1.2, scanning a folder in 1.3) before moving to the next phase to ensure stability and premium feel.
