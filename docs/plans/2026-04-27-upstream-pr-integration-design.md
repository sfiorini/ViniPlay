# Upstream PR Integration Design

## Goal

Evaluate and integrate upstream ViniPlay PRs #114, #109, #116, and #119 into this fork with a strict test-first workflow. The work must identify incorrect or incomplete upstream implementation details, document required corrections, and implement only changes that are covered by automated tests and final smoke verification.

## Context

ViniPlay is a Node.js/Express backend with SQLite persistence and a modular vanilla JavaScript frontend under `public/js/modules`. The current project has no automated test harness and only a `start` npm script. The requested upstream PRs vary widely in risk:

- PR #116: small mobile navigation UI behavior fix.
- PR #114: local development data-directory support plus image proxy/logo proxy improvements.
- PR #119: Chromecast redirect-profile casting fix.
- PR #109: large timeshift/live TV rewind feature involving database schema, FFmpeg processes, HLS playlists, settings UI, and playback UI.

## Recommended Approach

Use test-first incremental integration per PR.

1. Add an automated test harness before merging PR behavior.
2. Integrate PRs in low-risk order: #116, #114, #119, #109.
3. For every PR, write failing tests for both the upstream intent and the corrections discovered during review.
4. Merge/adapt the upstream code only after tests exist.
5. Run targeted tests, syntax checks, whitespace checks, and then commit each verified milestone.

This approach provides traceability, isolates regressions, and avoids turning PR #109 into an unreviewable bulk merge.

## Alternatives Considered

### Merge all PRs first, then test and fix

This is faster initially but makes regressions hard to attribute. It is especially risky because PR #109 touches backend state, FFmpeg lifecycle, frontend playback, and settings UI.

### Reimplement PR behavior manually

This avoids inheriting upstream mistakes but costs more and risks drifting from upstream intent. It is only justified for PR #109 subcomponents if tests show the upstream implementation is unsafe or incomplete.

## Architecture

The test harness is the first deliverable. Backend behavior should be covered with Node test tooling and HTTP route tests where possible. Frontend behavior should be covered with jsdom-based tests or extracted pure helpers for deterministic logic such as Cast URL building and DOM class toggling.

Production refactors should be minimal and justified by testability. If server routes or helper logic are too tightly coupled to process startup, extract small pure/helper modules without changing runtime behavior.

## Components and PR Order

### Test Foundation

Add test tooling and scripts. Establish conventions for backend route/helper tests, frontend jsdom tests, syntax checks, and whitespace checks. Confirm tests can run without writing to `/data` or `/dvr` by using test/local data directories.

### PR #116: Mobile Navigation UI

Validate that opening the mobile menu removes `hidden`, removes `-translate-x-full`, adds `translate-x-0`, and shows the overlay. Validate that closing waits for the `transform` transition before hiding the menu and ignores unrelated transition events.

### PR #114: Local Dev and Image Proxy

Support `DATA_DIR` and `DVR_DIR` environment overrides without breaking Docker defaults. Harden `/api/image-proxy` so it only accepts HTTP(S), handles redirects safely, avoids double responses, drains/destroys redirected responses correctly, preserves cache behavior, and returns clear failures for invalid/non-image targets. Apply image proxy usage to guide/admin logo rendering without breaking local or placeholder images.

### PR #119: Chromecast Redirect Profile

Extract and test Cast URL construction. Ensure redirect profiles produce a proper `/stream` URL with the active Cast profile and user-agent settings. Ensure non-redirect stream URLs replace or append the Cast profile correctly. Ensure authentication token generation and cleanup use the correct canonical stream identity.

### PR #109: Timeshift

Treat timeshift as high-risk. Add tests before integration for schema/config defaults, admin-only configuration APIs, authenticated playback APIs, FFmpeg process start/stop/restart behavior via mocks, segment cleanup, playlist generation, and frontend player selection. The upstream implementation references `Hls` but the current `index.html` does not load hls.js, so the plan must include adding and testing that dependency path before enabling timeshift playback.

## Data Flow

- Settings load through `getSettings()` and are persisted in `settings.json` under the configured data directory.
- Image proxy requests validate and fetch remote image URLs, cache content under `IMAGE_CACHE_DIR`, then serve cached or fresh content.
- Cast playback derives a cast-compatible stream URL from current player settings, obtains a Cast token, and sends an absolute media URL to Chromecast.
- Timeshift configuration is admin-managed in SQLite. Enabled channels spawn FFmpeg processes that write HLS segments/playlists under the data directory. Authenticated clients read playlist/segment endpoints and the frontend uses HLS playback controls.

## Error Handling

- Tests must cover invalid input, unauthorized access, non-image image-proxy targets, redirect loops, missing channels, missing timeshift directories, FFmpeg process errors, and cleanup failures.
- Runtime behavior should avoid crashing the server for a single bad source, image, or timeshift channel.
- PR #109 must prevent orphaned FFmpeg processes during stop, restart, server shutdown, and disabled-channel transitions.

## Testing Strategy

Testing is mandatory and test-driven.

- Every story starts by writing a failing test.
- Implementation is the minimum required to make the test pass.
- Each story ends with targeted tests, syntax checks, `git diff --check`, and a local commit.
- Manual smoke checks are final verification only, not a substitute for automated tests.

Success criteria:

- All added tests pass.
- `node --check` passes for touched JavaScript files.
- `git diff --check` is clean.
- The app starts with test/local `DATA_DIR` and `DVR_DIR` overrides.
- Each PR has a documented assessment: accepted as-is, accepted with corrections, or reworked.
