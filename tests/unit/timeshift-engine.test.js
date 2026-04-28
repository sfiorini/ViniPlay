const path = require('path');
const EventEmitter = require('events');

function fakeProcess() {
  const proc = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  return proc;
}

function fakeEngineDeps(overrides = {}) {
  const proc = fakeProcess();
  return {
    db: { get: (_sql, _params, cb) => cb(null, { is_enabled: 1 }), all: (_sql, _params, cb) => cb(null, []) },
    fs: { existsSync: () => true, mkdirSync: vi.fn(), readFileSync: () => '#EXTM3U', readdirSync: () => [] },
    path,
    spawn: vi.fn(() => proc),
    parseM3U: () => [{ id: 'c1', url: 'http://provider/live.ts' }],
    getSettings: () => ({ activeUserAgentId: 'ua1', userAgents: [{ id: 'ua1', value: 'UA' }], timeshift: { segmentDurationSeconds: 6, safetyBufferMinutes: 10, hlsListSize: 0 } }),
    liveChannelsPath: '/data/live_channels.m3u',
    timeshiftDir: '/data/timeshift',
    setTimeout: vi.fn(fn => fn()),
    proc,
    ...overrides
  };
}

describe('timeshift engine', () => {
  it('does not start a duplicate process for the same channel', async () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const deps = fakeEngineDeps();
    const engine = createTimeshiftEngine(deps);
    await engine.start('c1', 'Channel 1');
    await engine.start('c1', 'Channel 1');
    expect(deps.spawn).toHaveBeenCalledTimes(1);
  });

  it('does not spawn when the channel is missing from parsed M3U', async () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const deps = fakeEngineDeps({ parseM3U: () => [] });
    const engine = createTimeshiftEngine(deps);
    await engine.start('missing', 'Missing');
    expect(deps.spawn).not.toHaveBeenCalled();
  });

  it('creates the channel HLS directory and spawns ffmpeg with HLS args', async () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const deps = fakeEngineDeps();
    const engine = createTimeshiftEngine(deps);
    await engine.start('c1', 'Channel 1');
    expect(deps.fs.mkdirSync).toHaveBeenCalledWith('/data/timeshift/c1', { recursive: true });
    const args = deps.spawn.mock.calls[0][1];
    expect(args).toEqual(expect.arrayContaining(['-f', 'hls', '-hls_time', '6']));
    expect(args).toContain('/data/timeshift/c1/playlist.m3u8');
    expect(args).toContain('/data/timeshift/c1/segment_%08d.ts');
  });

  it('stop kills the process and removes active status', async () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const deps = fakeEngineDeps();
    const engine = createTimeshiftEngine(deps);
    await engine.start('c1', 'Channel 1');
    engine.stop('c1');
    expect(deps.proc.kill).toHaveBeenCalled();
    expect(engine.status()).toEqual([]);
  });

  it('unexpected exit schedules restart only when DB still marks the channel enabled', async () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const firstProc = fakeProcess();
    const secondProc = fakeProcess();
    const deps = fakeEngineDeps({ spawn: vi.fn().mockReturnValueOnce(firstProc).mockReturnValueOnce(secondProc) });
    const engine = createTimeshiftEngine(deps);
    await engine.start('c1', 'Channel 1');
    firstProc.emit('exit', 1);
    await Promise.resolve();
    await Promise.resolve();
    expect(deps.setTimeout).toHaveBeenCalled();
    expect(deps.spawn).toHaveBeenCalledTimes(2);
  });

  it('disabled channel exit does not restart', async () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const deps = fakeEngineDeps({ db: { get: (_sql, _params, cb) => cb(null, { is_enabled: 0 }), all: (_sql, _params, cb) => cb(null, []) } });
    const engine = createTimeshiftEngine(deps);
    await engine.start('c1', 'Channel 1');
    deps.proc.emit('exit', 1);
    await Promise.resolve();
    expect(deps.spawn).toHaveBeenCalledTimes(1);
  });

  it('shutdown stops all active processes', async () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const proc1 = fakeProcess();
    const proc2 = fakeProcess();
    const deps = fakeEngineDeps({
      spawn: vi.fn().mockReturnValueOnce(proc1).mockReturnValueOnce(proc2),
      parseM3U: () => [{ id: 'c1', url: 'http://provider/1.ts' }, { id: 'c2', url: 'http://provider/2.ts' }]
    });
    const engine = createTimeshiftEngine(deps);
    await engine.start('c1', 'Channel 1');
    await engine.start('c2', 'Channel 2');
    engine.shutdown();
    expect(proc1.kill).toHaveBeenCalled();
    expect(proc2.kill).toHaveBeenCalled();
    expect(engine.status()).toEqual([]);
  });
});
