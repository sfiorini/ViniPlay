const path = require('path');

function resolveRuntimePaths(env = process.env, appDir = __dirname) {
  const DATA_DIR = env.DATA_DIR || '/data';
  const DVR_DIR = env.DVR_DIR || '/dvr';

  return {
    DATA_DIR,
    DVR_DIR,
    LOGS_DIR: path.join(DATA_DIR, 'logs'),
    VAPID_KEYS_PATH: path.join(DATA_DIR, 'vapid.json'),
    SOURCES_DIR: path.join(DATA_DIR, 'sources'),
    RAW_CACHE_DIR: path.join(DATA_DIR, 'sources', 'raw_cache'),
    IMAGE_CACHE_DIR: path.join(DATA_DIR, 'image_cache'),
    PUBLIC_DIR: path.join(appDir, 'public'),
    DB_PATH: path.join(DATA_DIR, 'viniplay.db'),
    LIVE_CHANNELS_M3U_PATH: path.join(DATA_DIR, 'live_channels.m3u'),
    LIVE_EPG_JSON_PATH: path.join(DATA_DIR, 'epg.json'),
    VOD_MOVIES_JSON_PATH: path.join(DATA_DIR, 'vod_movies.json'),
    VOD_SERIES_JSON_PATH: path.join(DATA_DIR, 'vod_series.json'),
    SETTINGS_PATH: path.join(DATA_DIR, 'settings.json')
  };
}

module.exports = { resolveRuntimePaths };
