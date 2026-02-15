/**
 * KLMS Database Initialization Script (standalone)
 * Run: npm run db:init
 * Uses sql.js (no native build). Creates database/klms.db.
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, '..');
const DB_PATH = path.join(DB_DIR, 'klms.db');

function wrap(db) {
  return {
    exec(sql) { db.run(sql); },
    prepare(sql) {
      return {
        run(...params) {
          db.run(sql, params);
          const r = db.exec('SELECT last_insert_rowid() as id');
          return { lastInsertRowid: r.length && r[0].values.length ? r[0].values[0][0] : 0 };
        },
        get(...params) {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          const out = stmt.step() ? (() => { const row = stmt.get(); const cols = stmt.getColumnNames(); const o = {}; cols.forEach((c, i) => { o[c] = row[i]; }); return o; })() : null;
          stmt.free();
          return out;
        },
        all(...params) {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          const cols = stmt.getColumnNames();
          const rows = [];
          while (stmt.step()) {
            const row = stmt.get();
            const o = {}; cols.forEach((c, i) => { o[c] = row[i]; }); rows.push(o);
          }
          stmt.free();
          return rows;
        },
      };
    },
  };
}

async function main() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const SQL = await initSqlJs({ locateFile: (file) => path.join(__dirname, '../../node_modules/sql.js/dist', file) });
  const db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  const w = wrap(db);

  w.exec(`
    CREATE TABLE IF NOT EXISTS Admin (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
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

  [['max_borrow_days', '14', 'Max borrow days'], ['max_books_per_member', '3', 'Max books per member'], ['fine_per_day', '5', 'Fine per day'], ['grace_period', '0', 'Grace period']].forEach(([k, v, d]) => {
    w.prepare('INSERT OR IGNORE INTO Configuration (key, value, description) VALUES (?, ?, ?)').run(k, v, d);
  });
  [['enable_fine', 1, 'Fine'], ['enable_due_date', 1, 'Due date'], ['enable_renewal', 1, 'Renewal'], ['enable_reports', 1, 'Reports'], ['enable_categories', 1, 'Categories'], ['enable_borrow_limit', 1, 'Borrow limit']].forEach(([k, e, d]) => {
    w.prepare('INSERT OR IGNORE INTO FeatureToggle (key, enabled, description) VALUES (?, ?, ?)').run(k, e, d);
  });
  const adminCount = w.prepare('SELECT COUNT(*) as c FROM Admin').get();
  if (adminCount && adminCount.c === 0) {
    w.prepare('INSERT INTO Admin (username, password_hash) VALUES (?, ?)').run('admin', bcrypt.hashSync('admin123', 10));
    console.log('Default admin created: username=admin, password=admin123');
  }

  const buffer = Buffer.from(db.export());
  fs.writeFileSync(DB_PATH, buffer);
  db.close();
  console.log('Database initialized at:', DB_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
