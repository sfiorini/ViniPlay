const fs = require('fs');
const path = require('path');

const serverSource = () => fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8');

describe('startup and config VOD loading policy', () => {
  it('starts initial source processing with VOD refresh disabled', () => {
    expect(serverSource()).toMatch(/processAndMergeSources\(\{\s*includeVodRefresh:\s*false\s*\}\)/);
  });

  it('uses the shared source VOD policy before M3U and XC VOD processing', () => {
    const source = serverSource();
    expect(source).toContain("require('./lib/sourceVodPolicy')");
    expect(source).toMatch(/shouldProcessVodForSource\(source,\s*processingOptions\)/);
    expect(source).toMatch(/source\.type === 'xc'[\s\S]{0,160}shouldProcessVodForSource\(source,\s*processingOptions\)/);
    expect(source).toMatch(/source\.type === 'file' \|\| source\.type === 'url'[\s\S]{0,160}shouldProcessVodForSource\(source,\s*processingOptions\)/);
  });

  it('does not load legacy VOD JSON files in the initial config endpoint', () => {
    const source = serverSource();
    const configBlock = source.slice(source.indexOf("app.get('/api/config'"), source.indexOf("// --- NEW: VOD Library Endpoint"));
    expect(configBlock).not.toContain('VOD_MOVIES_JSON_PATH');
    expect(configBlock).not.toContain('VOD_SERIES_JSON_PATH');
    expect(configBlock).toContain('vodMovies: []');
    expect(configBlock).toContain('vodSeries: []');
  });
});
