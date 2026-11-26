import { Router } from 'express';
import { parseImagesPayload } from '../utils/image.js';
import { scanFridgeWithGemini } from '../services/gemini.js';

const router = Router();

/**
 * POST /api/scan-fridge
 * Analyzes one or multiple base64 fridge images and returns unified detected items and notes.
 * Body can be:
 *   - Single image: { imageBase64: string, mimeType?: string }
 *   - Multiple images: { images: [{ imageBase64: string, mimeType?: string }, ...] }
 */
router.post('/scan-fridge', async (req, res, next) => {
  try {
    const parsedImages = parseImagesPayload(req.body);
    const result = await scanFridgeWithGemini(parsedImages);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

export default router;
