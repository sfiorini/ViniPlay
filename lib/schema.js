function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function initializeSchema(db) {
  await run(db, `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    isAdmin INTEGER DEFAULT 0,
    canUseDvr INTEGER DEFAULT 0,
    allowed_sources TEXT
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, key)
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS dvr_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    channelId TEXT NOT NULL,
    channelName TEXT NOT NULL,
    programTitle TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    status TEXT NOT NULL,
    ffmpeg_pid INTEGER,
    filePath TEXT,
    profileId TEXT,
    userAgentId TEXT,
    preBufferMinutes INTEGER,
    postBufferMinutes INTEGER,
    errorMessage TEXT,
    isConflicting INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS stream_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    channel_id TEXT,
    channel_name TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_seconds INTEGER,
    status TEXT NOT NULL,
    client_ip TEXT,
    channel_logo TEXT,
    stream_profile_name TEXT
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS timeshift_channels (
    channel_id TEXT PRIMARY KEY,
    channel_name TEXT NOT NULL,
    max_duration_hours INTEGER DEFAULT 3,
    is_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = { initializeSchema };
