import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import http from 'node:http';
import app from '../src/app.js';

/**
 * In-memory HTTP dispatcher for Express apps.
 * Avoids raw TCP socket binds and runs seamlessly in sandboxed environments.
 */
function request(expressApp, { method = 'GET', url = '/', body = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let payload = '';
    const reqHeaders = { ...headers };

    if (body !== null && body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      if (!reqHeaders['content-type'] && !reqHeaders['Content-Type']) {
        reqHeaders['content-type'] = 'application/json';
      }
      reqHeaders['content-length'] = Buffer.byteLength(payload).toString();
    }

    const reqStream = Readable.from(payload ? [Buffer.from(payload)] : []);
    const req = Object.assign(reqStream, {
      method,
      url,
      originalUrl: url,
      headers: reqHeaders,
    });

    const res = new http.ServerResponse(req);
    let responseData = '';

    res.write = (chunk) => {
      if (chunk) responseData += chunk;
      return true;
    };

    res.end = (chunk) => {
      if (chunk) responseData += chunk;
      let parsed = null;
      try {
        parsed = JSON.parse(responseData);
      } catch {
        parsed = responseData;
      }
      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsed,
      });
    };

    try {
      expressApp.handle(req, res, (err) => {
        if (err) reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

describe('Ayamaa Backend Endpoints', () => {
  test('GET /health returns 200 with { status: "ok" }', async () => {
    const res = await request(app, { method: 'GET', url: '/health' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  test('POST /api/scan-fridge returns 400 when body is missing imageBase64 or images', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/scan-fridge',
      body: {},
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /imageBase64 or an array of images is required/);
  });

  test('POST /api/scan-fridge returns 400 when images array is empty', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/scan-fridge',
      body: { images: [] },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /cannot be empty/);
  });

  test('POST /api/scan-fridge accepts valid multi-image bundle', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const res = await request(app, {
        method: 'POST',
        url: '/api/scan-fridge',
        body: {
          images: [
            { imageBase64: 'aGVsbG8=' },
            { imageBase64: 'd29ybGQ=' },
          ],
        },
      });
      assert.equal(res.status, 500);
      assert.match(res.body.error, /GEMINI_API_KEY is not configured/);
    } finally {
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    }
  });

  test('POST /api/scan-fridge returns 400 when imageBase64 is empty string', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/scan-fridge',
      body: { imageBase64: '   ' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /cannot be an empty string/);
  });

  test('POST /api/scan-fridge returns 400 when imageBase64 has invalid characters', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/scan-fridge',
      body: { imageBase64: 'bad characters!@#$' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /invalid characters/);
  });

  test('POST /api/scan-fridge returns 400 when data URL has empty base64 payload', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/scan-fridge',
      body: { imageBase64: 'data:image/jpeg;base64,' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /empty base64 payload/);
  });

  test('POST /api/scan-fridge returns 500 when GEMINI_API_KEY is not configured', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const res = await request(app, {
        method: 'POST',
        url: '/api/scan-fridge',
        body: {
          imageBase64: 'aGVsbG8gd29ybGQ=',
        },
      });
      assert.equal(res.status, 500);
      assert.ok(res.body.error);
      assert.match(res.body.error, /GEMINI_API_KEY is not configured/);
    } finally {
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    }
  });

  test('GET /unknown-route returns 404', async () => {
    const res = await request(app, { method: 'GET', url: '/random-route' });
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
    assert.match(res.body.error, /Not found/);
  });

  test('Handles malformed JSON request body with 400', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/scan-fridge',
      body: '{ not valid json',
      headers: { 'content-type': 'application/json' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /Invalid JSON/);
  });
});
