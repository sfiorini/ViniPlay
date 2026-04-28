const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function onRun(err) {
    err ? reject(err) : resolve(this);
  }));
}

function close(db) {
  return new Promise((resolve, reject) => db.close(err => err ? reject(err) : resolve()));
}

describe('SQLite runtime configuration', () => {
  it('configures a busy timeout and WAL mode on a database connection', () => {
    const calls = [];
    const db = {
      configure: (key, value) => calls.push(['configure', key, value]),
      exec: (sql, cb) => {
        calls.push(['exec', sql]);
        cb(null);
      }
    };

    const { configureSqliteDatabase, DEFAULT_SQLITE_BUSY_TIMEOUT_MS } = require('../../lib/sqliteConfig');
    configureSqliteDatabase(db);

    expect(calls).toContainEqual(['configure', 'busyTimeout', DEFAULT_SQLITE_BUSY_TIMEOUT_MS]);
    expect(calls).toContainEqual(['exec', 'PRAGMA journal_mode = WAL;']);
  });

  it('waits for a short writer lock instead of immediately failing with SQLITE_BUSY', async () => {
    const { configureSqliteDatabase } = require('../../lib/sqliteConfig');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viniplay-sqlite-busy-'));
    const dbPath = path.join(tmpDir, 'busy.db');
    const locker = new sqlite3.Database(dbPath);
    const writer = new sqlite3.Database(dbPath);

    try {
      configureSqliteDatabase(writer, { busyTimeoutMs: 500, enableWal: false });
      await run(locker, 'CREATE TABLE IF NOT EXISTS writes (id INTEGER PRIMARY KEY, value TEXT)');
      await run(locker, 'BEGIN EXCLUSIVE');

      const writeAttempt = run(writer, 'INSERT INTO writes (value) VALUES (?)', ['after-lock']);
      setTimeout(() => {
        locker.run('COMMIT');
      }, 75);

      await expect(writeAttempt).resolves.toBeTruthy();
    } finally {
      await close(locker).catch(() => {});
      await close(writer).catch(() => {});
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
