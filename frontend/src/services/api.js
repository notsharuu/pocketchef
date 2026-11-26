/**
 * Centralized PocketChef API client with consistent timeout and error handling.
 */

async function requestJson(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const externalSignal = options.signal;

  if (externalSignal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let timedOut = false;
  const timer = timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : null;
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Server returned error (${res.status})`);
    }
    return data;
  } catch (err) {
    if (timedOut) {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`);
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export async function checkBackendHealth(backendUrl) {
  await requestJson(`${backendUrl}/health`, {}, 4000);
  return true;
}

export async function fetchDbCategories(backendUrl) {
  const stats = await requestJson(`${backendUrl}/api/recipes/stats`, {}, 6000);
  if (!stats.ready) return null;

  return {
    styles:
      Object.keys(stats.categories || {}).length > 0
        ? Object.keys(stats.categories)
        : ['Known Classic', 'Local Traditional', 'Quick Everyday'],
    courses:
      Array.isArray(stats.courses) && stats.courses.length > 0
        ? stats.courses.map((c) => c.name)
        : ['Lunch', 'Dinner', 'Snack', 'Breakfast'],
    diets:
      Array.isArray(stats.diets) && stats.diets.length > 0
        ? stats.diets.map((d) => d.name)
        : ['Vegetarian', 'Non-Vegetarian', 'Eggetarian'],
  };
}

export async function fetchTtsInfo(backendUrl) {
  const [langData, statusData] = await Promise.all([
    requestJson(`${backendUrl}/api/tts/languages`, {}, 5000).catch(() => null),
    requestJson(`${backendUrl}/api/tts/status`, {}, 5000).catch(() => null),
  ]);

  return {
    languages: Array.isArray(langData?.languages) ? langData.languages : null,
    online: Boolean(statusData?.online),
  };
}

export function scanFridgeImages(backendUrl, imagesPayload) {
  return requestJson(
    `${backendUrl}/api/scan-fridge`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: imagesPayload }),
    },
    180000
  );
}

export function generateRecipes(backendUrl, { ingredients, notes, categories, limit = 12 }) {
  return requestJson(
    `${backendUrl}/api/generate-recipes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, notes, categories, limit }),
    },
    30000
  );
}

export function prepareSpeechStep(backendUrl, { text, targetLanguage, recipeId, stepIndex }, signal) {
  return requestJson(
    `${backendUrl}/api/tts/prepare-step`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ text, targetLanguage, recipeId, stepIndex }),
    },
    15000
  );
}

export function translateItemsBatch(backendUrl, { items, targetLanguage, recipeId }, signal) {
  return requestJson(
    `${backendUrl}/api/tts/translate-items`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ items, targetLanguage, recipeId }),
    },
    15000
  );
}

export function buildSpeakAudioUrl(backendUrl, { text, language }) {
  return `${backendUrl}/api/tts/speak?text=${encodeURIComponent(text)}&language=${encodeURIComponent(language)}`;
}
