import { describe, expect, it } from 'vitest';

async function loadSubject() {
  const modulePath = ['..', '..', 'public', 'js', 'modules', 'castUrl.js'].join('/');
  return import(modulePath);
}

describe('buildCastStreamUrl', () => {
  it('builds /stream URL for redirect profiles using encoded raw stream URL', async () => {
    const { buildCastStreamUrl } = await loadSubject();
    expect(buildCastStreamUrl({
      url: 'http://provider.test/live.ts?token=a b',
      origin: 'https://viniplay.test',
      activeCastProfileId: 'cast-default',
      activeUserAgentId: 'ua-1',
      activeStreamProfile: { command: 'redirect' }
    })).toBe('https://viniplay.test/stream?url=http%3A%2F%2Fprovider.test%2Flive.ts%3Ftoken%3Da%20b&profileId=cast-default&userAgentId=ua-1');
  });

  it('replaces existing profileId with active cast profile', async () => {
    const { buildCastStreamUrl } = await loadSubject();
    const url = buildCastStreamUrl({
      url: 'https://viniplay.test/stream?url=x&profileId=old',
      origin: 'https://viniplay.test',
      activeCastProfileId: 'cast-default',
      activeStreamProfile: { command: '-i {streamUrl}' }
    });
    expect(url).toContain('profileId=cast-default');
    expect(url).not.toContain('profileId=old');
  });

  it('appends cast profile when no profileId exists', async () => {
    const { buildCastStreamUrl } = await loadSubject();
    expect(buildCastStreamUrl({
      url: 'https://viniplay.test/stream?url=x',
      origin: 'https://viniplay.test',
      activeCastProfileId: 'cast-default',
      activeStreamProfile: { command: '-i {streamUrl}' }
    })).toBe('https://viniplay.test/stream?url=x&profileId=cast-default');
  });

  it('leaves URL unchanged when it already uses active cast profile', async () => {
    const { buildCastStreamUrl } = await loadSubject();
    expect(buildCastStreamUrl({
      url: 'https://viniplay.test/stream?url=x&profileId=cast-default',
      origin: 'https://viniplay.test',
      activeCastProfileId: 'cast-default',
      activeStreamProfile: { command: '-i {streamUrl}' }
    })).toBe('https://viniplay.test/stream?url=x&profileId=cast-default');
  });

  it('converts relative cast URLs to absolute URLs without double-prefixing absolute URLs', async () => {
    const { buildCastStreamUrl } = await loadSubject();
    expect(buildCastStreamUrl({
      url: '/stream?url=x',
      origin: 'https://viniplay.test',
      activeCastProfileId: 'cast-default',
      activeStreamProfile: { command: '-i {streamUrl}' }
    })).toBe('https://viniplay.test/stream?url=x&profileId=cast-default');
    expect(buildCastStreamUrl({
      url: 'https://other.test/stream?url=x',
      origin: 'https://viniplay.test',
      activeCastProfileId: 'cast-default',
      activeStreamProfile: { command: '-i {streamUrl}' }
    })).toBe('https://other.test/stream?url=x&profileId=cast-default');
  });

  it('preserves provider-qualified userAgentId when present', async () => {
    const { buildCastStreamUrl } = await loadSubject();
    expect(buildCastStreamUrl({
      url: 'https://viniplay.test/stream?url=x&userAgentId=provider%3Aua-1',
      origin: 'https://viniplay.test',
      activeCastProfileId: 'cast-default',
      activeUserAgentId: 'ua-2',
      activeStreamProfile: { command: '-i {streamUrl}' }
    })).toBe('https://viniplay.test/stream?url=x&userAgentId=provider%3Aua-1&profileId=cast-default');
  });
});
