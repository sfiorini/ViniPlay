const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const MAX_REDIRECTS = 5;
const CACHE_MAX_AGE = 'public, max-age=2592000';

function parseHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  return parsed;
}

function sendOnce(res, status, body) {
  if (!res.headersSent) {
    res.status(status).send(body);
  }
}

function requestUrl(url, { httpModule, httpsModule }) {
  const parsed = new URL(url);
  const transport = parsed.protocol === 'https:' ? httpsModule : httpModule;

  return new Promise((resolve, reject) => {
    const req = transport.get(parsed, {
      headers: {
        'User-Agent': 'ViniPlay Image Proxy',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    }, resolve);
    req.on('error', reject);
  });
}

async function fetchImage(url, deps, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) {
    const error = new Error('Too many redirects');
    error.statusCode = 508;
    throw error;
  }

  const response = await requestUrl(url, deps);
  const statusCode = response.statusCode || 0;

  if ([301, 302, 303, 307, 308].includes(statusCode)) {
    const location = response.headers.location;
    response.resume();
    if (!location) {
      const error = new Error('Redirect missing location');
      error.statusCode = 400;
      throw error;
    }

    const redirectedUrl = new URL(location, url).toString();
    if (!parseHttpUrl(redirectedUrl)) {
      const error = new Error('Invalid redirect URL');
      error.statusCode = 400;
      throw error;
    }

    return fetchImage(redirectedUrl, deps, redirectCount + 1);
  }

  if (statusCode < 200 || statusCode >= 300) {
    response.resume();
    const error = new Error(`Unexpected response status ${statusCode}`);
    error.statusCode = 502;
    throw error;
  }

  const contentType = response.headers['content-type'];
  if (!contentType || !contentType.toLowerCase().startsWith('image/')) {
    response.resume();
    const error = new Error('URL does not point to an image');
    error.statusCode = 400;
    throw error;
  }

  const chunks = [];
  for await (const chunk of response) {
    chunks.push(Buffer.from(chunk));
  }

  return {
    body: Buffer.concat(chunks),
    contentType
  };
}

function createImageProxyHandler({
  imageCacheDir,
  httpModule = http,
  httpsModule = https,
  fsModule = fs,
  cryptoModule = crypto
}) {
  return async function imageProxyHandler(req, res) {
    const imageUrl = req.query.url;

    if (!imageUrl) {
      return sendOnce(res, 400, 'Missing url parameter');
    }

    if (!parseHttpUrl(imageUrl)) {
      return sendOnce(res, 400, 'Invalid URL');
    }

    fsModule.mkdirSync(imageCacheDir, { recursive: true });

    const urlHash = cryptoModule.createHash('sha256').update(imageUrl).digest('hex');
    const cacheFilePath = path.join(imageCacheDir, urlHash);
    const cacheMetaPath = path.join(imageCacheDir, `${urlHash}.meta`);

    if (fsModule.existsSync(cacheFilePath) && fsModule.existsSync(cacheMetaPath)) {
      try {
        const meta = JSON.parse(fsModule.readFileSync(cacheMetaPath, 'utf8'));
        res.setHeader('Content-Type', meta.contentType);
        res.setHeader('Cache-Control', CACHE_MAX_AGE);
        res.setHeader('X-Cache', 'HIT');
        return res.send(fsModule.readFileSync(cacheFilePath));
      } catch (error) {
        try { fsModule.unlinkSync(cacheFilePath); } catch (_) { }
        try { fsModule.unlinkSync(cacheMetaPath); } catch (_) { }
      }
    }

    try {
      const image = await fetchImage(imageUrl, { httpModule, httpsModule });
      fsModule.writeFileSync(cacheFilePath, image.body);
      fsModule.writeFileSync(cacheMetaPath, JSON.stringify({
        url: imageUrl,
        contentType: image.contentType,
        cachedAt: new Date().toISOString()
      }, null, 2));

      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Cache-Control', CACHE_MAX_AGE);
      res.setHeader('X-Cache', 'MISS');
      return res.send(image.body);
    } catch (error) {
      return sendOnce(res, error.statusCode || 500, error.message || 'Failed to fetch image');
    }
  };
}

module.exports = { createImageProxyHandler };
