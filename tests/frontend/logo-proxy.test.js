import { describe, expect, it } from 'vitest';

async function loadSubject() {
  const modulePath = ['..', '..', 'public', 'js', 'modules', 'imageProxyUrl.js'].join('/');
  return import(modulePath);
}

describe('toImageProxyUrl', () => {
  it('wraps http logos with /api/image-proxy', async () => {
    const { toImageProxyUrl } = await loadSubject();
    expect(toImageProxyUrl('http://logo.test/a.png')).toBe('/api/image-proxy?url=http%3A%2F%2Flogo.test%2Fa.png');
  });

  it('wraps https logos with /api/image-proxy', async () => {
    const { toImageProxyUrl } = await loadSubject();
    expect(toImageProxyUrl('https://logo.test/a.png?x=1')).toBe('/api/image-proxy?url=https%3A%2F%2Flogo.test%2Fa.png%3Fx%3D1');
  });

  it('does not wrap relative or data URLs', async () => {
    const { toImageProxyUrl } = await loadSubject();
    expect(toImageProxyUrl('/local.png')).toBe('/local.png');
    expect(toImageProxyUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('returns empty values unchanged', async () => {
    const { toImageProxyUrl } = await loadSubject();
    expect(toImageProxyUrl('')).toBe('');
    expect(toImageProxyUrl(null)).toBe(null);
    expect(toImageProxyUrl(undefined)).toBe(undefined);
  });
});
