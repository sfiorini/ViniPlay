const express = require('express');
const fs = require('fs');
const nock = require('nock');
const path = require('path');
const request = require('supertest');
const tmp = require('tmp');

function appWithHandler(handler) {
  const app = express();
  app.get('/api/image-proxy', handler);
  return app;
}

function cacheDir() {
  return tmp.dirSync({ unsafeCleanup: true }).name;
}

describe('image proxy handler', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('rejects missing url with 400', async () => {
    const { createImageProxyHandler } = require('../../lib/imageProxy');
    const app = appWithHandler(createImageProxyHandler({ imageCacheDir: cacheDir() }));
    await request(app).get('/api/image-proxy').expect(400);
  });

  it('rejects invalid URL with 400', async () => {
    const { createImageProxyHandler } = require('../../lib/imageProxy');
    const app = appWithHandler(createImageProxyHandler({ imageCacheDir: cacheDir() }));
    await request(app).get('/api/image-proxy').query({ url: 'not a url' }).expect(400);
  });

  it('rejects non-http protocols such as file:', async () => {
    const { createImageProxyHandler } = require('../../lib/imageProxy');
    const app = appWithHandler(createImageProxyHandler({ imageCacheDir: cacheDir() }));
    await request(app).get('/api/image-proxy').query({ url: 'file:///etc/passwd' }).expect(400);
  });

  it('follows a relative HTTP redirect to an image', async () => {
    nock('http://image.test')
      .get('/logo')
      .reply(302, '', { location: '/logo.png' })
      .get('/logo.png')
      .reply(200, 'png-data', { 'content-type': 'image/png' });

    const { createImageProxyHandler } = require('../../lib/imageProxy');
    const app = appWithHandler(createImageProxyHandler({ imageCacheDir: cacheDir() }));
    const res = await request(app).get('/api/image-proxy').query({ url: 'http://image.test/logo' }).expect(200);

    expect(res.headers['content-type']).toMatch(/^image\/png/);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body.toString()).toBe('png-data');
  });

  it('rejects redirect loops after five redirects', async () => {
    nock('http://loop.test')
      .persist()
      .get('/logo')
      .reply(302, '', { location: '/logo' });

    const { createImageProxyHandler } = require('../../lib/imageProxy');
    const app = appWithHandler(createImageProxyHandler({ imageCacheDir: cacheDir() }));
    await request(app).get('/api/image-proxy').query({ url: 'http://loop.test/logo' }).expect(508);
  });

  it('rejects non-image content types', async () => {
    nock('http://text.test')
      .get('/not-image')
      .reply(200, 'hello', { 'content-type': 'text/plain' });

    const { createImageProxyHandler } = require('../../lib/imageProxy');
    const app = appWithHandler(createImageProxyHandler({ imageCacheDir: cacheDir() }));
    await request(app).get('/api/image-proxy').query({ url: 'http://text.test/not-image' }).expect(400);
  });

  it('serves a cached image on the second request with X-Cache HIT', async () => {
    const dir = cacheDir();
    nock('http://cache.test')
      .get('/logo.png')
      .once()
      .reply(200, 'cached-png', { 'content-type': 'image/png' });

    const { createImageProxyHandler } = require('../../lib/imageProxy');
    const app = appWithHandler(createImageProxyHandler({ imageCacheDir: dir }));

    const first = await request(app).get('/api/image-proxy').query({ url: 'http://cache.test/logo.png' }).expect(200);
    expect(first.headers['x-cache']).toBe('MISS');
    expect(fs.readdirSync(dir).some(file => path.extname(file) === '.meta')).toBe(true);

    const second = await request(app).get('/api/image-proxy').query({ url: 'http://cache.test/logo.png' }).expect(200);
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body.toString()).toBe('cached-png');
  });
});
