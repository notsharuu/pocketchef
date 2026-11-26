import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import http from 'node:http';
import app from '../src/app.js';
import { isVectorDbReady } from '../src/services/vectorDb.js';

function request(expressApp, { method = 'POST', url = '/', body = null, headers = {} } = {}) {
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

describe('Recipe & Vector DB Endpoints', () => {
  test('POST /api/generate-recipes returns 400 when ingredients is missing', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/generate-recipes',
      body: {},
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /ingredients is required/);
  });

  test('POST /api/generate-recipes returns 400 when ingredients is empty array', async () => {
    const res = await request(app, {
      method: 'POST',
      url: '/api/generate-recipes',
      body: { ingredients: [] },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /ingredients is required/);
  });

  test('GET /api/recipes/search returns 400 when q is missing', async () => {
    const res = await request(app, {
      method: 'GET',
      url: '/api/recipes/search',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Query parameter "q" is required/);
  });

  test('POST /api/generate-recipes with useAi=true returns 500 when GEMINI_API_KEY is not configured', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const res = await request(app, {
        method: 'POST',
        url: '/api/generate-recipes',
        body: {
          ingredients: ['potato', 'tomato', 'green chilli'],
          useAi: true,
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

  test('Vector DB powers /api/recipes/stats, /api/recipes/search, and /api/generate-recipes without GEMINI_API_KEY', async (t) => {
    if (!isVectorDbReady()) {
      t.skip('Vector DB not built yet');
      return;
    }

    const statsRes = await request(app, {
      method: 'GET',
      url: '/api/recipes/stats',
    });
    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.body.ready, true);
    assert.ok(statsRes.body.count > 7000, `Expected >7000 recipes, got ${statsRes.body.count}`);

    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const genRes = await request(app, {
        method: 'POST',
        url: '/api/generate-recipes',
        body: {
          ingredients: ['potato', 'tomato', 'onion', 'green chilli'],
          preferences: 'traditional',
          limit: 9,
        },
      });
      assert.equal(genRes.status, 200);
      assert.equal(genRes.body.engine, 'vector-db');
      assert.ok(Array.isArray(genRes.body.recipes) && genRes.body.recipes.length >= 3);

      const categories = new Set(genRes.body.recipes.map((r) => r.category));
      assert.ok(categories.has('Known Classic'), 'Should include Known Classic');
      assert.ok(categories.has('Local Traditional'), 'Should include Local Traditional');

      const firstNutrition = genRes.body.recipes[0].nutrition;
      assert.ok(firstNutrition && typeof firstNutrition.calories === 'number', 'Should include estimated calories');
      assert.ok(typeof firstNutrition.proteinGrams === 'number', 'Should include proteinGrams');
      assert.ok(typeof firstNutrition.carbsGrams === 'number', 'Should include carbsGrams');
      assert.ok(typeof firstNutrition.fatGrams === 'number', 'Should include fatGrams');

      const searchRes = await request(app, {
        method: 'GET',
        url: '/api/recipes/search?q=bengali+potato+fish+or+vegetable&limit=5',
      });
      assert.equal(searchRes.status, 200);
      assert.equal(searchRes.body.recipes.length, 5);

      const nonVegRes = await request(app, {
        method: 'POST',
        url: '/api/generate-recipes',
        body: {
          ingredients: ['potato', 'tomato', 'onion'],
          categories: ['Non-Vegetarian'],
          limit: 6,
        },
      });
      assert.equal(nonVegRes.status, 200);
      assert.ok(nonVegRes.body.recipes.length > 0);
      for (const r of nonVegRes.body.recipes) {
        assert.doesNotMatch(r.title, /paneer|aloo gobi|dal tadka/i);
      }
    } finally {
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    }
  });
});
