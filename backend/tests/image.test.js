import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseImageInput, parseImagesPayload } from '../src/utils/image.js';

describe('parseImageInput utility', () => {
  test('rejects missing imageBase64', () => {
    assert.throws(
      () => parseImageInput({}),
      (err) => err.status === 400 && err.message.includes('imageBase64 is required')
    );
  });

  test('rejects non-string imageBase64', () => {
    assert.throws(
      () => parseImageInput({ imageBase64: 12345 }),
      (err) => err.status === 400 && err.message.includes('imageBase64 is required')
    );
  });

  test('rejects empty string imageBase64', () => {
    assert.throws(
      () => parseImageInput({ imageBase64: '   ' }),
      (err) => err.status === 400 && err.message.includes('cannot be an empty string')
    );
  });

  test('handles clean raw base64 string and defaults to image/jpeg', () => {
    const raw = 'aGVsbG8gd29ybGQ=';
    const result = parseImageInput({ imageBase64: raw });
    assert.equal(result.cleanBase64, 'aGVsbG8gd29ybGQ=');
    assert.equal(result.mimeType, 'image/jpeg');
  });

  test('strips data URL prefix and detects mimeType from data URL', () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8gd29ybGQ=';
    const result = parseImageInput({ imageBase64: dataUrl });
    assert.equal(result.cleanBase64, 'aGVsbG8gd29ybGQ=');
    assert.equal(result.mimeType, 'image/png');
  });

  test('prefers explicitly provided mimeType over data URL detected mimeType', () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8gd29ybGQ=';
    const result = parseImageInput({ imageBase64: dataUrl, mimeType: 'image/webp' });
    assert.equal(result.cleanBase64, 'aGVsbG8gd29ybGQ=');
    assert.equal(result.mimeType, 'image/webp');
  });

  test('rejects invalid base64 encoding characters', () => {
    assert.throws(
      () => parseImageInput({ imageBase64: 'not-valid-base64!@#$' }),
      (err) => err.status === 400 && err.message.includes('invalid characters')
    );
  });

  test('rejects empty payload when only data URL header is sent', () => {
    assert.throws(
      () => parseImageInput({ imageBase64: 'data:image/jpeg;base64,' }),
      (err) => err.status === 400 && err.message.includes('empty base64 payload')
    );
  });
});

describe('parseImagesPayload multi-image utility', () => {
  test('handles single imageBase64 backward compatibility', () => {
    const result = parseImagesPayload({ imageBase64: 'aGVsbG8=' });
    assert.equal(result.length, 1);
    assert.equal(result[0].cleanBase64, 'aGVsbG8=');
  });

  test('handles array of multiple valid images', () => {
    const result = parseImagesPayload({
      images: [
        { imageBase64: 'aGVsbG8=' },
        { imageBase64: 'data:image/png;base64,d29ybGQ=' },
      ],
    });
    assert.equal(result.length, 2);
    assert.equal(result[0].mimeType, 'image/jpeg');
    assert.equal(result[1].mimeType, 'image/png');
  });

  test('rejects empty images array', () => {
    assert.throws(
      () => parseImagesPayload({ images: [] }),
      (err) => err.status === 400 && err.message.includes('cannot be empty')
    );
  });

  test('rejects more than 8 images', () => {
    const nineImages = Array.from({ length: 9 }, () => ({ imageBase64: 'aGVsbG8=' }));
    assert.throws(
      () => parseImagesPayload({ images: nineImages }),
      (err) => err.status === 400 && err.message.includes('Maximum 8 images allowed')
    );
  });

  test('identifies invalid image in array with index', () => {
    assert.throws(
      () =>
        parseImagesPayload({
          images: [{ imageBase64: 'aGVsbG8=' }, { imageBase64: 'bad!@#' }],
        }),
      (err) => err.status === 400 && err.message.includes('Image at index 1 is invalid')
    );
  });
});
