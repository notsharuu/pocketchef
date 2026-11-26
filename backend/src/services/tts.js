import { GoogleGenAI } from '@google/genai';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const TTS_SERVER_URL = process.env.TTS_SERVER_URL || 'http://127.0.0.1:3002';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', speechLocale: 'en-IN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', speechLocale: 'hi-IN' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', speechLocale: 'bn-IN' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', speechLocale: 'ta-IN' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', speechLocale: 'te-IN' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', speechLocale: 'mr-IN' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', speechLocale: 'gu-IN' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', speechLocale: 'kn-IN' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', speechLocale: 'ml-IN' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', speechLocale: 'pa-IN' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', speechLocale: 'or-IN' },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া', speechLocale: 'as-IN' },
];

const translationCache = new Map();
const audioCache = new Map();
const MAX_AUDIO_CACHE = 60;

function getCachedAudio(key) {
  if (!audioCache.has(key)) return null;
  const val = audioCache.get(key);
  audioCache.delete(key);
  audioCache.set(key, val);
  return val;
}

function setCachedAudio(key, value) {
  if (audioCache.size >= MAX_AUDIO_CACHE) {
    const oldestKey = audioCache.keys().next().value;
    audioCache.delete(oldestKey);
  }
  audioCache.set(key, value);
}

export function getLanguageMeta(code) {
  const norm = String(code || 'en').trim().toLowerCase();
  return SUPPORTED_LANGUAGES.find((l) => l.code === norm) || SUPPORTED_LANGUAGES[0];
}

export async function checkLocalTtsStatus() {
  const hasMacSay = process.platform === 'darwin';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${TTS_SERVER_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { online: hasMacSay, url: TTS_SERVER_URL, englishEngine: hasMacSay ? 'node-say' : 'device' };
    }
    const data = await res.json();
    return {
      online: true,
      url: TTS_SERVER_URL,
      englishEngine: hasMacSay ? 'node-say' : 'tts-server',
      indicModelLoaded: Boolean(data.indicModelLoaded),
    };
  } catch {
    return { online: hasMacSay, url: TTS_SERVER_URL, englishEngine: hasMacSay ? 'node-say' : 'device' };
  }
}

export async function translateStepOnDemand({ text, targetLanguage = 'en', recipeId = '', stepIndex = 0 }) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    const err = new Error('text is required');
    err.status = 400;
    throw err;
  }

  const langMeta = getLanguageMeta(targetLanguage);
  if (langMeta.code === 'en') {
    return {
      originalText: cleanText,
      translatedText: cleanText,
      language: 'en',
      speechLocale: langMeta.speechLocale,
      cached: true,
    };
  }

  const cacheKey = `${recipeId}:${stepIndex}:${langMeta.code}:${cleanText.slice(0, 48)}`;
  if (translationCache.has(cacheKey)) {
    return {
      originalText: cleanText,
      translatedText: translationCache.get(cacheKey),
      language: langMeta.code,
      speechLocale: langMeta.speechLocale,
      cached: true,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return {
      originalText: cleanText,
      translatedText: cleanText,
      language: langMeta.code,
      speechLocale: langMeta.speechLocale,
      cached: false,
      fallback: true,
    };
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const models = Array.from(
    new Set([primaryModel, 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash'])
  );

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Translate the following single Indian cooking instruction into natural, spoken ${langMeta.label} (${langMeta.nativeLabel}) in native ${langMeta.label} script. Keep familiar kitchen terms natural so it sounds like a helpful home cook reading aloud. Return ONLY the translated sentence, nothing else.\n\nInstruction: "${cleanText}"`;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ text: prompt }],
      });
      const out = response?.text?.trim();
      if (out) {
        translationCache.set(cacheKey, out);
        return {
          originalText: cleanText,
          translatedText: out,
          language: langMeta.code,
          speechLocale: langMeta.speechLocale,
          cached: false,
        };
      }
    } catch {
      // Try next fallback model
    }
  }

  return {
    originalText: cleanText,
    translatedText: cleanText,
    language: langMeta.code,
    speechLocale: langMeta.speechLocale,
    cached: false,
    fallback: true,
  };
}

/**
 * Translates an array of ingredient or pantry staple names into the target language in one cached call.
 */
export async function translateItemsList({ items = [], targetLanguage = 'en', recipeId = '' }) {
  const cleanItems = (Array.isArray(items) ? items : [])
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  const langMeta = getLanguageMeta(targetLanguage);
  if (cleanItems.length === 0 || langMeta.code === 'en') {
    return { items: cleanItems, language: langMeta.code, cached: true };
  }

  const cacheKey = `items:${recipeId}:${langMeta.code}:${cleanItems.join('|')}`;
  if (translationCache.has(cacheKey)) {
    return { items: translationCache.get(cacheKey), language: langMeta.code, cached: true };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return { items: cleanItems, language: langMeta.code, cached: false, fallback: true };
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const models = Array.from(
    new Set([primaryModel, 'gemini-3.5-flash-lite', 'gemini-flash-latest'])
  );

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Translate each cooking ingredient / pantry item below into natural ${langMeta.label} (${langMeta.nativeLabel}) in native ${langMeta.label} script. Return ONLY a valid JSON array of strings in the exact same order and length as the input.\n\nInput: ${JSON.stringify(cleanItems)}`;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ text: prompt }],
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response?.text || '[]');
      if (Array.isArray(parsed) && parsed.length === cleanItems.length) {
        const out = parsed.map((v, idx) => String(v || cleanItems[idx]).trim());
        translationCache.set(cacheKey, out);
        return { items: out, language: langMeta.code, cached: false };
      }
    } catch {
      // Try next model
    }
  }

  return { items: cleanItems, language: langMeta.code, cached: false, fallback: true };
}

/**
 * Formats English text with subtle Apple Speech Synthesis pacing tags for more natural delivery.
 */
function formatNaturalSayText(text) {
  return String(text || '')
    .replace(/,\s+/g, ', [[slnc 120]] ')
    .replace(/\.\s+/g, '. [[slnc 220]] ')
    .trim();
}

async function synthesizeEnglishWithNodeSay(text) {
  const voice = process.env.SAY_VOICE || 'Samantha';
  const rate = process.env.SAY_RATE || '180';
  const tmpWav = path.join(os.tmpdir(), `pocketchef-say-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  try {
    const formatted = formatNaturalSayText(text);
    await execFileAsync('say', [
      '-v', voice,
      '-r', String(rate),
      '-o', tmpWav,
      '--data-format=LEI16@22050',
      formatted,
    ], { timeout: 12000 });
    const buffer = await fs.promises.readFile(tmpWav);
    if (buffer.length <= 44) {
      throw new Error('Empty WAV output from macOS say');
    }
    return { buffer, contentType: 'audio/wav' };
  } finally {
    fs.promises.unlink(tmpWav).catch(() => {});
  }
}

export async function synthesizeWithLocalServer({ text, language = 'en' }) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    const err = new Error('text is required');
    err.status = 400;
    throw err;
  }

  const normLang = String(language || 'en').trim().toLowerCase();
  const cacheKey = `${normLang}:${cleanText}`;
  const cached = getCachedAudio(cacheKey);
  if (cached) {
    return cached;
  }

  // Use ultra-fast native Node macOS say for English (zero Python/model overhead)
  if (normLang === 'en' && process.platform === 'darwin') {
    try {
      const result = await synthesizeEnglishWithNodeSay(cleanText);
      setCachedAudio(cacheKey, result);
      return result;
    } catch {
      // Fall through to optional TTS server if macOS say fails
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${TTS_SERVER_URL}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, language: normLang }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      const err = new Error(`Local TTS server error (${res.status}): ${errText}`);
      err.status = 502;
      throw err;
    }

    const arrayBuf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'audio/wav';
    const result = { buffer: Buffer.from(arrayBuf), contentType };
    setCachedAudio(cacheKey, result);
    return result;
  } catch (err) {
    if (err.status) throw err;
    const offlineErr = new Error(`Local TTS server is not running at ${TTS_SERVER_URL}`);
    offlineErr.status = 503;
    throw offlineErr;
  }
}
