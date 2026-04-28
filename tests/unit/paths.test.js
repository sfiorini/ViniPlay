const path = require('path');

function loadSubject() {
  return require('../../lib/paths');
}

describe('resolveRuntimePaths', () => {
  it('uses project-local defaults when no overrides are set', () => {
    const { resolveRuntimePaths } = loadSubject();
    const paths = resolveRuntimePaths({}, '/app');
    expect(paths.DATA_DIR).toBe(path.join('/app', 'data'));
    expect(paths.DVR_DIR).toBe(path.join('/app', 'dvr'));
  });

  it('uses Docker defaults when Docker env vars are set', () => {
    const { resolveRuntimePaths } = loadSubject();
    const paths = resolveRuntimePaths({ DATA_DIR: '/data', DVR_DIR: '/dvr' }, '/app');
    expect(paths.DATA_DIR).toBe('/data');
    expect(paths.DVR_DIR).toBe('/dvr');
  });

  it('uses env overrides for local development', () => {
    const { resolveRuntimePaths } = loadSubject();
    const paths = resolveRuntimePaths({ DATA_DIR: '/tmp/viniplay-data', DVR_DIR: '/tmp/viniplay-dvr' }, '/app');
    expect(paths.DATA_DIR).toBe('/tmp/viniplay-data');
    expect(paths.DVR_DIR).toBe('/tmp/viniplay-dvr');
  });

  it('derives dependent paths from DATA_DIR', () => {
    const { resolveRuntimePaths } = loadSubject();
    const paths = resolveRuntimePaths({ DATA_DIR: '/tmp/data' }, '/app');
    expect(paths.LOGS_DIR).toBe(path.join('/tmp/data', 'logs'));
    expect(paths.IMAGE_CACHE_DIR).toBe(path.join('/tmp/data', 'image_cache'));
  });
});
