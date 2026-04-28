# Upstream PR Integration Assessment

## PR #116

- Verdict: Accepted with corrections in commit `145eefb`.
- Upstream intent: Stabilize mobile navigation so the menu closes only after the slide transition finishes.
- Implementation correctness: Correct after extracting `public/js/modules/mobileNav.js` and testing transform-only `transitionend` handling.
- Accepted changes: Mobile nav helper behavior and `public/index.html` flex layout preservation.
- Corrections made: Avoided hiding on unrelated transitions and preserved `flex flex-col` while toggling `hidden`.
- Tests added: `npm test tests/frontend/mobile-nav.test.js` covers open, close-after-transform, and non-transform ignore cases.
- Manual verification: Automated jsdom coverage plus full-suite verification in milestone M2; browser/mobile viewport remains on final manual checklist.

## PR #114

- Verdict: Accepted with hardening in commits `469ba97`, `a5bd278`, and `88cb9f6`.
- Upstream intent: Support local runtime directories and proxy external images to avoid mixed-content/logo issues.
- Implementation correctness: Correct after adding pure config/path helpers and a hardened image proxy module.
- Accepted changes: Runtime path configuration, Docker `DATA_DIR`/`DVR_DIR` defaults, image proxy endpoint, and frontend logo proxy helper.
- Corrections made: Rejected non-HTTP(S) URLs, invalid URLs, non-image content, redirect loops, and added cache HIT/MISS tests without trailing whitespace.
- Tests added: `npm test tests/unit/server-config.test.js tests/unit/paths.test.js tests/unit/image-proxy.test.js tests/frontend/logo-proxy.test.js`.
- Manual verification: Automated route/helper tests verify proxy and local path behavior; real external-logo browser rendering remains on final manual checklist.

## PR #119

- Verdict: Accepted with corrections in commits `0878205` and `1baf4d7`.
- Upstream intent: Improve Chromecast casting for redirect profiles and refresh local playback when Cast ends.
- Implementation correctness: Correct after extracting URL/session helpers and avoiding double-prefix/double-encode URL bugs.
- Accepted changes: Cast URL profile replacement, redirect-profile `/stream` URL building, session-end cleanup, and local playback refresh.
- Corrections made: Preserved provider-qualified `userAgentId`, used canonical stream URL for token generation, and avoided static cast/player circular imports for refresh.
- Tests added: `npm test tests/frontend/cast-url.test.js tests/frontend/cast-session.test.js`.
- Manual verification: Automated URL/session behavior passes; real Chromecast device acceptance remains on final manual checklist.

## PR #109

- Verdict: Accepted as a corrected, sliced implementation across commits `d0450c4`, `af3f704`, `5414330`, `b50ad33`, `80dca91`, `281d25b`, `680e1ac`, `f0a62e9`, `1507aad`, and review-fix commit `e47b649`.
- Upstream intent: Add timeshift recording/playback with HLS, FFmpeg lifecycle management, configuration APIs, settings UI, and startup cleanup.
- Implementation correctness: Correct after TDD slices, reviewer-requested path traversal hardening, async startup error handling, and HLS fallback coverage.
- Accepted changes: Pinned HLS dependency, timeshift settings/schema, M3U parser, timeshift engine, playlist cleanup, admin/auth APIs, HLS player path, settings rendering, and startup wiring.
- Corrections made: Added unsafe channel ID rejection, segment traversal protection, async initialize error handling, safe settings rendering, and explicit HLS/mpegts fallback tests.
- Tests added: `npm test tests/frontend/timeshift-dependency.test.js tests/unit/timeshift-settings.test.js tests/unit/timeshift-schema.test.js tests/unit/m3u-parser.test.js tests/unit/timeshift-engine.test.js tests/unit/timeshift-playlist.test.js tests/integration/timeshift-api.test.js tests/frontend/timeshift-player.test.js tests/frontend/timeshift-settings-ui.test.js tests/unit/timeshift-startup.test.js`.
- Manual verification: Automated coverage verifies the isolated behavior; real FFmpeg stream recording, HLS seeking, and settings operation remain on final manual checklist.
