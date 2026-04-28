describe('timeshift settings defaults', () => {
  it('adds complete timeshift defaults to empty settings', () => {
    const { mergeSettingsWithDefaults } = require('../../lib/settingsDefaults');
    const settings = mergeSettingsWithDefaults({});
    expect(settings.timeshift).toMatchObject({
      segmentDurationSeconds: 6,
      cleanupIntervalMinutes: 5,
      safetyBufferMinutes: 10,
      hlsListSize: 0,
      hlsDeleteThreshold: 10
    });
  });

  it('preserves existing user timeshift values during migration', () => {
    const { mergeSettingsWithDefaults } = require('../../lib/settingsDefaults');
    const settings = mergeSettingsWithDefaults({ timeshift: { segmentDurationSeconds: 4 } });
    expect(settings.timeshift.segmentDurationSeconds).toBe(4);
    expect(settings.timeshift.cleanupIntervalMinutes).toBe(5);
  });
});
