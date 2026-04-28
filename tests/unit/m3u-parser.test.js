describe('parseM3U', () => {
  it('parses channel id, name, logo, group, and URL from M3U content', () => {
    const { parseM3U } = require('../../lib/m3uParser');
    const result = parseM3U('#EXTM3U\n#EXTINF:-1 tvg-id="bbc" tvg-logo="logo.png" group-title="News",BBC News\nhttp://example.test/live.ts');
    expect(result[0]).toMatchObject({ id: 'bbc', name: 'BBC News', logo: 'logo.png', group: 'News', url: 'http://example.test/live.ts' });
  });
});
