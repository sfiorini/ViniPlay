// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<div id="timeshift-channels-list"></div>';
  global.chrome = { cast: { AutoJoinPolicy: { TAB_AND_ORIGIN_SCOPED: 'tab' } } };
  global.cast = { framework: { CastContext: { getInstance: () => ({ setOptions: vi.fn(), addEventListener: vi.fn(), getCurrentSession: () => null }) }, CastContextEventType: {}, RemotePlayer: vi.fn(), RemotePlayerController: vi.fn(() => ({ addEventListener: vi.fn() })), RemotePlayerEventType: {}, SessionState: {} } };
});

describe('timeshift settings UI', () => {
  it('escapes channel names rendered into HTML', async () => {
    const { renderTimeshiftChannels } = await import('../../public/js/modules/settings.js');
    renderTimeshiftChannels([{ channel_id: 'c1', channel_name: '<img src=x onerror=alert(1)>', max_duration_hours: 3, is_enabled: 1 }], []);
    expect(document.body.innerHTML).not.toContain('onerror=');
    expect(document.body.textContent).toContain('<img src=x');
  });
});
