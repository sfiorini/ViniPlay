# Upstream ViniPlay PR Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Safely evaluate, correct, and integrate upstream PRs #116, #114, #119, and #109 into this fork using strict TDD.

**Architecture:** Add a Vitest-based automated test harness first, validate the PR dependency/order assumptions with automated diff/merge checks, then integrate each upstream PR in low-risk order. Use concrete helper modules for testability: CommonJS helpers under `lib/` for backend/runtime logic and browser ES modules under `public/js/modules/` for frontend helpers.

**Tech Stack:** Node.js, Express, SQLite, vanilla browser ES modules, CommonJS backend helpers, Vitest, Supertest, jsdom, Nock, FFmpeg process mocks.

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

Do not batch multiple PRs into one unreviewable commit. Do not write Vitest todo tests: every `it(...)` must include an executable callback with at least one assertion. Tests for modules that do not exist yet must import/require those modules inside the `it(...)` callback (or use dynamic `await import(...)`) so Vitest collection succeeds and the test fails inside the assertion phase. Backend tests use CommonJS `require`; frontend test files that touch DOM APIs must start with `// @vitest-environment jsdom` and may import browser ES modules.

## Baseline Commands

Use these commands throughout the plan:

```bash
npm test
npm run check:syntax
npm run check:diff
```

`check:syntax` uses `node --check` as a syntax parser only; it does not execute modules and can parse frontend ES module syntax in `.js` files.

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
const { describe, expect, it } = require('vitest');

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

### S-102: Extract runtime path resolution for local dev support

**Files:**
- Create: `lib/paths.js`
- Test: `tests/unit/paths.test.js`
- Later modify: `server.js`

**Step 1: Write the failing test**

Create `tests/unit/paths.test.js`:

```js
const { describe, expect, it } = require('vitest');
const path = require('path');

function loadSubject() {
  return require('../../lib/paths');
}

describe('resolveRuntimePaths', () => {
  it('uses Docker defaults when no overrides are set', () => {
    const { resolveRuntimePaths } = loadSubject();
    const paths = resolveRuntimePaths({}, '/app');
    expect(paths.DATA_DIR).toBe('/data');
    expect(paths.DVR_DIR).toBe('/dvr');
  });

  it('uses env overrides for local development', () => {
    const { resolveRuntimePaths } = loadSubject();
    const paths = resolveRuntimePaths({ DATA_DIR: '/tmp/viniplay-data', DVR_DIR: '/tmp/viniplay-dvr' }, '/app');
    expect(paths.DATA_DIR).toBe('/tmp/viniplay-data');
    expect(paths.DVR_DIR).toBe('/tmp/viniplay-dvr');
  });

  it('derives dependent paths from DATA_DIR', () => {
    const { resolveRuntimePaths } = loadSubject();
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

### S-103: Validate upstream PR dependency and merge order assumptions

**Files:**
- Create: `tests/integration/pr-order.test.js`
- Create: `scripts/check-pr-order.js`
- Modify: `package.json`

**Step 1: Write the failing test**

Create `tests/integration/pr-order.test.js` that executes `node scripts/check-pr-order.js` and asserts it exits successfully. The script must validate the chosen order `116 -> 114 -> 119 -> 109` by checking that each fetched `upstream/pr/<number>` ref exists and that a temporary detached worktree can merge them sequentially without conflicts.

Test case:

```js
const { describe, expect, it } = require('vitest');
const { spawnSync } = require('child_process');

describe('upstream PR integration order', () => {
  it('can merge PRs 116, 114, 119, 109 sequentially without conflicts', () => {
    const result = spawnSync(process.execPath, ['scripts/check-pr-order.js'], { encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/integration/pr-order.test.js
```

Expected: FAIL because `scripts/check-pr-order.js` does not exist.

**Step 3: Implement order check script**

The script must fetch missing PR refs before validating order:

```bash
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream https://github.com/ardoviniandrea/ViniPlay.git
git fetch upstream refs/pull/109/head:refs/remotes/upstream/pr/109 refs/pull/114/head:refs/remotes/upstream/pr/114 refs/pull/116/head:refs/remotes/upstream/pr/116 refs/pull/119/head:refs/remotes/upstream/pr/119
```

Create `scripts/check-pr-order.js`:

```js
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const order = ['116', '114', '119', '109'];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'viniplay-pr-order-'));

try {
  try {
    execFileSync('git', ['remote', 'get-url', 'upstream'], { stdio: 'pipe' });
  } catch {
    execFileSync('git', ['remote', 'add', 'upstream', 'https://github.com/ardoviniandrea/ViniPlay.git'], { stdio: 'pipe' });
  }
  const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
  if (dirty) throw new Error('Refusing to check PR order with uncommitted changes. Commit or stash first.');
  execFileSync('git', ['fetch', 'upstream',
    'refs/pull/109/head:refs/remotes/upstream/pr/109',
    'refs/pull/114/head:refs/remotes/upstream/pr/114',
    'refs/pull/116/head:refs/remotes/upstream/pr/116',
    'refs/pull/119/head:refs/remotes/upstream/pr/119'
  ], { stdio: 'pipe' });
  for (const pr of order) {
    execFileSync('git', ['rev-parse', '--verify', `upstream/pr/${pr}`], { stdio: 'pipe' });
  }
  execFileSync('git', ['worktree', 'add', '--detach', tmp, 'HEAD'], { stdio: 'pipe' });
  for (const pr of order) {
    execFileSync('git', ['-C', tmp, 'merge', '--no-commit', '--no-ff', `upstream/pr/${pr}`], { stdio: 'pipe' });
    execFileSync('git', ['-C', tmp, 'commit', '--no-edit'], { stdio: 'pipe' });
  }
} finally {
  try { execFileSync('git', ['worktree', 'remove', '-f', tmp], { stdio: 'pipe' }); } catch {}
}
```

Add script:

```json
"check:pr-order": "node scripts/check-pr-order.js"
```

**Step 4: Verify**

```bash
npm test tests/integration/pr-order.test.js
npm run check:pr-order
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add package.json scripts/check-pr-order.js tests/integration/pr-order.test.js
git commit -m "test: validate upstream pr merge order"
```

---

## Milestone 2: PR #116 Mobile Navigation UI

### S-201: Capture mobile menu close transition behavior

**Files:**
- Create: `public/js/modules/mobileNav.js`
- Test: `tests/frontend/mobile-nav.test.js`
- Modify: `public/index.html`
- Modify: `public/js/modules/ui.js`

**Step 1: Write the failing test**

Create `tests/frontend/mobile-nav.test.js` against the concrete helper module `public/js/modules/mobileNav.js`. Use jsdom fixtures containing `#mobile-nav-menu` and `#mobile-menu-overlay`.

Use this executable test code; it must fail initially because the helper module does not exist:

```js
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

async function loadSubject() {
  return import('../../public/js/modules/mobileNav.js');
}

function fixture() {
  document.body.innerHTML = `
    <div id="mobile-nav-menu" class="hidden -translate-x-full flex-col"></div>
    <div id="mobile-menu-overlay" class="hidden"></div>
  `;
  return {
    menu: document.getElementById('mobile-nav-menu'),
    overlay: document.getElementById('mobile-menu-overlay'),
    body: document.body
  };
}

describe('mobile navigation helpers', () => {
  it('openMobileMenuElements shows menu and overlay', async () => {
    const { openMobileMenuElements } = await loadSubject();
    const els = fixture();
    openMobileMenuElements(els);
    expect(els.menu.classList.contains('hidden')).toBe(false);
    expect(els.menu.classList.contains('-translate-x-full')).toBe(false);
    expect(els.menu.classList.contains('translate-x-0')).toBe(true);
    expect(els.overlay.classList.contains('hidden')).toBe(false);
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
  });

  it('closeMobileMenuElements waits for transform transition before hiding menu', async () => {
    const { openMobileMenuElements, closeMobileMenuElements } = await loadSubject();
    const els = fixture();
    openMobileMenuElements(els);
    closeMobileMenuElements(els);
    expect(els.menu.classList.contains('hidden')).toBe(false);
    els.menu.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }));
    expect(els.menu.classList.contains('hidden')).toBe(true);
  });

  it('closeMobileMenuElements ignores non-transform transitionend events', async () => {
    const { openMobileMenuElements, closeMobileMenuElements } = await loadSubject();
    const els = fixture();
    openMobileMenuElements(els);
    closeMobileMenuElements(els);
    els.menu.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'background-color' }));
    expect(els.menu.classList.contains('hidden')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/frontend/mobile-nav.test.js
```

Expected: FAIL because `public/js/modules/mobileNav.js` does not exist.

**Step 3: Implement helper and apply PR #116 behavior**

Create `public/js/modules/mobileNav.js`:

```js
export function openMobileMenuElements({ menu, overlay, body = document.body }) {
  menu?.classList.remove('hidden', '-translate-x-full');
  menu?.classList.add('translate-x-0');
  overlay?.classList.remove('hidden');
  body?.classList.add('overflow-hidden');
}

export function closeMobileMenuElements({ menu, overlay, body = document.body }) {
  if (menu) {
    menu.classList.add('-translate-x-full');
    menu.classList.remove('translate-x-0');
    menu.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'transform' && e.target === menu) {
        menu.classList.add('hidden');
        menu.removeEventListener('transitionend', handler);
      }
    });
  }
  overlay?.classList.add('hidden');
  body?.classList.remove('overflow-hidden');
}
```

Then:

- In `public/index.html`, change the mobile nav container class from `hidden ... flex-col ...` to `hidden ... flex flex-col ...`.
- In `public/js/modules/ui.js`, import and call these helpers from `openMobileMenu()` and `closeMobileMenu()`.

**Step 4: Verify**

```bash
npm test tests/frontend/mobile-nav.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add public/index.html public/js/modules/ui.js public/js/modules/mobileNav.js tests/frontend/mobile-nav.test.js
git commit -m "fix: stabilize mobile navigation transition handling"
```

---

## Milestone 3: PR #114 Local Dev and Image Proxy

### S-301: Apply path resolution helper to server startup

**Files:**
- Modify: `server.js`
- Modify: `Dockerfile`
- Modify/Create: `.gitignore`
- Test: `tests/integration/server-paths.test.js`

**Step 1: Write failing integration-oriented test**

Create `tests/integration/server-paths.test.js` that starts `server.js` in a child process with temporary `DATA_DIR`, `DVR_DIR`, and `SESSION_SECRET` values. The test must assert that startup logs include the temporary data directory and that the process creates both temp directories instead of `/data` and `/dvr`.

Use executable tests like:

```js
const { describe, expect, it } = require('vitest');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('server runtime paths', () => {
  it('server startup honors DATA_DIR and DVR_DIR environment overrides', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-data-'));
    const dvrDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-dvr-'));
    const child = spawn(process.execPath, ['server.js'], {
      env: { ...process.env, DATA_DIR: dataDir, DVR_DIR: dvrDir, SESSION_SECRET: 'test-secret', PORT: '0' }
    });
    const output = await new Promise((resolve) => {
      let combined = '';
      const timer = setTimeout(() => resolve(combined), 8000);
      const collect = chunk => {
        combined += chunk.toString();
        if (combined.includes('Application starting')) { clearTimeout(timer); resolve(combined); }
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.on('exit', () => { clearTimeout(timer); resolve(combined); });
    }).finally(() => child.kill('SIGTERM'));
    expect(output).toContain(dataDir);
    expect(fs.existsSync(dataDir)).toBe(true);
    expect(fs.existsSync(dvrDir)).toBe(true);
  });

  it('Dockerfile declares DATA_DIR=/data and DVR_DIR=/dvr defaults', () => {
    const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
    expect(dockerfile).toMatch(/^ENV DATA_DIR=\/data$/m);
    expect(dockerfile).toMatch(/^ENV DVR_DIR=\/dvr$/m);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/integration/server-paths.test.js
```

Expected: FAIL because `server.js` still hard-codes `/data`, `/dvr`, and port `8998`.

**Step 3: Integrate into `server.js`**

Replace hard-coded path constants and make the server port test-isolatable:

```js
const port = Number(process.env.PORT || 8998);
```

Then replace path constants with:

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

Add `.gitignore` entries from PR #114 for local development artifacts:

```gitignore
node_modules/
.env
.env.local
*.log
data/
dvr/
```

**Step 4: Verify**

```bash
npm test tests/integration/server-paths.test.js tests/unit/paths.test.js
node --check server.js
Dockerfile_has_envs=$(grep -c '^ENV DATA_DIR=/data\|^ENV DVR_DIR=/dvr' Dockerfile); test "$Dockerfile_has_envs" -eq 2
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server.js Dockerfile .gitignore lib/paths.js tests/unit/paths.test.js tests/integration/server-paths.test.js
git commit -m "fix: support local runtime data directories"
```

### S-302: Extract and harden image proxy behavior

**Files:**
- Create: `lib/imageProxy.js`
- Modify: `server.js`
- Test: `tests/unit/image-proxy.test.js`

**Step 1: Write failing tests**

Create `tests/unit/image-proxy.test.js` with Supertest/Nock against a tiny Express app using the extracted handler. Require `../../lib/imageProxy` inside each `it(...)` callback so the missing module fails during test execution, not collection.

Required assertions:

- rejects missing url with 400
- rejects invalid URL with 400
- rejects non-http protocols such as file:
- follows a relative HTTP redirect to an image
- rejects redirect loops after five redirects
- rejects non-image content types
- serves a cached image on the second request with X-Cache HIT

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

Create the concrete frontend helper `public/js/modules/imageProxyUrl.js`. Import it with dynamic `await import(...)` inside each `it(...)` callback so the missing module fails during test execution, not collection.

Create `public/js/modules/imageProxyUrl.js`:

```js
export function toImageProxyUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return /^https?:\/\//i.test(url) ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url;
}
```

Test:

- wraps http logos with /api/image-proxy
- wraps https logos with /api/image-proxy
- does not wrap relative or data URLs
- does not wrap empty values

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

Create tests for `public/js/modules/castUrl.js`. Import `buildCastStreamUrl` with dynamic `await import(...)` inside each `it(...)` callback so the missing module fails during test execution, not collection.

Required assertions:

- replaces existing profileId with active cast profile
- appends cast profile when no profileId exists
- leaves URL unchanged when it already uses active cast profile
- builds /stream URL for redirect profiles using encoded raw stream URL
- converts relative cast URLs to absolute URLs
- preserves provider-qualified userAgentId when present

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

Use executable test code:

```js
const { describe, expect, it } = require('vitest');
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
- Create: `lib/settingsDefaults.js`
- Modify: `server.js`
- Test: `tests/unit/timeshift-settings.test.js`

**Step 1: Write failing tests**

Use executable tests:

```js
const { describe, expect, it } = require('vitest');

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
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-settings.test.js
```

Expected: FAIL because main branch has no timeshift settings.

**Step 3: Implement minimal settings migration**

Create `lib/settingsDefaults.js` with exported `DEFAULT_SETTINGS` and `mergeSettingsWithDefaults(existingSettings)`. Move the current default settings object and migration logic used by `getSettings()` into this module, then add `timeshift` defaults from PR #109 while preserving existing settings.

**Step 4: Verify**

```bash
npm test tests/unit/timeshift-settings.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server.js lib/settingsDefaults.js tests/unit/timeshift-settings.test.js
git commit -m "feat: add timeshift settings defaults"
```

### S-503: Add timeshift schema migration tests

**Files:**
- Create: `lib/schema.js`
- Modify: `server.js`
- Test: `tests/unit/timeshift-schema.test.js`

**Step 1: Write failing test**

Use executable tests:

```js
const { describe, expect, it } = require('vitest');
const sqlite3 = require('sqlite3').verbose();

describe('timeshift schema', () => {
  it('creates the timeshift_channels table with required columns', async () => {
    const { initializeSchema } = require('../../lib/schema');
    const db = new sqlite3.Database(':memory:');
    await initializeSchema(db);
    const columns = await new Promise((resolve, reject) => {
      db.all('PRAGMA table_info(timeshift_channels)', [], (err, rows) => err ? reject(err) : resolve(rows));
    });
    const byName = Object.fromEntries(columns.map(c => [c.name, c]));
    expect(byName.channel_id.pk).toBe(1);
    expect(byName.channel_name.notnull).toBe(1);
    expect(byName.max_duration_hours.dflt_value).toContain('3');
    expect(byName.is_enabled.dflt_value).toContain('1');
    expect(byName.created_at.dflt_value).toContain('CURRENT_TIMESTAMP');
    expect(byName.updated_at.dflt_value).toContain('CURRENT_TIMESTAMP');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-schema.test.js
```

Expected: FAIL.

**Step 3: Implement schema migration**

Create `lib/schema.js` with exported `initializeSchema(db)` and move DB table creation into this module. Add the `timeshift_channels` table creation there, then call `initializeSchema(db)` from `server.js`.

**Step 4: Verify**

```bash
npm test tests/unit/timeshift-schema.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server.js lib/schema.js tests/unit/timeshift-schema.test.js
git commit -m "feat: add timeshift channel schema"
```

### S-504: Extract M3U parser and test timeshift engine process lifecycle

**Files:**
- Create: `lib/m3uParser.js`
- Create: `lib/timeshiftEngine.js`
- Modify: `server.js`
- Test: `tests/unit/m3u-parser.test.js`
- Test: `tests/unit/timeshift-engine.test.js`

**Step 1: Write failing tests**

First write `tests/unit/m3u-parser.test.js` to lock the existing `parseM3U()` behavior before extracting it from `server.js`:

```js
const { describe, expect, it } = require('vitest');

describe('parseM3U', () => {
  it('parses channel id, name, logo, group, and URL from M3U content', () => {
    const { parseM3U } = require('../../lib/m3uParser');
    const result = parseM3U('#EXTM3U\n#EXTINF:-1 tvg-id="bbc" tvg-logo="logo.png" group-title="News",BBC News\nhttp://example.test/live.ts');
    expect(result[0]).toMatchObject({ id: 'bbc', name: 'BBC News', logo: 'logo.png', group: 'News', url: 'http://example.test/live.ts' });
  });
});
```

Then write `tests/unit/timeshift-engine.test.js` with fake `spawn`, fake `fs`, and fake DB callbacks. Required executable assertions:

- duplicate `start()` calls for the same channel leave `spawn` called once
- missing parsed channel URL leaves `spawn` uncalled
- `start()` creates the channel-specific HLS directory
- `start()` spawns `ffmpeg` with `-f hls`, `-hls_time`, and segment filename args
- `stop()` kills the process and removes active status
- unexpected exit schedules restart only when DB still marks the channel enabled
- disabled channel exit does not restart
- `shutdown()` stops all active processes

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-engine.test.js
```

Expected: FAIL.

**Step 3: Implement engine**

Create `lib/m3uParser.js` by moving the existing `parseM3U()` from `server.js` without behavior changes. Then create `createTimeshiftEngine({ db, fs, path, spawn, parseM3U, getSettings, liveChannelsPath, timeshiftDir, setTimeout })` with methods:

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
npm test tests/unit/m3u-parser.test.js tests/unit/timeshift-engine.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/m3uParser.js lib/timeshiftEngine.js server.js tests/unit/m3u-parser.test.js tests/unit/timeshift-engine.test.js
git commit -m "feat: add tested timeshift engine"
```

### S-505: Test segment cleanup and playlist generation

**Files:**
- Modify: `lib/timeshiftEngine.js`
- Test: `tests/unit/timeshift-playlist.test.js`

**Step 1: Write failing tests**

Use executable tests. At minimum include this media-sequence test plus the listed assertions:

```js
const { describe, expect, it } = require('vitest');
const path = require('path');

function fakeSegmentFs(files, writes) {
  return {
    existsSync: () => true,
    readdirSync: () => files,
    writeFileSync: (file, content) => writes.set(file, content),
    statSync: () => ({ mtimeMs: Date.now() })
  };
}

function fakeDeps(overrides = {}) {
  return {
    db: { all: () => {}, get: () => {} },
    fs: overrides.fs,
    path,
    spawn: () => ({ on: () => {}, stderr: { on: () => {} } }),
    parseM3U: () => [],
    getSettings: () => ({ timeshift: { segmentDurationSeconds: 6, safetyBufferMinutes: 10 } }),
    liveChannelsPath: '/live.m3u',
    timeshiftDir: '/timeshift',
    setTimeout: () => {},
    ...overrides
  };
}

describe('timeshift playlist generation', () => {
  it('generates media sequence from first remaining segment number and omits ENDLIST', () => {
    const { createTimeshiftEngine } = require('../../lib/timeshiftEngine');
    const writes = new Map();
    const fs = fakeSegmentFs(['segment_00000007.ts', 'segment_00000008.ts'], writes);
    const engine = createTimeshiftEngine(fakeDeps({ fs }));
    engine.regeneratePlaylist('chan1');
    const playlist = writes.get('/timeshift/chan1/playlist.m3u8');
    expect(playlist).toContain('#EXT-X-MEDIA-SEQUENCE:7');
    expect(playlist).toContain('#EXT-X-TARGETDURATION:6');
    expect(playlist).not.toContain('#EXT-X-ENDLIST');
  });
});
```

Additional required assertions:

- deletes only segments older than max duration plus safety buffer
- does not delete playlist or metadata files
- uses configured target duration

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
- Create: `lib/timeshiftRoutes.js`
- Create: `tests/helpers/makeTimeshiftTestApp.js`
- Modify: `server.js`
- Test: `tests/integration/timeshift-api.test.js`

**Step 1: Write failing API tests**

Create `lib/timeshiftRoutes.js` with `registerTimeshiftRoutes(app, deps)` and test it with a small Express app factory instead of starting the real server. Use executable Supertest tests. At minimum include:

```js
const { describe, expect, it } = require('vitest');
const request = require('supertest');
const { makeTimeshiftTestApp } = require('../helpers/makeTimeshiftTestApp');

describe('timeshift routes', () => {
  it('requires admin for POST /api/timeshift/channels', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const app = makeTimeshiftTestApp({ session: { userId: 2, isAdmin: false }, registerTimeshiftRoutes });
    await request(app).post('/api/timeshift/channels').send({ channelId: 'c1', channelName: 'One' }).expect(403);
  });

  it('rejects path traversal segment names', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const app = makeTimeshiftTestApp({ session: { userId: 1, isAdmin: true }, registerTimeshiftRoutes });
    await request(app).get('/api/timeshift/stream/c1/..%2F..%2Fetc%2Fpasswd').expect(400);
  });
});
```

Create `tests/helpers/makeTimeshiftTestApp.js` in Step 1 before the test file. It must export `makeTimeshiftTestApp({ session, registerTimeshiftRoutes, deps })`, build an Express app, inject `req.session` from the provided options, and call the `registerTimeshiftRoutes` function passed by the test. The helper must not require `lib/timeshiftRoutes.js` itself; each `it(...)` callback requires `lib/timeshiftRoutes.js` and passes the function into the helper so missing route modules fail during test execution, not collection.

Additional required assertions:

- requires admin for GET `/api/timeshift/channels`
- validates `channelId` and `channelName` on POST
- upserts channel config and starts recording when enabled
- updates max duration and enabled flag
- stops recording when disabling a channel
- deletes channel config and stops recording
- requires auth for playlist and segment endpoints

**Step 2: Run test to verify it fails**

```bash
npm test tests/integration/timeshift-api.test.js
```

Expected: FAIL.

**Step 3: Implement routes**

Implement `registerTimeshiftRoutes(app, deps)` in `lib/timeshiftRoutes.js`, call it from `server.js`, and bring in PR #109 API routes adapted to the tested engine module:

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
git add lib/timeshiftRoutes.js tests/helpers/makeTimeshiftTestApp.js server.js tests/integration/timeshift-api.test.js
git commit -m "feat: add timeshift management APIs"
```

### S-507: Add frontend timeshift player behavior

**Files:**
- Modify: `public/js/modules/player.js`
- Modify: `public/index.html`
- Test: `tests/frontend/timeshift-player.test.js`

**Step 1: Write failing tests**

Use executable jsdom tests. At minimum include:

```js
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

describe('timeshift player behavior', () => {
  it('falls back to normal mpegts playback when timeshift is disabled', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: false }) });
    global.mpegts = { isSupported: () => true, createPlayer: vi.fn(() => fakeMpegtsPlayer()) };
    const { playChannel } = await import('../../public/js/modules/player.js');
    await playChannel('http://provider/live.ts', 'Channel 1', 'c1');
    expect(fetch).toHaveBeenCalledWith('/api/timeshift/info/c1');
    expect(global.mpegts.createPlayer).toHaveBeenCalled();
  });
});
```

Additional required assertions:

- uses Hls playback when timeshift is enabled and recording
- shows timeshift controls only during timeshift playback
- cleans up timeshift intervals and UI on stop
- `seekToLive()` seeks near the finite live edge
- `seekTimeshiftRelative()` clamps seek range

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

Use executable jsdom tests. At minimum include:

```js
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

describe('timeshift settings UI', () => {
  it('escapes channel names rendered into HTML', async () => {
    document.body.innerHTML = '<div id="timeshift-channels-list"></div>';
    const { renderTimeshiftChannels } = await import('../../public/js/modules/settings.js');
    renderTimeshiftChannels([{ channel_id: 'c1', channel_name: '<img src=x onerror=alert(1)>', max_duration_hours: 3, is_enabled: 1 }], []);
    expect(document.body.innerHTML).not.toContain('onerror=');
    expect(document.body.textContent).toContain('<img src=x');
  });
});
```

Additional required assertions:

- loads configured timeshift channels and status
- populates channel selector from `guideState.channels`
- creates a timeshift channel via POST
- updates an existing timeshift channel via PUT
- removes a timeshift channel via DELETE after confirmation

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
- Create: `lib/timeshiftStartup.js`
- Modify: `server.js`
- Test: `tests/unit/timeshift-startup.test.js`

**Step 1: Write failing test**

Use executable tests against an extracted startup helper `lib/timeshiftStartup.js`:

```js
const { describe, expect, it, vi } = require('vitest');

function fakeProcess() {
  return { on: vi.fn() };
}

describe('timeshift startup wiring', () => {
  it('initializes enabled timeshift recordings and schedules cleanup', () => {
    const { startTimeshiftServices } = require('../../lib/timeshiftStartup');
    const engine = { initialize: vi.fn(), runCleanup: vi.fn(), shutdown: vi.fn() };
    const schedule = { scheduleJob: vi.fn() };
    startTimeshiftServices({ engine, schedule, cleanupIntervalMinutes: 5, processLike: fakeProcess() });
    expect(engine.initialize).toHaveBeenCalled();
    expect(schedule.scheduleJob).toHaveBeenCalledWith('*/5 * * * *', engine.runCleanup);
  });
});
```

Additional required assertion:

- SIGINT and SIGTERM handlers call `engine.shutdown()`

**Step 2: Run test to verify it fails**

```bash
npm test tests/unit/timeshift-startup.test.js
```

Expected: FAIL.

**Step 3: Implement startup wiring**

Implement `startTimeshiftServices({ engine, schedule, cleanupIntervalMinutes, processLike })` in `lib/timeshiftStartup.js`. Wire it inside `app.listen()` callback after existing janitors. Register SIGINT/SIGTERM handlers once.

**Step 4: Verify**

```bash
npm test tests/unit/timeshift-startup.test.js tests/unit/timeshift-engine.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/timeshiftStartup.js server.js tests/unit/timeshift-startup.test.js
git commit -m "feat: initialize timeshift engine on startup"
```

---

## Milestone 6: Final Integration Verification and PR Assessment

### S-601: Produce PR assessment report with automated structure validation

**Files:**
- Create: `docs/plans/2026-04-27-upstream-pr-assessment.md`
- Create: `scripts/validate-pr-assessment.js`
- Create: `tests/integration/pr-assessment.test.js`

**Step 1: Write failing validation test**

Create `tests/integration/pr-assessment.test.js`:

```js
const { describe, expect, it } = require('vitest');
const { spawnSync } = require('child_process');

describe('PR assessment report', () => {
  it('contains required assessment sections for every integrated PR', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-pr-assessment.js'], { encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test tests/integration/pr-assessment.test.js
```

Expected: FAIL because the validator and report do not exist.

**Step 3: Implement validator and report**

Create `scripts/validate-pr-assessment.js` that reads `docs/plans/2026-04-27-upstream-pr-assessment.md` and asserts each PR section exists for `#116`, `#114`, `#119`, and `#109`, with these required labels under each section:

```md
- Verdict:
- Upstream intent:
- Implementation correctness:
- Accepted changes:
- Corrections made:
- Tests added:
- Manual verification:
```

Then create the report and fill it with evidence from the completed stories.

**Step 4: Verify**

```bash
npm test tests/integration/pr-assessment.test.js
npm run check:syntax
npm run check:diff
```

Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans/2026-04-27-upstream-pr-assessment.md scripts/validate-pr-assessment.js tests/integration/pr-assessment.test.js
git commit -m "docs: document upstream pr integration assessment"
```

### S-602: Run full automated and smoke verification

**Files:**
- Create: `scripts/smoke-local-start.js`
- Create: `tests/integration/final-smoke.test.js`

**Step 1: Write failing smoke automation**

Create `tests/integration/final-smoke.test.js` that executes `node scripts/smoke-local-start.js`. The smoke script must start the server with temp `DATA_DIR`, `DVR_DIR`, and `SESSION_SECRET`, wait for the listening log line, request `/api/auth/needs-setup`, assert a 200 JSON response, assert temp data/dvr directories exist, then terminate the process.

**Step 2: Run smoke test to verify it fails**

```bash
npm test tests/integration/final-smoke.test.js
```

Expected: FAIL because `scripts/smoke-local-start.js` does not exist.

**Step 3: Implement smoke automation**

Create `scripts/smoke-local-start.js` using only Node built-ins: `child_process.spawn`, `fs.mkdtempSync`, `http.get`, and process cleanup handlers. The script must exit non-zero on timeout, startup crash, missing directories, or non-200 `/api/auth/needs-setup` response.

**Step 4: Run automated suite**

```bash
npm test
npm run check:syntax
npm run check:pr-order
npm run check:diff
```

Expected: PASS.

**Step 5: Run explicit local startup smoke check**

```bash
node scripts/smoke-local-start.js
```

Expected: PASS with server startup, temp local data directories, and `/api/auth/needs-setup` response verified.

**Step 6: Remaining manual smoke checklist**

These checks require real browser/device interaction after automated verification:

- [ ] First-time setup page renders in a browser.
- [ ] Settings page renders with local data dirs.
- [ ] Mobile nav opens and closes on mobile viewport.
- [ ] External channel logo renders through `/api/image-proxy`.
- [ ] Chromecast device accepts the generated Cast media URL.
- [ ] Admin can enable timeshift for a real playable channel.
- [ ] Timeshift playback uses HLS controls with a real stream and normal playback otherwise.

**Step 7: Final commit if needed**

Only commit if verification fixes were required.

```bash
git status --short
```

Expected: clean.
