/**
 * In-process schema and seed for SQLite (sql.js).
 * Called when DB file does not exist.
 */
const bcrypt = require('bcryptjs');

function runInit(wrappedDb) {
  wrappedDb.exec(`
    CREATE TABLE IF NOT EXISTS User (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'LIBRARIAN', 'TEACHER')), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS Configuration (key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT, updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS FeatureToggle (key TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, description TEXT, updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS Category (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS Member (id INTEGER PRIMARY KEY AUTOINCREMENT, member_type TEXT NOT NULL CHECK (member_type IN ('Student', 'Teacher')), name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, member_id TEXT UNIQUE, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS Book (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT, isbn TEXT, category_id INTEGER, total_copies INTEGER NOT NULL DEFAULT 1, available_copies INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (category_id) REFERENCES Category(id));
    CREATE TABLE IF NOT EXISTS Issue (id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER NOT NULL, member_id INTEGER NOT NULL, issue_date TEXT NOT NULL DEFAULT (date('now')), due_date TEXT, return_date TEXT, renewed INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'ISSUED', fine_amount REAL NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (book_id) REFERENCES Book(id), FOREIGN KEY (member_id) REFERENCES Member(id));
    CREATE TABLE IF NOT EXISTS Fine (id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL, amount REAL NOT NULL DEFAULT 0, paid INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), paid_at TEXT, FOREIGN KEY (issue_id) REFERENCES Issue(id));
    CREATE TABLE IF NOT EXISTS Payment (id INTEGER PRIMARY KEY AUTOINCREMENT, fine_id INTEGER, amount REAL NOT NULL, payment_date TEXT DEFAULT (date('now')), notes TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (fine_id) REFERENCES Fine(id));
    CREATE INDEX IF NOT EXISTS idx_member_type ON Member(member_type);
    CREATE INDEX IF NOT EXISTS idx_book_category ON Book(category_id);
    CREATE INDEX IF NOT EXISTS idx_issue_member ON Issue(member_id);
    CREATE INDEX IF NOT EXISTS idx_issue_book ON Issue(book_id);
    CREATE INDEX IF NOT EXISTS idx_issue_return_date ON Issue(return_date);
    CREATE INDEX IF NOT EXISTS idx_fine_issue ON Fine(issue_id);
  `);
  const defaultConfig = [['max_borrow_days', '14', 'Max borrow days'], ['max_books_per_member', '3', 'Max books per member'], ['fine_per_day', '5', 'Fine per day'], ['grace_period', '0', 'Grace period']];
  defaultConfig.forEach(([k, v, d]) => {
    wrappedDb.prepare('INSERT OR IGNORE INTO Configuration (key, value, description) VALUES (?, ?, ?)').run(k, v, d);
  });
  const defaultFeatures = [['enable_fine', 1, 'Fine'], ['enable_due_date', 1, 'Due date'], ['enable_renewal', 1, 'Renewal'], ['enable_reports', 1, 'Reports'], ['enable_categories', 1, 'Categories'], ['enable_borrow_limit', 1, 'Borrow limit']];
  defaultFeatures.forEach(([k, e, d]) => {
    wrappedDb.prepare('INSERT OR IGNORE INTO FeatureToggle (key, enabled, description) VALUES (?, ?, ?)').run(k, e, d);
  });
  const userCount = wrappedDb.prepare('SELECT COUNT(*) as c FROM User').get();
  if (userCount && userCount.c === 0) {
    // Default admin user
    wrappedDb.prepare('INSERT INTO User (username, password_hash, role) VALUES (?, ?, ?)').run('admin', bcrypt.hashSync('admin123', 10), 'ADMIN');
  }
}

module.exports = { runInit };
