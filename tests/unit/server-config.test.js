const fs = require('fs');

describe('server runtime configuration', () => {
  it('resolves DATA_DIR, DVR_DIR, and PORT from environment overrides', () => {
    const { resolveServerConfig } = require('../../lib/serverConfig');
    const config = resolveServerConfig({ DATA_DIR: '/tmp/vp-data', DVR_DIR: '/tmp/vp-dvr', PORT: '0' }, '/app');
    expect(config.port).toBe(0);
    expect(config.paths.DATA_DIR).toBe('/tmp/vp-data');
    expect(config.paths.DVR_DIR).toBe('/tmp/vp-dvr');
  });

  it('uses the default application port when PORT is absent', () => {
    const { resolveServerConfig } = require('../../lib/serverConfig');
    const config = resolveServerConfig({}, '/app');
    expect(config.port).toBe(8998);
    expect(config.paths.DATA_DIR).toBe('/app/data');
  });

  it('Dockerfile declares DATA_DIR=/data and DVR_DIR=/dvr defaults', () => {
    const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
    expect(dockerfile).toMatch(/^ENV DATA_DIR=\/data$/m);
    expect(dockerfile).toMatch(/^ENV DVR_DIR=\/dvr$/m);
  });
});
