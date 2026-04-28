const { spawnSync } = require('child_process');

describe('PR assessment report', () => {
  it('contains required assessment sections for every integrated PR', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-pr-assessment.js'], { encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
