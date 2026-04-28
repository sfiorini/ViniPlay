// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

function fakeMpegtsPlayer() {
  return {
    on: vi.fn(),
    attachMediaElement: vi.fn(),
    load: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    destroy: vi.fn()
  };
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<div id="video-modal" class="hidden"></div><div id="video-modal-container"><div class="flex justify-between"></div></div><video id="video-element"></video><h1 id="video-title"></h1>';
  HTMLMediaElement.prototype.load = vi.fn();
  global.chrome = { cast: { AutoJoinPolicy: { TAB_AND_ORIGIN_SCOPED: 'tab' } } };
  global.cast = { framework: { CastContext: { getInstance: () => ({ setOptions: vi.fn(), addEventListener: vi.fn(), getCurrentSession: () => null }) }, CastContextEventType: {}, RemotePlayer: vi.fn(), RemotePlayerController: vi.fn(() => ({ addEventListener: vi.fn() })), RemotePlayerEventType: {}, SessionState: {} } };
});

describe('timeshift player behavior', () => {
  it('falls back to normal mpegts playback when timeshift is disabled', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: false }) });
    global.mpegts = { Events: { ERROR: 'error', MEDIA_INFO: 'media_info' }, isSupported: () => true, createPlayer: vi.fn(() => fakeMpegtsPlayer()) };
    const { UIElements, guideState } = await import('../../public/js/modules/state.js');
    UIElements.videoModal = document.getElementById('video-modal');
    UIElements.videoModalContainer = document.getElementById('video-modal-container');
    UIElements.videoElement = document.getElementById('video-element');
    UIElements.videoTitle = document.getElementById('video-title');
    guideState.settings = { activeStreamProfileId: 'ffmpeg', activeUserAgentId: 'ua1', recentChannels: [], streamProfiles: [{ id: 'ffmpeg', command: '-i {streamUrl}', name: 'ffmpeg' }] };
    guideState.channels = [{ id: 'c1', logo: 'logo.png' }];

    const { playChannel } = await import('../../public/js/modules/player.js');
    await playChannel('http://provider/live.ts', 'Channel 1', 'c1');

    expect(fetch).toHaveBeenCalledWith('/api/timeshift/info/c1');
    expect(global.mpegts.createPlayer).toHaveBeenCalled();
  });

  it('uses Hls playback when timeshift is enabled and recording', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true, recording: true }) });
    global.mpegts = { Events: { ERROR: 'error', MEDIA_INFO: 'media_info' }, isSupported: () => true, createPlayer: vi.fn(() => fakeMpegtsPlayer()) };
    const hlsInstance = { loadSource: vi.fn(), attachMedia: vi.fn(), destroy: vi.fn() };
    global.Hls = vi.fn(() => hlsInstance);
    global.Hls.isSupported = () => true;
    const { UIElements, guideState } = await import('../../public/js/modules/state.js');
    UIElements.videoModal = document.getElementById('video-modal');
    UIElements.videoModalContainer = document.getElementById('video-modal-container');
    UIElements.videoElement = document.getElementById('video-element');
    UIElements.videoTitle = document.getElementById('video-title');
    guideState.settings = { activeStreamProfileId: 'ffmpeg', activeUserAgentId: 'ua1', recentChannels: [], streamProfiles: [{ id: 'ffmpeg', command: '-i {streamUrl}', name: 'ffmpeg' }] };
    guideState.channels = [{ id: 'c1', logo: 'logo.png' }];

    const { playChannel } = await import('../../public/js/modules/player.js');
    await playChannel('http://provider/live.ts', 'Channel 1', 'c1');

    expect(hlsInstance.loadSource).toHaveBeenCalledWith('/api/timeshift/stream/c1/playlist.m3u8');
    expect(hlsInstance.attachMedia).toHaveBeenCalledWith(UIElements.videoElement);
    expect(global.mpegts.createPlayer).not.toHaveBeenCalled();
  });
});
