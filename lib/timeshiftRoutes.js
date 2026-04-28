function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function onRun(err) {
    if (err) reject(err);
    else resolve(this);
  }));
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Authentication required' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Authentication required' });
  if (!req.session?.isAdmin) return res.status(403).json({ error: 'Admin required' });
  next();
}

function validChannelId(channelId) {
  return typeof channelId === 'string'
    && /^[A-Za-z0-9_.:-]+$/.test(channelId)
    && !channelId.includes('..')
    && !channelId.includes('/')
    && !channelId.includes('\\');
}

function validChannelName(channelName) {
  return typeof channelName === 'string' && channelName.trim().length > 0;
}

function validDuration(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 && number <= 24;
}

function validSegmentName(segment) {
  return typeof segment === 'string'
    && /^segment_\d+\.ts$/.test(segment)
    && !segment.includes('..')
    && !segment.includes('/')
    && !segment.includes('\\');
}

function registerTimeshiftRoutes(app, deps) {
  const { db, engine, fs, path, timeshiftDir } = deps;

  app.use('/api/timeshift/stream', requireAuth, (req, res, next) => {
    if (decodeURIComponent(req.path).includes('..')) {
      return res.status(400).json({ error: 'Invalid timeshift path' });
    }
    next();
  });

  app.get('/api/timeshift/channels', requireAdmin, async (_req, res) => {
    const rows = await dbAll(db, 'SELECT * FROM timeshift_channels ORDER BY channel_name', []);
    res.json(rows);
  });

  app.post('/api/timeshift/channels', requireAdmin, async (req, res) => {
    const { channelId, channelName } = req.body;
    const maxDurationHours = Number(req.body.maxDurationHours ?? 3);
    const isEnabled = req.body.isEnabled === undefined ? true : !!req.body.isEnabled;
    if (!validChannelId(channelId) || !validChannelName(channelName) || !validDuration(maxDurationHours)) {
      return res.status(400).json({ error: 'Invalid timeshift channel configuration' });
    }
    await dbRun(db, `INSERT OR REPLACE INTO timeshift_channels (channel_id, channel_name, max_duration_hours, is_enabled, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, [channelId, channelName.trim(), maxDurationHours, isEnabled ? 1 : 0]);
    if (isEnabled) engine.start(channelId, channelName.trim());
    else engine.stop(channelId);
    res.json({ success: true });
  });

  app.put('/api/timeshift/channels/:channelId', requireAdmin, async (req, res) => {
    const channelId = req.params.channelId;
    const { channelName } = req.body;
    const maxDurationHours = Number(req.body.maxDurationHours ?? 3);
    const isEnabled = req.body.isEnabled === undefined ? true : !!req.body.isEnabled;
    if (!validChannelId(channelId) || !validChannelName(channelName) || !validDuration(maxDurationHours)) {
      return res.status(400).json({ error: 'Invalid timeshift channel configuration' });
    }
    await dbRun(db, `INSERT OR REPLACE INTO timeshift_channels (channel_id, channel_name, max_duration_hours, is_enabled, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, [channelId, channelName.trim(), maxDurationHours, isEnabled ? 1 : 0]);
    if (isEnabled) engine.start(channelId, channelName.trim());
    else engine.stop(channelId);
    res.json({ success: true });
  });

  app.delete('/api/timeshift/channels/:channelId', requireAdmin, async (req, res) => {
    const { channelId } = req.params;
    if (!validChannelId(channelId)) return res.status(400).json({ error: 'Invalid channel id' });
    engine.stop(channelId);
    await dbRun(db, 'DELETE FROM timeshift_channels WHERE channel_id = ?', [channelId]);
    res.json({ success: true });
  });

  app.get('/api/timeshift/status', requireAdmin, (_req, res) => {
    res.json(engine.status());
  });

  app.get('/api/timeshift/info/:channelId', requireAuth, async (req, res) => {
    const { channelId } = req.params;
    if (!validChannelId(channelId)) return res.status(400).json({ error: 'Invalid channel id' });
    const row = await dbGet(db, 'SELECT * FROM timeshift_channels WHERE channel_id = ?', [channelId]);
    const active = engine.status().some(item => item.channelId === channelId);
    res.json({ enabled: !!row?.is_enabled, recording: active, channel: row || null });
  });

  app.get('/api/timeshift/stream/:channelId/playlist.m3u8', requireAuth, (req, res) => {
    const { channelId } = req.params;
    if (!validChannelId(channelId)) return res.status(400).json({ error: 'Invalid channel id' });
    const playlistPath = path.join(timeshiftDir, channelId, 'playlist.m3u8');
    if (!fs.existsSync(playlistPath)) return res.status(404).send('Playlist not found');
    res.sendFile(playlistPath);
  });

  app.get('/api/timeshift/stream/:channelId/:segment', requireAuth, (req, res) => {
    const { channelId, segment } = req.params;
    if (!validChannelId(channelId) || !validSegmentName(segment)) {
      return res.status(400).json({ error: 'Invalid segment path' });
    }
    const segmentPath = path.join(timeshiftDir, channelId, segment);
    if (!fs.existsSync(segmentPath)) return res.status(404).send('Segment not found');
    res.sendFile(segmentPath);
  });
}

module.exports = { registerTimeshiftRoutes };
