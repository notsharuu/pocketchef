import { Router } from 'express';
import {
  SUPPORTED_LANGUAGES,
  checkLocalTtsStatus,
  translateStepOnDemand,
  translateItemsList,
  synthesizeWithLocalServer,
} from '../services/tts.js';

const router = Router();

router.get('/tts/languages', (req, res) => {
  return res.status(200).json({ languages: SUPPORTED_LANGUAGES });
});

router.get('/tts/status', async (req, res) => {
  const status = await checkLocalTtsStatus();
  return res.status(200).json(status);
});

router.post('/tts/prepare-step', async (req, res, next) => {
  try {
    const { text, targetLanguage, recipeId, stepIndex } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    const result = await translateStepOnDemand({
      text,
      targetLanguage,
      recipeId,
      stepIndex,
    });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/tts/translate-items', async (req, res, next) => {
  try {
    const { items, targetLanguage, recipeId } = req.body || {};
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array of strings' });
    }
    const result = await translateItemsList({ items, targetLanguage, recipeId });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

router.get('/tts/speak', async (req, res, next) => {
  try {
    const text = typeof req.query.text === 'string' ? req.query.text : '';
    const language = typeof req.query.language === 'string' ? req.query.language : 'en';
    if (!text.trim()) {
      return res.status(400).json({ error: 'text query parameter is required' });
    }
    const { buffer, contentType } = await synthesizeWithLocalServer({ text, language });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const parsedEnd = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
      const end = Math.min(buffer.length - 1, Number.isNaN(parsedEnd) ? buffer.length - 1 : parsedEnd);

      if (Number.isNaN(start) || start < 0 || start >= buffer.length || end < start) {
        res.setHeader('Content-Range', `bytes */${buffer.length}`);
        return res.status(416).end();
      }

      const chunk = buffer.subarray(start, end + 1);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${buffer.length}`);
      res.setHeader('Content-Length', chunk.length);
      return res.status(206).send(chunk);
    }

    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (err) {
    return next(err);
  }
});

router.post('/tts/speak', async (req, res, next) => {
  try {
    const { text, language } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    const { buffer, contentType } = await synthesizeWithLocalServer({ text, language });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (err) {
    return next(err);
  }
});

export default router;
