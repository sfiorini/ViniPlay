const fs = require('fs');

describe('timeshift HLS dependency', () => {
  it('loads hls.js for timeshift playback before app module scripts', () => {
    const html = fs.readFileSync('public/index.html', 'utf8');
    const hlsIndex = html.indexOf('hls.js');
    const mainModuleIndex = html.indexOf('type="module"');
    expect(hlsIndex).toBeGreaterThan(-1);
    expect(mainModuleIndex).toBeGreaterThan(-1);
    expect(hlsIndex).toBeLessThan(mainModuleIndex);
  });
});
