const fs = require('fs');
const path = require('path');

const settingsSource = () => fs.readFileSync(path.join(__dirname, '..', '..', 'public/js/modules/settings.js'), 'utf8');

describe('source editor VOD option', () => {
  it('renders an Include VOD content checkbox for M3U source editing', () => {
    const source = settingsSource();
    expect(source).toContain('source-editor-include-vod');
    expect(source).toContain('Include VOD content');
  });

  it('defaults Include VOD content to enabled when a source has no explicit setting', () => {
    const source = settingsSource();
    expect(source).toMatch(/source\s*\?\s*source\.includeVod\s*!==\s*false\s*:\s*true/);
  });

  it('submits the Include VOD content setting with source form data', () => {
    const source = settingsSource();
    expect(source).toMatch(/formData\.append\('includeVod',\s*[^\n]*checked\)/);
  });
});
