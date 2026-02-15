-- KLMS SQLite Schema (reference; actual init is in init-db.js)
-- Tables: Admin, Configuration, FeatureToggle, Category, Member, Book, Issue, Fine, Payment

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Configuration (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS FeatureToggle (
  key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Member (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_type TEXT NOT NULL CHECK (member_type IN ('Student', 'Teacher')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  member_id TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  category_id INTEGER,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES Category(id)
);

CREATE TABLE IF NOT EXISTS Issue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  issue_date TEXT NOT NULL DEFAULT (date('now')),
  due_date TEXT,
  return_date TEXT,
  renewed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ISSUED',
  fine_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES Book(id),
  FOREIGN KEY (member_id) REFERENCES Member(id)
);

CREATE TABLE IF NOT EXISTS Fine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  paid INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  paid_at TEXT,
  FOREIGN KEY (issue_id) REFERENCES Issue(id)
);

CREATE TABLE IF NOT EXISTS Payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fine_id INTEGER,
  amount REAL NOT NULL,
  payment_date TEXT DEFAULT (date('now')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (fine_id) REFERENCES Fine(id)
);
