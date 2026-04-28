function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
  });
}

function segmentNumber(file) {
  const match = file.match(/segment_(\d+)\.ts$/);
  return match ? Number(match[1]) : null;
}

function createTimeshiftEngine(deps) {
  const {
    db,
    fs,
    path,
    spawn,
    parseM3U,
    getSettings,
    liveChannelsPath,
    timeshiftDir,
    setTimeout = global.setTimeout
  } = deps;
  const active = new Map();
  const intentionallyStopped = new Set();

  function channelDir(channelId) {
    return path.join(timeshiftDir, channelId);
  }

  function getUserAgent(settings) {
    const activeUserAgentId = settings.activeUserAgentId;
    return settings.userAgents?.find(ua => ua.id === activeUserAgentId)?.value || 'ViniPlay';
  }

  function readChannels() {
    if (!fs.existsSync(liveChannelsPath)) return [];
    return parseM3U(fs.readFileSync(liveChannelsPath, 'utf8'));
  }

  async function isEnabled(channelId) {
    const row = await dbGet(db, 'SELECT is_enabled FROM timeshift_channels WHERE channel_id = ?', [channelId]);
    return !!row?.is_enabled;
  }

  async function start(channelId, channelName) {
    if (active.has(channelId)) return active.get(channelId).proc;

    const channels = readChannels();
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return null;

    const settings = getSettings();
    const timeshift = settings.timeshift || {};
    const dir = channelDir(channelId);
    fs.mkdirSync(dir, { recursive: true });

    const segmentPattern = path.join(dir, 'segment_%08d.ts');
    const playlistPath = path.join(dir, 'playlist.m3u8');
    const args = [
      '-user_agent', getUserAgent(settings),
      '-i', channel.url,
      '-c', 'copy',
      '-f', 'hls',
      '-hls_time', String(timeshift.segmentDurationSeconds || 6),
      '-hls_list_size', String(timeshift.hlsListSize ?? 0),
      '-hls_segment_filename', segmentPattern,
      playlistPath
    ];

    intentionallyStopped.delete(channelId);
    const proc = spawn('ffmpeg', args);
    active.set(channelId, { channelId, channelName, proc, startedAt: new Date().toISOString() });

    proc.stderr?.on?.('data', () => {});
    proc.on('exit', () => {
      active.delete(channelId);
      if (intentionallyStopped.has(channelId)) {
        intentionallyStopped.delete(channelId);
        return;
      }
      setTimeout(async () => {
        if (await isEnabled(channelId)) {
          await start(channelId, channelName);
        }
      }, 1000);
    });

    return proc;
  }

  function stop(channelId) {
    const entry = active.get(channelId);
    if (!entry) return;
    intentionallyStopped.add(channelId);
    entry.proc.kill();
    active.delete(channelId);
  }

  function status() {
    return Array.from(active.values()).map(({ channelId, channelName, startedAt }) => ({ channelId, channelName, startedAt }));
  }

  async function initialize() {
    const rows = await dbAll(db, 'SELECT channel_id, channel_name FROM timeshift_channels WHERE is_enabled = 1', []);
    for (const row of rows) {
      await start(row.channel_id, row.channel_name);
    }
  }

  function shutdown() {
    for (const channelId of Array.from(active.keys())) {
      stop(channelId);
    }
  }

  function regeneratePlaylist(channelId) {
    const settings = getSettings();
    const duration = settings.timeshift?.segmentDurationSeconds || 6;
    const dir = channelDir(channelId);
    const segments = fs.readdirSync(dir)
      .filter(file => segmentNumber(file) !== null)
      .sort((a, b) => segmentNumber(a) - segmentNumber(b));
    const firstSequence = segments.length ? segmentNumber(segments[0]) : 0;
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      `#EXT-X-TARGETDURATION:${duration}`,
      `#EXT-X-MEDIA-SEQUENCE:${firstSequence}`
    ];
    for (const segment of segments) {
      lines.push(`#EXTINF:${duration.toFixed(3)},`, segment);
    }
    fs.writeFileSync(path.join(dir, 'playlist.m3u8'), `${lines.join('\n')}\n`);
  }

  function cleanupSegments(channelId, maxDurationHours, safetyBufferMinutes = 10) {
    const dir = channelDir(channelId);
    const cutoffMs = Date.now() - ((maxDurationHours * 60 + safetyBufferMinutes) * 60 * 1000);
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.ts')) continue;
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).mtimeMs < cutoffMs) {
        fs.unlinkSync(filePath);
      }
    }
    regeneratePlaylist(channelId);
  }

  async function runCleanup() {
    const rows = await dbAll(db, 'SELECT channel_id, max_duration_hours FROM timeshift_channels WHERE is_enabled = 1', []);
    const settings = getSettings();
    for (const row of rows) {
      cleanupSegments(row.channel_id, row.max_duration_hours, settings.timeshift?.safetyBufferMinutes || 10);
    }
  }

  return { start, stop, status, initialize, shutdown, cleanupSegments, regeneratePlaylist, runCleanup };
}

module.exports = { createTimeshiftEngine };
