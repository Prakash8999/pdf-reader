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
  author: string | null;
  cover_image: string | null;
  tags: string | null;
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

  try { db.exec(`ALTER TABLE pdf_files ADD COLUMN last_location TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE pdf_files ADD COLUMN author TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE pdf_files ADD COLUMN cover_image TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE pdf_files ADD COLUMN tags TEXT;`); } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);

  // Pre-populate default categories
  const defaultCategories = [
    'Fiction', 'Non-Fiction', 'Science', 'Technology', 
    'Business', 'Self-Help', 'Fantasy', 'Mystery', 
    'History', 'Philosophy', 'Sci-Fi', 'Romance'
  ];
  
  const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`);
  const insertMany = db.transaction((cats) => {
    for (const cat of cats) insertCat.run(cat);
  });
  insertMany(defaultCategories);

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

export function updateMetadata(filePath: string, metadata: { title?: string, author?: string, coverImage?: string, tags?: string }): void {
  const sets = [];
  const values = [];
  if (metadata.title !== undefined) { sets.push('title = ?'); values.push(metadata.title); }
  if (metadata.author !== undefined) { sets.push('author = ?'); values.push(metadata.author); }
  if (metadata.coverImage !== undefined) { sets.push('cover_image = ?'); values.push(metadata.coverImage); }
  if (metadata.tags !== undefined) { 
    sets.push('tags = ?'); 
    values.push(metadata.tags); 
    
    const tagsArr = metadata.tags.split(',').map(t => t.trim()).filter(Boolean);
    const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`);
    const insertMany = db.transaction((cats) => {
      for (const cat of cats) insertCat.run(cat);
    });
    insertMany(tagsArr);
  }
  
  if (sets.length === 0) return;
  
  values.push(filePath);
  const stmt = db.prepare(`
    UPDATE pdf_files
    SET ${sets.join(', ')}
    WHERE file_path = ?
  `);
  stmt.run(...values);
}

export function getAllCategories(): string[] {
  const stmt = db.prepare(`SELECT name FROM categories ORDER BY name ASC`);
  return stmt.all().map((row: any) => row.name);
}

export function searchLibrary(searchQuery: string, selectedTags: string[]): PdfFile[] {
  let query = `SELECT * FROM pdf_files WHERE 1=1`;
  const params: any[] = [];

  if (searchQuery) {
    query += ` AND (title LIKE ? OR author LIKE ?)`;
    const term = `%${searchQuery}%`;
    params.push(term, term);
  }

  if (selectedTags && selectedTags.length > 0) {
    selectedTags.forEach(tag => {
      query += ` AND tags LIKE ?`;
      params.push(`%${tag}%`);
    });
  }

  query += ` ORDER BY last_opened_at DESC`;
  const stmt = db.prepare(query);
  return stmt.all(...params) as PdfFile[];
}

export function deletePdf(filePath: string): void {
  const stmt = db.prepare(`DELETE FROM pdf_files WHERE file_path = ?`);
  stmt.run(filePath);
}
