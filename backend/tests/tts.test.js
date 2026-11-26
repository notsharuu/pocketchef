import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import http from 'node:http';
import app from '../src/app.js';

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

describe('Multi-Language TTS Endpoints', () => {
  test('GET /api/tts/languages returns English and 11 Indian languages', async () => {
    const res = await request(app, { method: 'GET', url: '/api/tts/languages' });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.languages));
    assert.equal(res.body.languages.length, 12);
    const codes = res.body.languages.map((l) => l.code);
    assert.ok(codes.includes('en'));
    assert.ok(codes.includes('hi'));
    assert.ok(codes.includes('bn'));
    assert.ok(codes.includes('ta'));
  });

  test('POST /api/tts/prepare-step returns 400 when text is missing', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/tts/prepare-step',
      body: { targetLanguage: 'hi' },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /text is required/);
  });

  test('POST /api/tts/prepare-step passes through English text without API call', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/tts/prepare-step',
      body: {
        text: 'Heat mustard oil in a pan and add cumin seeds.',
        targetLanguage: 'en',
        recipeId: 'test-1',
        stepIndex: 0,
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.language, 'en');
    assert.equal(res.body.translatedText, 'Heat mustard oil in a pan and add cumin seeds.');
  });

  test('POST /api/tts/speak returns 400 when text is missing', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/tts/speak',
      body: { language: 'hi' },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /text is required/);
  });
});
