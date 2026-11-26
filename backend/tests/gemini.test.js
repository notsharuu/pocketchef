import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scanFridgeWithGemini, normalizeScanResult } from '../src/services/gemini.js';

describe('scanFridgeWithGemini service', () => {
  test('throws 500 when GEMINI_API_KEY is not set', async () => {
    const original = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      await assert.rejects(
        async () => {
          await scanFridgeWithGemini({
            cleanBase64: 'aGVsbG8=',
            mimeType: 'image/jpeg',
          });
        },
        (err) => {
          assert.equal(err.status, 500);
          assert.match(err.message, /GEMINI_API_KEY is not configured/);
          return true;
        }
      );
    } finally {
      if (original) process.env.GEMINI_API_KEY = original;
    }
  });

  test('throws 502 when GEMINI_API_KEY is invalid during API call', async () => {
    process.env.GEMINI_API_KEY = 'invalid_test_key_xyz';

    await assert.rejects(
      async () => {
        await scanFridgeWithGemini({
          cleanBase64: 'aGVsbG8=',
          mimeType: 'image/jpeg',
        });
      },
      (err) => {
        assert.equal(err.status, 502);
        assert.match(err.message, /Gemini API call failed/);
        return true;
      }
    );
  });
});

describe('normalizeScanResult schema validator', () => {
  test('correctly normalizes items and notes structure', () => {
    const rawInput = {
      items: [
        { name: '  Potato  ', status: 'seen' },
        { name: 'GREEN CHILLI', status: 'maybe' },
        { name: 'Tomato', status: 'unknown_status' },
      ],
      notes: [
        '  Opaque stainless steel dabba on middle shelf - contents unknown  ',
        '',
      ],
    };

    const normalized = normalizeScanResult(rawInput);

    assert.deepEqual(normalized, {
      items: [
        { name: 'potato', status: 'seen' },
        { name: 'green chilli', status: 'maybe' },
        { name: 'tomato', status: 'maybe' }, // coerced unknown to maybe
      ],
      notes: [
        'Opaque stainless steel dabba on middle shelf - contents unknown',
      ],
    });
  });

  test('handles empty items and notes arrays', () => {
    const normalized = normalizeScanResult({ items: [], notes: [] });
    assert.deepEqual(normalized, { items: [], notes: [] });
  });

  test('throws 502 on invalid payload structure', () => {
    assert.throws(
      () => normalizeScanResult(null),
      (err) => err.status === 502
    );
  });
});
