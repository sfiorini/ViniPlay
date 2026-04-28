describe('source VOD processing policy', () => {
  it('allows VOD processing by default for existing sources and normal refreshes', () => {
    const { shouldProcessVodForSource } = require('../../lib/sourceVodPolicy');

    expect(shouldProcessVodForSource({ type: 'xc' }, {})).toBe(true);
    expect(shouldProcessVodForSource({ type: 'url' }, {})).toBe(true);
  });

  it('skips VOD when the processing run disables VOD globally', () => {
    const { shouldProcessVodForSource } = require('../../lib/sourceVodPolicy');

    expect(shouldProcessVodForSource({ type: 'xc' }, { includeVodRefresh: false })).toBe(false);
  });

  it('skips VOD when a source opts out of VOD content', () => {
    const { shouldProcessVodForSource } = require('../../lib/sourceVodPolicy');

    expect(shouldProcessVodForSource({ type: 'xc', includeVod: false }, {})).toBe(false);
    expect(shouldProcessVodForSource({ type: 'url', includeVod: false }, {})).toBe(false);
  });
});
