const { spawnSync } = require('child_process');

describe('final local startup smoke', () => {
  it('starts the server with temp local directories and responds to setup check', () => {
    const result = spawnSync(process.execPath, ['scripts/smoke-local-start.js'], { encoding: 'utf8', timeout: 30000 });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
