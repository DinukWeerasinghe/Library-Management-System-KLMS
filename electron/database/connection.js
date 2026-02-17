/**
 * KLMS Database Connection Layer
 * Uses sql.js (no native build). Singleton DB with file persistence.
 */
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;
let SQL = null;
let initPromise = null;

function getDbPath() {
  if (typeof app !== 'undefined' && app && !app.isPackaged) {
    return path.join(__dirname, '../../database/klms.db');
  }
  if (typeof app !== 'undefined' && app) {
    return path.join(app.getPath('userData'), 'klms.db');
  }
  return path.join(__dirname, '../../database/klms.db');
}

/**
 * Expose better-sqlite3-like API over sql.js for minimal code changes.
 */
function wrapDb(nativeDb, onWrite) {
  return {
    exec(sql) {
      nativeDb.run(sql);
      if (onWrite && /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP)/i.test(sql.trim())) onWrite();
    },
    prepare(sql) {
      return {
        run(...params) {
          try {
            nativeDb.run(sql, params);

            // CRITICAL: Fetch metadata BEFORE onWrite (db.export() resets last_insert_rowid)
            const result = nativeDb.exec('SELECT last_insert_rowid() as id, changes() as changes');
            const id = result.length && result[0].values.length ? result[0].values[0][0] : 0;
            const changes = result.length && result[0].values.length ? result[0].values[0][1] : 0;

            if (onWrite) onWrite();

            return { lastInsertRowid: id, changes };
          } catch (e) {
            if (onWrite && /^\s*(INSERT|UPDATE|DELETE)/i.test(sql.trim())) onWrite();
            throw e;
          }
        },
        get(...params) {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(params);
          if (!stmt.step()) return null;
          const row = stmt.get();
          const cols = stmt.getColumnNames();
          const obj = {};
          cols.forEach((c, i) => { obj[c] = row[i]; });
          stmt.free();
          return obj;
        },
        all(...params) {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(params);
          const cols = stmt.getColumnNames();
          const rows = [];
          while (stmt.step()) {
            const row = stmt.get();
            const obj = {};
            cols.forEach((c, i) => { obj[c] = row[i]; });
            rows.push(obj);
          }
          stmt.free();
          return rows;
        },
      };
    },
    run(sql, params = []) {
      nativeDb.run(sql, params);

      const result = nativeDb.exec('SELECT last_insert_rowid() as id, changes() as changes');
      const id = result.length && result[0].values.length ? result[0].values[0][0] : 0;
      const changes = result.length && result[0].values.length ? result[0].values[0][1] : 0;

      if (onWrite && /^\s*(INSERT|UPDATE|DELETE)/i.test(sql.trim())) onWrite();

      return { lastInsertRowid: id, changes };
    },
  };
}

function saveDatabase() {
  if (!db || !SQL) return;
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function ensureDatabaseExists() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const initSqlJs = require('sql.js');
    const wasmPath = path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');
    SQL = await initSqlJs({ locateFile: (file) => path.join(__dirname, '../../node_modules/sql.js/dist', file) });
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
      const { runInit } = require('./init-schema');
      runInit(wrapDb(db, null));
      saveDatabase();
    }
  })();
  return initPromise;
}

function getDatabase() {
  if (!db) throw new Error('Database not initialized. Call ensureDatabaseExists() first.');
  return wrapDb(db, saveDatabase);
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
  SQL = null;
  initPromise = null;
}

module.exports = {
  getDatabase,
  closeDatabase,
  getDbPath,
  ensureDatabaseExists,
  saveDatabase,
};
