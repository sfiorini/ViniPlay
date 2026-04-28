const DEFAULT_SQLITE_BUSY_TIMEOUT_MS = 5000;

function configureSqliteDatabase(db, options = {}) {
  const {
    busyTimeoutMs = DEFAULT_SQLITE_BUSY_TIMEOUT_MS,
    enableWal = true,
    logger = console
  } = options;

  if (db && typeof db.configure === 'function') {
    db.configure('busyTimeout', busyTimeoutMs);
  }

  if (enableWal && db && typeof db.exec === 'function') {
    db.exec('PRAGMA journal_mode = WAL;', (err) => {
      if (err && logger && typeof logger.warn === 'function') {
        logger.warn('[DB] Could not enable SQLite WAL mode:', err.message);
      }
    });
  }

  return db;
}

module.exports = {
  DEFAULT_SQLITE_BUSY_TIMEOUT_MS,
  configureSqliteDatabase
};
