/**
 * Validates and extracts image payload for scanning.
 * Supports raw base64 and data URLs (e.g. data:image/jpeg;base64,...).
 *
 * @param {Object} params
 * @param {string} params.imageBase64
 * @param {string} [params.mimeType]
 * @returns {{ cleanBase64: string, mimeType: string }}
 */
export function parseImageInput({ imageBase64, mimeType } = {}) {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    const error = new Error('imageBase64 is required and must be a non-empty string');
    error.status = 400;
    throw error;
  }

  const trimmed = imageBase64.trim();
  if (trimmed === '') {
    const error = new Error('imageBase64 cannot be an empty string');
    error.status = 400;
    throw error;
  }

  let cleanBase64 = trimmed;
  let detectedMime = null;

  // Check for data URL format: data:<mimeType>;base64,<data>
  const dataUrlMatch = trimmed.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/s);
  if (dataUrlMatch) {
    detectedMime = dataUrlMatch[1];
    cleanBase64 = dataUrlMatch[2].trim();
  }

  if (cleanBase64 === '') {
    const error = new Error('imageBase64 contains empty base64 payload after stripping data URL prefix');
    error.status = 400;
    throw error;
  }

  // Validate base64 characters
  // Base64 strings consist of A-Z, a-z, 0-9, +, /, and = padding
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  // Strip whitespace/newlines if any before check
  const sanitized = cleanBase64.replace(/\s+/g, '');
  if (!base64Regex.test(sanitized)) {
    const error = new Error('imageBase64 contains invalid characters for base64 encoding');
    error.status = 400;
    throw error;
  }

  // Determine final MIME type: explicit mimeType parameter > detected from data URL > default 'image/jpeg'
  let resolvedMime = 'image/jpeg';
  if (mimeType && typeof mimeType === 'string' && mimeType.trim() !== '') {
    resolvedMime = mimeType.trim().toLowerCase();
  } else if (detectedMime) {
    resolvedMime = detectedMime.toLowerCase();
  }

  return {
    cleanBase64: sanitized,
    mimeType: resolvedMime,
  };
}

/**
 * Validates request payload supporting either a single image or an array of bundled images.
 *
 * @param {Object} body
 * @param {string} [body.imageBase64]
 * @param {string} [body.mimeType]
 * @param {Array<{ imageBase64: string, mimeType?: string }>} [body.images]
 * @returns {Array<{ cleanBase64: string, mimeType: string }>}
 */
export function parseImagesPayload(body = {}) {
  if (Array.isArray(body.images)) {
    if (body.images.length === 0) {
      const error = new Error('images array cannot be empty');
      error.status = 400;
      throw error;
    }
    if (body.images.length > 8) {
      const error = new Error('Maximum 8 images allowed per whole fridge scan');
      error.status = 400;
      throw error;
    }
    return body.images.map((item, index) => {
      try {
        return parseImageInput(item);
      } catch (err) {
        const error = new Error(`Image at index ${index} is invalid: ${err.message}`);
        error.status = 400;
        throw error;
      }
    });
  }

  if (body.imageBase64) {
    return [parseImageInput(body)];
  }

  const error = new Error('imageBase64 or an array of images is required');
  error.status = 400;
  throw error;
}
