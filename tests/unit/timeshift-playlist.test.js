const path = require('path');

function fakeSegmentFs(files, writes, options = {}) {
  const removed = [];
  return {
    existsSync: () => true,
    readdirSync: () => files.filter(file => !removed.includes(file)),
    writeFileSync: (file, content) => writes.set(file, content),
    statSync: (file) => ({ mtimeMs: options.mtimeMs?.[path.basename(file)] ?? Date.now() }),
    unlinkSync: (file) => removed.push(path.basename(file)),
    removed
  };
}

function fakeDeps(overrides = {}) {
  return {
    db: { all: () => {}, get: () => {} },
    fs: overrides.fs,
    path,
    spawn: () => ({ on: () => {}, stderr: { on: () => {} } }),
    parseM3U: () => [],
    getSettings: () => ({ timeshift: { segmentDurationSeconds: 6, safetyBufferMinutes: 10 } }),
    liveChannelsPath: '/live.m3u',
    timeshiftDir: '/timeshift',
    setTimeout: () => {},
    ...overrides
  };
}

describe('timeshift playlist generation', () => {
  it('generates media sequence from first remaining segment number and omits ENDLIST', () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const writes = new Map();
    const fs = fakeSegmentFs(['segment_00000007.ts', 'segment_00000008.ts'], writes);
    const engine = createTimeshiftEngine(fakeDeps({ fs }));
    engine.regeneratePlaylist('chan1');
    const playlist = writes.get('/timeshift/chan1/playlist.m3u8');
    expect(playlist).toContain('#EXT-X-MEDIA-SEQUENCE:7');
    expect(playlist).toContain('#EXT-X-TARGETDURATION:6');
    expect(playlist).not.toContain('#EXT-X-ENDLIST');
  });

  it('deletes only segments older than max duration plus safety buffer', () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const writes = new Map();
    const now = Date.now();
    const fs = fakeSegmentFs(['segment_00000001.ts', 'segment_00000002.ts', 'playlist.m3u8', 'channel.meta'], writes, {
      mtimeMs: {
        'segment_00000001.ts': now - (4 * 60 * 60 * 1000),
        'segment_00000002.ts': now
      }
    });
    const engine = createTimeshiftEngine(fakeDeps({ fs }));
    engine.cleanupSegments('chan1', 3, 10);
    expect(fs.removed).toEqual(['segment_00000001.ts']);
    expect(fs.removed).not.toContain('playlist.m3u8');
    expect(fs.removed).not.toContain('channel.meta');
  });

  it('uses configured target duration', () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const writes = new Map();
    const fs = fakeSegmentFs(['segment_00000001.ts'], writes);
    const engine = createTimeshiftEngine(fakeDeps({
      fs,
      getSettings: () => ({ timeshift: { segmentDurationSeconds: 4, safetyBufferMinutes: 10 } })
    }));
    engine.regeneratePlaylist('chan1');
    expect(writes.get('/timeshift/chan1/playlist.m3u8')).toContain('#EXT-X-TARGETDURATION:4');
  });
});
