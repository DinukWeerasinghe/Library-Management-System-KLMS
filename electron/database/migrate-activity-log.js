/**
 * Migration to add SessionLog and ActivityLog tables.
 */
const { getDatabase } = require('./connection');

function runActivityLogMigration() {
    const db = getDatabase();

    db.exec(`
    CREATE TABLE IF NOT EXISTS SessionLog (
      session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      login_time TEXT NOT NULL,
      logout_time TEXT,
      status TEXT CHECK (status IN ('ACTIVE', 'LOCKED', 'CLOSED')) DEFAULT 'ACTIVE',
      FOREIGN KEY (user_id) REFERENCES User(id)
    );

    CREATE TABLE IF NOT EXISTS ActivityLog (
      activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      description TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES User(id)
    );

    CREATE INDEX IF NOT EXISTS idx_session_user ON SessionLog(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON ActivityLog(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON ActivityLog(timestamp);
  `);

    console.log('Activity Log migration completed.');
}

module.exports = { runActivityLogMigration };
