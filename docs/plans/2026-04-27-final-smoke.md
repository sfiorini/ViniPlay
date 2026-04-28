# Final Smoke Verification

## Automated Smoke Completed

- `npm test` passed with 62 tests.
- `npm run check:syntax` passed.
- `npm run check:diff` passed.
- `node scripts/smoke-local-start.js` passed with temporary `DATA_DIR` and `DVR_DIR`.
- `tests/integration/final-smoke.test.js` validates local startup and `/api/auth/needs-setup` response.

## Manual Browser/Device Checklist Status

The following checks require real browser/device/media infrastructure and cannot be honestly executed by the headless coding agent without user-provided access to those devices/streams:

- First-time setup page renders in a browser.
- Settings page renders with local data dirs.
- Mobile nav opens and closes on mobile viewport.
- External channel logo renders through `/api/image-proxy`.
- Chromecast device accepts the generated Cast media URL.
- Admin can enable timeshift for a real playable channel.
- Timeshift playback uses HLS controls with a real stream and normal playback otherwise.

## Required User-Side Manual Runbook

Before pushing or releasing, run:

1. Start the app from this branch.
2. Open the first-time setup page in a browser and confirm it renders.
3. Open Settings and confirm the timeshift section renders.
4. Use a mobile viewport and confirm mobile nav opens/closes.
5. Load a channel with an external logo and confirm the image proxy serves it.
6. Cast a playable channel to a Chromecast device and confirm playback URL acceptance.
7. Enable timeshift for a real playable channel and confirm HLS playback/normal fallback behavior.

If any manual check fails, fix forward with a regression test or revert the failing story commit before push/release.
