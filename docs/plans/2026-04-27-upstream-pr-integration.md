# Upstream ViniPlay PR Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Safely evaluate, correct, and integrate upstream PRs #116, #114, #119, and #109 into this fork using strict TDD.

**Architecture:** Add a Vitest-based automated test harness first, then integrate each upstream PR in low-risk order. Extract small helper modules only where needed to make behavior testable without changing runtime behavior.

**Tech Stack:** Node.js, Express, SQLite, vanilla browser ES modules, Vitest, Supertest, jsdom, Nock, FFmpeg process mocks.

---

## Progress Checklist

- [ ] Milestone 1: Test harness and testability seams
- [ ] Milestone 2: PR #116 mobile navigation UI
- [ ] Milestone 3: PR #114 local dev paths and image proxy
- [ ] Milestone 4: PR #119 Chromecast redirect-profile casting
- [ ] Milestone 5: PR #109 timeshift feature
- [ ] Milestone 6: final integration verification and PR assessment report

## Required Workflow

For every story:

1. Write the failing test first.
2. Run only the targeted test and confirm it fails for the expected reason.
3. Implement the minimum production change.
4. Run the targeted test and confirm it passes.
5. Run the relevant syntax/static checks.
6. Commit the story.

Do not batch multiple PRs into one unreviewable commit.

## Baseline Commands

Use these commands throughout the plan:

```bash
npm test
npm run test:watch -- --run
npm run check:syntax
npm run check:diff
```

Expected final result: all commands pass and `git status --short` is clean after each commit.

---

## Milestone 1: Test Harness and Testability Seams

### S-101: Add automated test dependencies and scripts

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `tests/setup/test-env.js`

**Step 1: Write the failing test**

Create `tests/setup/smoke.test.js`:

```js
import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('runs a baseline test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test
```

Expected: FAIL because `npm test` is not configured.

**Step 3: Add minimal implementation**

Add dev dependencies:

```bash
npm install --save-dev vitest supertest jsdom nock tmp
```

Update `package.json` scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "check:syntax": "node --check server.js && find public/js -name '*.js' -print0 | xargs -0 -n1 node --check",
    "check:diff": "git diff --check"
  }
}
```

Create `vitest.config.js`:

```js
module.exports = {
  test: {
    environment: 'node',
    setupFiles: ['tests/setup/test-env.js'],
    restoreMocks: true,
    clearMocks: true,
    isolate: true
  }
};
```

Create `tests/setup/test-env.js`:

```js
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test tests/setup/smoke.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js tests/setup/smoke.test.js tests/setup/test-env.js
git commit -m "test: add automated test harness"
```

### S-102: Add syntax and diff checks to baseline

**Files:**
- Modify: `package.json`
- Test: `tests/setup/smoke.test.js`

**Step 1: Write the failing check expectation**

Run:

```bash
npm run check:syntax
npm run check:diff
```

Expected before script additions: FAIL if scripts are missing, otherwise PASS.

**Step 2: Implement scripts if not already present**

Ensure `package.json` contains:

```json
"check:syntax": "node --check server.js && find public/js -name '*.js' -print0 | xargs -0 -n1 node --check",
"check:diff": "git diff --check"
```

**Step 3: Verify**

Run:

```bash
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 4: Commit**

```bash
git add package.json
git commit -m "test: add syntax and diff checks"
```

### S-103: Extract runtime path resolution for local dev support

**Files:**
- Create: `lib/paths.js`
- Test: `tests/unit/paths.test.js`
- Later modify: `server.js`

**Step 1: Write the failing test**

Create `tests/unit/paths.test.js`:

```js
const { describe, expect, it } = require('vitest');
const path = require('path');
const { resolveRuntimePaths } = require('../../lib/paths');

describe('resolveRuntimePaths', () => {
  it('uses Docker defaults when no overrides are set', () => {
    const paths = resolveRuntimePaths({}, '/app');
    expect(paths.DATA_DIR).toBe('/data');
    expect(paths.DVR_DIR).toBe('/dvr');
  });

  it('uses env overrides for local development', () => {
    const paths = resolveRuntimePaths({ DATA_DIR: '/tmp/viniplay-data', DVR_DIR: '/tmp/viniplay-dvr' }, '/app');
    expect(paths.DATA_DIR).toBe('/tmp/viniplay-data');
    expect(paths.DVR_DIR).toBe('/tmp/viniplay-dvr');
  });

  it('derives dependent paths from DATA_DIR', () => {
    const paths = resolveRuntimePaths({ DATA_DIR: '/tmp/data' }, '/app');
    expect(paths.LOGS_DIR).toBe(path.join('/tmp/data', 'logs'));
    expect(paths.IMAGE_CACHE_DIR).toBe(path.join('/tmp/data', 'image_cache'));
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/paths.test.js
```

Expected: FAIL because `lib/paths.js` does not exist.

**Step 3: Implement minimal helper**

Create `lib/paths.js`:

```js
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
```

**Step 4: Verify**

```bash
npm test tests/unit/paths.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/paths.js tests/unit/paths.test.js
git commit -m "test: cover runtime path resolution"
```

---

## Milestone 2: PR #116 Mobile Navigation UI

### S-201: Capture mobile menu close transition behavior

**Files:**
- Test: `tests/frontend/mobile-nav.test.js`
- Modify: `public/index.html`
- Modify: `public/js/modules/ui.js`

**Step 1: Write the failing test**

Create `tests/frontend/mobile-nav.test.js` around exported `openMobileMenu` and `closeMobileMenu`. Use jsdom fixtures containing `#mobile-nav-menu` and `#mobile-menu-overlay`. Mock `UIElements` if direct module import is difficult; otherwise extract class mutation helpers into `public/js/modules/mobileNav.js` and test them directly.

Test cases:

```js
it('openMobileMenu shows menu and overlay');
it('closeMobileMenu waits for transform transition before hiding menu');
it('closeMobileMenu ignores non-transform transitionend events');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/frontend/mobile-nav.test.js
```

Expected: FAIL because current behavior hides on any transition and `index.html` lacks persistent `flex` class.

**Step 3: Apply PR #116 behavior**

Bring in the PR #116 changes:

- In `public/index.html`, change the mobile nav container class from `hidden ... flex-col ...` to `hidden ... flex flex-col ...`.
- In `public/js/modules/ui.js`, update `closeMobileMenu()` so the `transitionend` handler hides the menu only when `e.propertyName === 'transform'` and `e.target === UIElements.mobileNavMenu`.

**Step 4: Verify**

```bash
npm test tests/frontend/mobile-nav.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add public/index.html public/js/modules/ui.js tests/frontend/mobile-nav.test.js
git commit -m "fix: stabilize mobile navigation transition handling"
```

---

## Milestone 3: PR #114 Local Dev and Image Proxy

### S-301: Apply path resolution helper to server startup

**Files:**
- Modify: `server.js`
- Modify: `Dockerfile`
- Modify/Create: `.gitignore`
- Test: `tests/unit/paths.test.js`

**Step 1: Write failing integration-oriented test**

Extend `tests/unit/paths.test.js` to assert Docker defaults and local overrides as in S-103. If S-103 already covers this, run it first before modifying `server.js`.

**Step 2: Run test and baseline syntax**

```bash
npm test tests/unit/paths.test.js
npm run check:syntax
```

Expected: tests PASS, syntax PASS before server integration.

**Step 3: Integrate into `server.js`**

Replace hard-coded path constants with:

```js
const { resolveRuntimePaths } = require('./lib/paths');
const runtimePaths = resolveRuntimePaths(process.env, __dirname);
const {
  DATA_DIR,
  DVR_DIR,
  LOGS_DIR,
  VAPID_KEYS_PATH,
  SOURCES_DIR,
  RAW_CACHE_DIR,
  IMAGE_CACHE_DIR,
  PUBLIC_DIR,
  DB_PATH,
  LIVE_CHANNELS_M3U_PATH,
  LIVE_EPG_JSON_PATH,
  VOD_MOVIES_JSON_PATH,
  VOD_SERIES_JSON_PATH,
  SETTINGS_PATH
} = runtimePaths;
```

Set Docker defaults explicitly in `Dockerfile`:

```dockerfile
ENV DATA_DIR=/data
ENV DVR_DIR=/dvr
```

Add `.gitignore` entries from PR #114, plus local planning artifacts:

```gitignore
node_modules/
.env
.env.local
*.log
data/
dvr/
ai_plan/
```

**Step 4: Verify**

```bash
npm test tests/unit/paths.test.js
DATA_DIR=/tmp/viniplay-test-data DVR_DIR=/tmp/viniplay-test-dvr node --check server.js
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server.js Dockerfile .gitignore lib/paths.js tests/unit/paths.test.js
git commit -m "fix: support local runtime data directories"
```

### S-302: Extract and harden image proxy behavior

**Files:**
- Create: `lib/imageProxy.js`
- Modify: `server.js`
- Test: `tests/unit/image-proxy.test.js`

**Step 1: Write failing tests**

Create `tests/unit/image-proxy.test.js` with Supertest/Nock against a tiny Express app using the extracted handler.

Required tests:

```js
it('rejects missing url with 400');
it('rejects invalid URL with 400');
it('rejects non-http protocols such as file:');
it('follows a relative HTTP redirect to an image');
it('rejects redirect loops after five redirects');
it('rejects non-image content types');
it('serves a cached image on the second request with X-Cache HIT');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/image-proxy.test.js
```

Expected: FAIL because helper does not exist and current route accepts any URL protocol.

**Step 3: Implement helper**

Extract `/api/image-proxy` logic from `server.js` into `lib/imageProxy.js`:

```js
function createImageProxyHandler({ imageCacheDir, httpModule = require('http'), httpsModule = require('https'), fsModule = require('fs'), cryptoModule = require('crypto') }) {
  return function imageProxyHandler(req, res) {
    // validate url exists
    // parse with URL
    // require protocol http: or https:
    // use sha256 cache key
    // serve cache if valid
    // fetch with redirect support and browser-like headers
    // destroy/drain redirect responses before following
    // send exactly one response per request
  };
}

module.exports = { createImageProxyHandler };
```

Then replace the inline server route with:

```js
const { createImageProxyHandler } = require('./lib/imageProxy');
app.get('/api/image-proxy', allowLocalOrAuth, createImageProxyHandler({ imageCacheDir: IMAGE_CACHE_DIR }));
```

**Step 4: Verify**

```bash
npm test tests/unit/image-proxy.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS and no PR #114 trailing whitespace remains.

**Step 5: Commit**

```bash
git add lib/imageProxy.js server.js tests/unit/image-proxy.test.js
git commit -m "fix: harden image proxy fetching and caching"
```

### S-303: Apply logo proxy usage in guide and admin UI

**Files:**
- Modify: `public/js/modules/guide.js`
- Modify: `public/js/modules/admin.js`
- Test: `tests/frontend/logo-proxy.test.js`

**Step 1: Write failing tests**

Extract a small frontend helper if needed:

Create `public/js/modules/imageProxyUrl.js`:

```js
export function toImageProxyUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return /^https?:\/\//i.test(url) ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url;
}
```

Test:

```js
it('wraps http logos with /api/image-proxy');
it('wraps https logos with /api/image-proxy');
it('does not wrap relative or data URLs');
it('does not wrap empty values');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/frontend/logo-proxy.test.js
```

Expected: FAIL because helper does not exist.

**Step 3: Implement and use helper**

Use `toImageProxyUrl()` in:

- guide program details modal logo
- guide channel row logo
- guide search result logos
- admin live activity logo
- admin watch history logo

Avoid inline duplicated `startsWith('http')` checks.

**Step 4: Verify**

```bash
npm test tests/frontend/logo-proxy.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add public/js/modules/imageProxyUrl.js public/js/modules/guide.js public/js/modules/admin.js tests/frontend/logo-proxy.test.js
git commit -m "fix: proxy external channel logos"
```

---

## Milestone 4: PR #119 Chromecast Redirect-Profile Casting

### S-401: Extract Cast URL construction and test redirect behavior

**Files:**
- Create: `public/js/modules/castUrl.js`
- Modify: `public/js/modules/cast.js`
- Test: `tests/frontend/cast-url.test.js`

**Step 1: Write failing tests**

Create tests for:

```js
it('replaces existing profileId with active cast profile');
it('appends cast profile when no profileId exists');
it('leaves URL unchanged when it already uses active cast profile');
it('builds /stream URL for redirect profiles using encoded raw stream URL');
it('converts relative cast URLs to absolute URLs');
it('preserves provider-qualified userAgentId when present');
```

Example expected redirect result:

```js
expect(buildCastStreamUrl({
  url: 'http://provider.test/live.ts?token=a b',
  origin: 'https://viniplay.test',
  activeCastProfileId: 'cast-default',
  activeUserAgentId: 'ua-1',
  activeStreamProfile: { command: 'redirect' }
})).toBe('https://viniplay.test/stream?url=http%3A%2F%2Fprovider.test%2Flive.ts%3Ftoken%3Da%20b&profileId=cast-default&userAgentId=ua-1');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/frontend/cast-url.test.js
```

Expected: FAIL because helper does not exist.

**Step 3: Implement helper and wire `cast.js`**

Create `buildCastStreamUrl()` in `public/js/modules/castUrl.js` and use it inside `loadMedia()`.

Correct PR #119 issues:

- remove trailing whitespace
- do not double-prefix absolute URLs
- do not double-encode existing `/stream` URLs
- keep token generation aligned with the canonical original stream identity used by `/api/cast/generate-token`

**Step 4: Verify**

```bash
npm test tests/frontend/cast-url.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add public/js/modules/castUrl.js public/js/modules/cast.js tests/frontend/cast-url.test.js
git commit -m "fix: build cast URLs for redirect profiles"
```

### S-402: Refresh local playback after Cast session end

**Files:**
- Modify: `public/js/modules/cast.js`
- Test: `tests/frontend/cast-session.test.js`

**Step 1: Write failing test**

Test that when session state becomes `SESSION_ENDED`:

- current Cast stream stop is requested
- Cast state is cleared
- player UI is updated
- `forceRefreshStream()` is called and errors are caught/logged

**Step 2: Run test to verify it fails**

```bash
npm test tests/frontend/cast-session.test.js
```

Expected: FAIL because current main branch does not refresh after Cast ends.

**Step 3: Implement PR #119 behavior safely**

Import `forceRefreshStream` and call it after Cast session cleanup:

```js
forceRefreshStream().catch(err => {
  console.error('[CAST] Error refreshing stream after cast ended:', err);
});
```

Guard against refreshing when no local channel exists by relying on `forceRefreshStream()` no-op behavior.

**Step 4: Verify**

```bash
npm test tests/frontend/cast-session.test.js tests/frontend/cast-url.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add public/js/modules/cast.js tests/frontend/cast-session.test.js
git commit -m "fix: refresh local stream after cast ends"
```

---

## Milestone 5: PR #109 Timeshift Feature

### S-501: Add HLS dependency path before frontend timeshift playback

**Files:**
- Modify: `public/index.html`
- Test: `tests/frontend/timeshift-dependency.test.js`

**Step 1: Write failing test**

Test `public/index.html` contains an HLS.js script before module scripts that use `Hls`:

```js
it('loads hls.js for timeshift playback before app module scripts');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/frontend/timeshift-dependency.test.js
```

Expected: FAIL because current `index.html` only loads mpegts.js and Cast sender.

**Step 3: Implement minimal dependency**

Add HLS.js script near mpegts:

```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
```

Prefer a pinned version if reproducibility is required.

**Step 4: Verify**

```bash
npm test tests/frontend/timeshift-dependency.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add public/index.html tests/frontend/timeshift-dependency.test.js
git commit -m "fix: load hls.js for timeshift playback"
```

### S-502: Cover timeshift default settings migration

**Files:**
- Modify: `server.js` or extract `lib/settingsDefaults.js`
- Test: `tests/unit/timeshift-settings.test.js`

**Step 1: Write failing tests**

Test that `getSettings()`-equivalent logic includes:

```js
settings.timeshift.segmentDurationSeconds === 6
settings.timeshift.cleanupIntervalMinutes === 5
settings.timeshift.safetyBufferMinutes === 10
settings.timeshift.hlsListSize === 0
settings.timeshift.hlsDeleteThreshold === 10
```

Also test partial existing settings are migrated without deleting user values.

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-settings.test.js
```

Expected: FAIL because main branch has no timeshift settings.

**Step 3: Implement minimal settings migration**

Extract settings default/migration logic if needed. Add `timeshift` defaults from PR #109 while preserving existing settings.

**Step 4: Verify**

```bash
npm test tests/unit/timeshift-settings.test.js
npm run check:syntax
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server.js lib/settingsDefaults.js tests/unit/timeshift-settings.test.js
git commit -m "feat: add timeshift settings defaults"
```

### S-503: Add timeshift schema migration tests

**Files:**
- Modify: `server.js` or extract `lib/schema.js`
- Test: `tests/unit/timeshift-schema.test.js`

**Step 1: Write failing test**

Test schema creation creates `timeshift_channels` with:

- `channel_id TEXT PRIMARY KEY`
- `channel_name TEXT NOT NULL`
- `max_duration_hours INTEGER DEFAULT 3`
- `is_enabled INTEGER DEFAULT 1`
- `created_at TEXT DEFAULT CURRENT_TIMESTAMP`
- `updated_at TEXT DEFAULT CURRENT_TIMESTAMP`

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-schema.test.js
```

Expected: FAIL.

**Step 3: Implement schema migration**

Add table creation inside DB setup or extracted schema module.

**Step 4: Verify**

```bash
npm test tests/unit/timeshift-schema.test.js
npm run check:syntax
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server.js lib/schema.js tests/unit/timeshift-schema.test.js
git commit -m "feat: add timeshift channel schema"
```

### S-504: Extract and test timeshift engine process lifecycle

**Files:**
- Create: `lib/timeshiftEngine.js`
- Modify: `server.js`
- Test: `tests/unit/timeshift-engine.test.js`

**Step 1: Write failing tests**

Use fake `spawn`, fake `fs`, and fake DB callbacks.

Required cases:

```js
it('does not start a duplicate process for the same channel');
it('returns without spawning when channel is missing from parsed M3U');
it('creates channel-specific HLS directory');
it('spawns ffmpeg with HLS segment settings');
it('removes process on intentional stop');
it('restarts an unexpectedly exited enabled channel after delay');
it('does not restart a disabled channel');
it('shuts down all active processes');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-engine.test.js
```

Expected: FAIL.

**Step 3: Implement engine**

Create `createTimeshiftEngine({ db, fs, path, spawn, parseM3U, getSettings, liveChannelsPath, timeshiftDir, setTimeout })` with methods:

- `start(channelId, channelName)`
- `stop(channelId)`
- `status()`
- `initialize()`
- `shutdown()`
- `cleanupSegments(channelId, maxDurationHours, safetyBufferMinutes)`
- `regeneratePlaylist(channelId)`
- `runCleanup()`

Do not leave process state hidden in `server.js`.

**Step 4: Verify**

```bash
npm test tests/unit/timeshift-engine.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/timeshiftEngine.js server.js tests/unit/timeshift-engine.test.js
git commit -m "feat: add tested timeshift engine"
```

### S-505: Test segment cleanup and playlist generation

**Files:**
- Modify: `lib/timeshiftEngine.js`
- Test: `tests/unit/timeshift-playlist.test.js`

**Step 1: Write failing tests**

Required cases:

```js
it('deletes only segments older than max duration plus safety buffer');
it('does not delete playlist or metadata files');
it('generates media sequence from first remaining segment number');
it('omits EXT-X-ENDLIST for live playlists');
it('uses configured target duration');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-playlist.test.js
```

Expected: FAIL until helper behavior is complete.

**Step 3: Implement minimum cleanup/playlist behavior**

Fix any upstream PR #109 weaknesses found by tests. Prefer sorting by numeric segment suffix and writing atomically if practical.

**Step 4: Verify**

```bash
npm test tests/unit/timeshift-playlist.test.js tests/unit/timeshift-engine.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/timeshiftEngine.js tests/unit/timeshift-playlist.test.js
git commit -m "feat: manage timeshift segment cleanup and playlists"
```

### S-506: Add admin-only timeshift configuration APIs

**Files:**
- Modify: `server.js`
- Test: `tests/integration/timeshift-api.test.js`

**Step 1: Write failing API tests**

Use a small app factory if needed to avoid starting the real server. Required cases:

```js
it('requires admin for GET /api/timeshift/channels');
it('requires admin for POST /api/timeshift/channels');
it('validates channelId and channelName on POST');
it('upserts channel config and starts recording when enabled');
it('updates max duration and enabled flag');
it('stops recording when disabling a channel');
it('deletes channel config and stops recording');
it('requires auth for playlist and segment endpoints');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/integration/timeshift-api.test.js
```

Expected: FAIL.

**Step 3: Implement routes**

Bring in PR #109 API routes, adapted to the tested engine module:

- `GET /api/timeshift/channels`
- `POST /api/timeshift/channels`
- `PUT /api/timeshift/channels/:channelId`
- `DELETE /api/timeshift/channels/:channelId`
- `GET /api/timeshift/stream/:channelId/playlist.m3u8`
- `GET /api/timeshift/stream/:channelId/:segment`
- `GET /api/timeshift/info/:channelId`
- `GET /api/timeshift/status`

Correction requirements:

- Admin-only for configuration/status endpoints.
- Auth required for playback/info endpoints.
- Validate `channelId`, `channelName`, and duration bounds.
- Prevent path traversal in segment filename.

**Step 4: Verify**

```bash
npm test tests/integration/timeshift-api.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server.js tests/integration/timeshift-api.test.js
git commit -m "feat: add timeshift management APIs"
```

### S-507: Add frontend timeshift player behavior

**Files:**
- Modify: `public/js/modules/player.js`
- Modify: `public/index.html`
- Test: `tests/frontend/timeshift-player.test.js`

**Step 1: Write failing tests**

Required cases:

```js
it('checks /api/timeshift/info before normal playback');
it('uses Hls playback when timeshift is enabled and recording');
it('falls back to normal mpegts playback when timeshift is disabled');
it('shows timeshift controls only during timeshift playback');
it('cleans up timeshift intervals and UI on stop');
it('seekToLive seeks near the finite live edge');
it('seekTimeshiftRelative clamps seek range');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/frontend/timeshift-player.test.js
```

Expected: FAIL.

**Step 3: Implement player behavior**

Apply PR #109 player changes, corrected for:

- `Hls` dependency presence/fallback
- interval cleanup
- repeated event listener leaks
- no hard crash when `fetch('/api/timeshift/info')` fails
- normal Cast/local playback behavior remains unchanged

**Step 4: Verify**

```bash
npm test tests/frontend/timeshift-player.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add public/js/modules/player.js public/index.html tests/frontend/timeshift-player.test.js
git commit -m "feat: play timeshift channels with hls"
```

### S-508: Add settings UI for timeshift channels

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/modules/settings.js`
- Test: `tests/frontend/timeshift-settings-ui.test.js`

**Step 1: Write failing tests**

Required cases:

```js
it('loads configured timeshift channels and status');
it('populates channel selector from guideState channels');
it('creates a timeshift channel via POST');
it('updates an existing timeshift channel via PUT');
it('removes a timeshift channel via DELETE after confirmation');
it('escapes channel names rendered into HTML');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/frontend/timeshift-settings-ui.test.js
```

Expected: FAIL.

**Step 3: Implement UI**

Apply PR #109 settings/index changes, corrected for:

- no global inline `onclick` where event delegation is safer
- escaping channel names
- clear empty/error states
- status refresh after create/update/delete

**Step 4: Verify**

```bash
npm test tests/frontend/timeshift-settings-ui.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add public/index.html public/js/modules/settings.js tests/frontend/timeshift-settings-ui.test.js
git commit -m "feat: manage timeshift channels in settings"
```

### S-509: Start timeshift engine safely on server startup

**Files:**
- Modify: `server.js`
- Test: `tests/unit/timeshift-startup.test.js`

**Step 1: Write failing test**

Test startup wiring:

```js
it('initializes enabled timeshift recordings after server starts');
it('schedules cleanup using configured interval');
it('shuts down timeshift processes on SIGINT and SIGTERM');
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-startup.test.js
```

Expected: FAIL.

**Step 3: Implement startup wiring**

Wire engine initialization inside `app.listen()` callback after existing janitors. Register SIGINT/SIGTERM handlers once.

**Step 4: Verify**

```bash
npm test tests/unit/timeshift-startup.test.js tests/unit/timeshift-engine.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server.js tests/unit/timeshift-startup.test.js
git commit -m "feat: initialize timeshift engine on startup"
```

---

## Milestone 6: Final Integration Verification and PR Assessment

### S-601: Produce PR assessment report

**Files:**
- Create: `docs/plans/2026-04-27-upstream-pr-assessment.md`

**Step 1: Write report skeleton**

Include sections:

```md
# Upstream PR Assessment

## PR #116
- Verdict:
- Accepted changes:
- Corrections made:
- Tests:

## PR #114
...

## PR #119
...

## PR #109
...
```

**Step 2: Fill with evidence**

For each PR, document:

- original upstream intent
- implementation correctness assessment
- corrections made in this fork
- tests added
- manual verification performed

**Step 3: Commit**

```bash
git add docs/plans/2026-04-27-upstream-pr-assessment.md
git commit -m "docs: document upstream pr integration assessment"
```

### S-602: Run full verification

**Files:**
- No code changes expected

**Step 1: Run automated suite**

```bash
npm test
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 2: Run local startup smoke check**

```bash
DATA_DIR=/tmp/viniplay-smoke-data DVR_DIR=/tmp/viniplay-smoke-dvr SESSION_SECRET=test-secret timeout 10s npm start
```

Expected: server starts, creates local data directories, and exits due timeout without startup crash.

**Step 3: Manual smoke checklist**

- [ ] First-time setup page loads.
- [ ] Settings page loads with local data dirs.
- [ ] Mobile nav opens and closes on mobile viewport.
- [ ] External channel logo renders through `/api/image-proxy`.
- [ ] Cast URL helper behavior matches active stream/cast profile settings.
- [ ] Admin can enable timeshift for a channel.
- [ ] Non-admin cannot manage timeshift config.
- [ ] Timeshift playlist endpoint requires auth.
- [ ] Timeshift playback uses HLS controls when available and normal playback otherwise.

**Step 4: Final commit if needed**

Only commit if verification fixes were required.

```bash
git status --short
```

Expected: clean.
