import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';

export interface PdfFile {
  id: number;
  file_path: string;
  title: string | null;
  last_page_read: number;
  last_location: string | null;
  last_opened_at: string;
}

let db: Database.Database;

export function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'pdf-reader.sqlite');
  
  // Ensure the directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS pdf_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      title TEXT,
      last_page_read INTEGER DEFAULT 1,
      last_opened_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec(`ALTER TABLE pdf_files ADD COLUMN last_location TEXT;`);
  } catch (e) {
    // Ignore if column already exists
  }

  console.log(`Database initialized at: ${dbPath}`);
}

export function upsertPdf(filePath: string, title: string | null = null): PdfFile {
  // If it exists, update last_opened_at. If not, insert it.
  const stmt = db.prepare(`
    INSERT INTO pdf_files (file_path, title, last_opened_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(file_path) DO UPDATE SET 
      last_opened_at = CURRENT_TIMESTAMP,
      title = COALESCE(?, pdf_files.title)
    RETURNING *;
  `);
  
  return stmt.get(filePath, title, title) as PdfFile;
}

export function updateLastPageRead(filePath: string, pageNumber: number): void {
  const stmt = db.prepare(`
    UPDATE pdf_files
    SET last_page_read = ?
    WHERE file_path = ?
  `);
  stmt.run(pageNumber, filePath);
}

export function updateLastLocation(filePath: string, location: string): void {
  const stmt = db.prepare(`
    UPDATE pdf_files
    SET last_location = ?
    WHERE file_path = ?
  `);
  stmt.run(location, filePath);
}

export function getLibrary(): PdfFile[] {
  const stmt = db.prepare(`
    SELECT * FROM pdf_files
    ORDER BY last_opened_at DESC
  `);
  return stmt.all() as PdfFile[];
}

export function getPdfState(filePath: string): PdfFile | undefined {
  const stmt = db.prepare(`
    SELECT * FROM pdf_files
    WHERE file_path = ?
  `);
  return stmt.get(filePath) as PdfFile | undefined;
}
