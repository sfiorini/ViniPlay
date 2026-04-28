// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

async function loadSubject() {
  const modulePath = ['..', '..', 'public', 'js', 'modules', 'castSession.js'].join('/');
  return import(modulePath);
}

describe('cast session end handling', () => {
  it('stops cast stream, clears state, updates UI, and refreshes local playback', async () => {
    const { handleCastSessionEnded } = await loadSubject();
    const castState = { currentCastStreamUrl: 'http://provider/live.ts', session: {}, isCasting: true, currentMedia: {} };
    const stopCastStream = vi.fn();
    const updatePlayerUI = vi.fn();
    const forceRefreshStream = vi.fn().mockResolvedValue(undefined);
    await handleCastSessionEnded({ castState, stopCastStream, updatePlayerUI, forceRefreshStream, showNotification: vi.fn() });
    expect(stopCastStream).toHaveBeenCalledWith('http://provider/live.ts');
    expect(castState.currentCastStreamUrl).toBe(null);
    expect(castState.session).toBe(null);
    expect(castState.isCasting).toBe(false);
    expect(castState.currentMedia).toBe(null);
    expect(updatePlayerUI).toHaveBeenCalled();
    expect(forceRefreshStream).toHaveBeenCalled();
  });
});
