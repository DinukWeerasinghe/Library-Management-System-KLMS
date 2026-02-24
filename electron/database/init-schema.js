/**
 * In-process schema and seed for SQLite (sql.js).
 * Called when DB file does not exist.
 */
const bcrypt = require('bcryptjs');

function runInit(wrappedDb) {
  wrappedDb.exec(`
    CREATE TABLE IF NOT EXISTS User (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'LIBRARIAN', 'TEACHER')), created_at TEXT DEFAULT (datetime('now', 'localtime')), updated_at TEXT DEFAULT (datetime('now', 'localtime')));
    CREATE TABLE IF NOT EXISTS Configuration (key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT, updated_at TEXT DEFAULT (datetime('now', 'localtime')));
    CREATE TABLE IF NOT EXISTS FeatureToggle (key TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, description TEXT, updated_at TEXT DEFAULT (datetime('now', 'localtime')));
    CREATE TABLE IF NOT EXISTS Category (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT, created_at TEXT DEFAULT (datetime('now', 'localtime')));
    CREATE TABLE IF NOT EXISTS Member (id INTEGER PRIMARY KEY AUTOINCREMENT, member_type TEXT NOT NULL CHECK (member_type IN ('Student', 'Teacher')), name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, member_code TEXT UNIQUE, barcode_path TEXT, registration_date TEXT, expiry_date TEXT, registration_fee_paid REAL, batch_id INTEGER, created_at TEXT DEFAULT (datetime('now', 'localtime')), updated_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (batch_id) REFERENCES ImportBatch(id));
    CREATE TABLE IF NOT EXISTS Book (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT, isbn TEXT, category_id INTEGER, external_code TEXT, internal_code TEXT, barcode_path TEXT, total_copies INTEGER NOT NULL DEFAULT 1, available_copies INTEGER NOT NULL DEFAULT 1, batch_id INTEGER, created_at TEXT DEFAULT (datetime('now', 'localtime')), updated_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (category_id) REFERENCES Category(id), FOREIGN KEY (batch_id) REFERENCES ImportBatch(id));
    CREATE TABLE IF NOT EXISTS ImportBatch (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL CHECK (type IN ('BOOK', 'MEMBER')), row_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now', 'localtime')));
    CREATE TABLE IF NOT EXISTS Issue (id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER NOT NULL, member_id INTEGER NOT NULL, issue_date TEXT NOT NULL DEFAULT (date('now', 'localtime')), due_date TEXT, return_date TEXT, renewed INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'ISSUED', fine_amount REAL NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (book_id) REFERENCES Book(id), FOREIGN KEY (member_id) REFERENCES Member(id));
    CREATE TABLE IF NOT EXISTS Fine (id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL, amount REAL NOT NULL DEFAULT 0, paid INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now', 'localtime')), paid_at TEXT, FOREIGN KEY (issue_id) REFERENCES Issue(id));
    CREATE TABLE IF NOT EXISTS Payment (id INTEGER PRIMARY KEY AUTOINCREMENT, fine_id INTEGER, amount REAL NOT NULL, payment_date TEXT DEFAULT (date('now', 'localtime')), notes TEXT, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (fine_id) REFERENCES Fine(id));
    CREATE TABLE IF NOT EXISTS SessionLog (session_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, login_time TEXT NOT NULL, logout_time TEXT, status TEXT CHECK (status IN ('ACTIVE', 'LOCKED', 'CLOSED')) DEFAULT 'ACTIVE', FOREIGN KEY (user_id) REFERENCES User(id));
    CREATE TABLE IF NOT EXISTS ActivityLog (activity_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, action_type TEXT NOT NULL, description TEXT, timestamp TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (user_id) REFERENCES User(id));
    CREATE INDEX IF NOT EXISTS idx_member_type ON Member(member_type);
    CREATE INDEX IF NOT EXISTS idx_book_category ON Book(category_id);
    CREATE INDEX IF NOT EXISTS idx_issue_member ON Issue(member_id);
    CREATE INDEX IF NOT EXISTS idx_issue_book ON Issue(book_id);
    CREATE INDEX IF NOT EXISTS idx_issue_return_date ON Issue(return_date);
    CREATE INDEX IF NOT EXISTS idx_fine_issue ON Fine(issue_id);
    CREATE INDEX IF NOT EXISTS idx_session_user ON SessionLog(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON ActivityLog(user_id);
  `);
  const defaultConfig = [
    ['max_borrow_days', '14', 'Max borrow days'],
    ['max_books_per_member', '3', 'Max books per member'],
    ['fine_per_day', '5', 'Fine per day'],
    ['grace_period', '0', 'Grace period'],
    ['primary_color', '#4f46e5', 'Primary theme color'],
    ['secondary_color', '#64748b', 'Secondary theme color'],
    ['sidebar_color', '#111827', 'Sidebar background color'],
    ['button_color', '#4f46e5', 'Primary button color'],
    ['button_hover_color', '#4338ca', 'Primary button hover color'],
    ['header_text_color', '#ffffff', 'Header text color'],
    ['background_color', '#0f172a', 'Application background color'],
    ['school_name', 'Kumaradasa Library Management System', 'Name of the library/school'],
    ['school_logo', '', 'Base64 or path to school logo'],
    ['registration_fee', '0', 'Member registration fee'],
    ['exit_pin_enabled', '0', 'Enable Exit PIN Security'],
    ['exit_pin', '1234', 'Application Exit PIN'],
    ['lock_enabled', '0', 'Enable Session Auto Lock'],
    ['lock_timeout_minutes', '5', 'Inactivity timeout in minutes'],
    ['lock_pin', '1111', 'Session Lock PIN'],
    ['license_status', 'TRIAL', 'Current license status'],
    ['license_key', '', 'Activated license key'],
    ['installation_date', new Date().toISOString(), 'Date of first installation'],
    ['machine_id', '', 'Locked machine hardware ID']
  ];
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
