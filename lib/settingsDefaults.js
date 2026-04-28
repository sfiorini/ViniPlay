const DEFAULT_SETTINGS = {
  timeshift: {
    segmentDurationSeconds: 6,
    cleanupIntervalMinutes: 5,
    safetyBufferMinutes: 10,
    hlsListSize: 0,
    hlsDeleteThreshold: 10,
    defaultMaxDurationHours: 3,
    timeshiftDirName: 'timeshift'
  }
};

function mergeObjectDefaults(existing = {}, defaults = {}) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(defaults)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeObjectDefaults(existing[key] || {}, value);
    } else if (merged[key] === undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function mergeSettingsWithDefaults(existingSettings = {}) {
  return mergeObjectDefaults(existingSettings, DEFAULT_SETTINGS);
}

module.exports = { DEFAULT_SETTINGS, mergeSettingsWithDefaults };
