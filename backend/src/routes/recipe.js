import { Router } from 'express';
import { generateRecipesWithGemini } from '../services/recipe.js';
import {
  isVectorDbReady,
  getVectorDbStats,
  searchRecipesByVector,
} from '../services/vectorDb.js';
import { findRecipeYouTubeVideo } from '../services/youtube.js';

const router = Router();

/**
 * GET /api/recipes/stats
 * Returns metadata about the unified Indian recipe Vector Database.
 */
router.get('/recipes/stats', (req, res) => {
  return res.status(200).json(getVectorDbStats());
});

/**
 * GET /api/recipes/search?q=...&limit=9
 * Semantic vector search across all 7,400+ indexed Indian dishes.
 */
router.get('/recipes/search', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 9));

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const result = await searchRecipesByVector({ query: q, limit });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/recipes/video?title=...&cuisine=...
 * Looks up an embeddable YouTube cooking tutorial video for a recipe.
 */
router.get('/recipes/video', async (req, res) => {
  const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
  const cuisine = typeof req.query.cuisine === 'string' ? req.query.cuisine.trim() : '';

  if (!title) {
    return res.status(400).json({ error: 'Query parameter "title" is required' });
  }

  const video = await findRecipeYouTubeVideo({ title, cuisine });
  return res.status(200).json(video);
});

/**
 * POST /api/generate-recipes
 * Retrieves traditional and classic Indian recipes from the unified Vector Database
 * based on detected fridge ingredients, notes, and preferences.
 * Falls back to Gemini only if the Vector DB has not been built yet or useAi=true is explicitly passed.
 */
router.post('/generate-recipes', async (req, res, next) => {
  try {
    const { ingredients, notes, preferences, categories, limit, useAi } = req.body || {};

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'ingredients is required and must be a non-empty array of strings' });
    }

    if (!useAi && isVectorDbReady()) {
      const result = await searchRecipesByVector({
        ingredients,
        notes,
        preferences,
        categories,
        limit: Math.min(24, Math.max(3, parseInt(limit, 10) || 9)),
      });
      return res.status(200).json(result);
    }

    const recipes = await generateRecipesWithGemini({
      ingredients,
      notes,
      preferences,
    });

    return res.status(200).json(recipes);
  } catch (err) {
    return next(err);
  }
});

export default router;
