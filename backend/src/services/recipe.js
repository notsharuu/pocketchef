import { GoogleGenAI, Type } from '@google/genai';
import { estimateRecipeNutrition } from './nutrition.js';

const RECIPE_SYSTEM_PROMPT = `You are PocketChef's master Indian chef and culinary historian.
Your task is to take a list of available ingredients detected from a user's refrigerator, along with any storage container observations (like steel dabbas with leftovers or curd), and generate a diverse set of authentic Indian recipes.

CRITICAL DIVERSITY REQUIREMENT:
You must provide a spectrum of recipes ranging from:
1. "Known Classic": Beloved mainstream Indian dishes that everyone recognizes (e.g., Paneer Bhurji, Aloo Matar, Dal Tadka, Jeera Aloo, Kadai Veg).
2. "Local Traditional": Deeply regional, rural, and ancestral home-style specialties from across India (e.g., Bihari Aloo Chokha, Bengali Aloo Posto/Chorchori, Maharashtrian Pithla/Bharli Vangi, South Indian Kootu/Mor Kuzhambu/Poriyal, Rajasthani Pitod/Gatta, Gujarati Sev Tameta, Odia Dalma/Santula, Kashmiri Dum Aloo, etc.).
3. "Quick Everyday": Simple, zero-waste weekday dishes that quickly utilize what's in the fridge in under 20 minutes.

INDIAN CULINARY PRINCIPLES:
- Assume basic Indian pantry essentials are available (cooking oil, mustard oil, ghee, salt, turmeric/haldi, red chilli powder, cumin/jeera, mustard seeds/rai, asafoetida/hing) unless specified otherwise.
- Explicitly state which ingredients are utilized from the user's fridge and which basic staples are needed.
- If storage notes mention closed containers (e.g., steel dabbas with possible curd, leftover dal, boiled potatoes, or milk pateelas), suggest ways to repurpose or complement them.
- Provide practical, authentic, and step-by-step cooking steps with a traditional "Chef's Secret" tip for achieving authentic ghar-ka-swad.

OUTPUT FORMAT:
Return valid JSON adhering to the schema containing an array of 3 to 6 distinct recipes.`;

/**
 * Generates authentic Indian recipes from ingredients and notes.
 *
 * @param {Object} params
 * @param {string[]} params.ingredients
 * @param {string[]} [params.notes]
 * @param {string} [params.preferences]
 * @returns {Promise<{ recipes: Array<Object> }>}
 */
export async function generateRecipesWithGemini({ ingredients, notes = [], preferences = '' }) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    const error = new Error('ingredients must be a non-empty array of strings');
    error.status = 400;
    throw error;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const error = new Error('GEMINI_API_KEY is not configured on the server. Please set it in your .env file.');
    error.status = 500;
    throw error;
  }

  const cleanIngredients = ingredients
    .filter((item) => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim().toLowerCase());

  if (cleanIngredients.length === 0) {
    const error = new Error('No valid ingredient names provided');
    error.status = 400;
    throw error;
  }

  const promptContent = `AVAILABLE INGREDIENTS FROM FRIDGE:
${cleanIngredients.join(', ')}

${notes.length > 0 ? `CONTAINER & PACKAGING NOTES:\n${notes.join('\n')}\n` : ''}
${preferences ? `USER PREFERENCES OR CUSTOM REQUEST:\n${preferences}\n` : ''}

Generate 3 to 6 recipes ranging from widely known classics to extremely local traditional regional Indian dishes.`;

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const candidateModels = Array.from(
    new Set([
      primaryModel,
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
    ])
  );

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (initErr) {
    const error = new Error(`Failed to initialize Gemini client: ${initErr.message}`);
    error.status = 500;
    throw error;
  }

  let response = null;
  let lastError = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    let attempt = 0;
    const maxAttemptsForModel = 2;

    while (attempt < maxAttemptsForModel) {
      attempt++;
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            { text: RECIPE_SYSTEM_PROMPT },
            { text: promptContent },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recipes: {
                  type: Type.ARRAY,
                  description: 'List of 3 to 6 varied Indian recipes',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: {
                        type: Type.STRING,
                        description: 'Dish name with regional context (e.g. Bihari Aloo Chokha)',
                      },
                      category: {
                        type: Type.STRING,
                        description: 'Recipe tier: Known Classic, Local Traditional, or Quick Everyday',
                        enum: ['Known Classic', 'Local Traditional', 'Quick Everyday'],
                      },
                      region: {
                        type: Type.STRING,
                        description: 'Geographic region or state (e.g. North Indian, Bihari, Bengali, South Indian, Maharashtrian)',
                      },
                      description: {
                        type: Type.STRING,
                        description: 'Appetizing 1-2 sentence description and historical/cultural background',
                      },
                      cookTimeMinutes: {
                        type: Type.INTEGER,
                        description: 'Estimated total cooking time in minutes',
                      },
                      difficulty: {
                        type: Type.STRING,
                        description: 'Skill level',
                        enum: ['Easy', 'Medium', 'Hard'],
                      },
                      ingredientsUsed: {
                        type: Type.ARRAY,
                        description: 'Ingredients used from the user fridge inventory',
                        items: { type: Type.STRING },
                      },
                      missingIngredients: {
                        type: Type.ARRAY,
                        description: 'Pantry staples or additional spices needed',
                        items: { type: Type.STRING },
                      },
                      steps: {
                        type: Type.ARRAY,
                        description: 'Sequential, clear cooking steps',
                        items: { type: Type.STRING },
                      },
                      chefTip: {
                        type: Type.STRING,
                        description: 'Authentic grandmothers pro tip for flavor elevate',
                      },
                    },
                    required: [
                      'title',
                      'category',
                      'region',
                      'description',
                      'cookTimeMinutes',
                      'difficulty',
                      'ingredientsUsed',
                      'missingIngredients',
                      'steps',
                      'chefTip',
                    ],
                  },
                },
              },
              required: ['recipes'],
            },
          },
        });

        if (response && response.text) {
          break;
        }
      } catch (apiErr) {
        lastError = apiErr;
        const errMsg = apiErr.message || '';
        const isTransient =
          apiErr.status === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          apiErr.status === 429 ||
          errMsg.includes('429');

        if (isTransient) {
          if (attempt < maxAttemptsForModel) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          } else if (i < candidateModels.length - 1) {
            await new Promise((r) => setTimeout(r, 800));
            break;
          }
        }
        break;
      }
    }

    if (response && response.text) {
      break;
    }
  }

  if (!response || !response.text) {
    const error = new Error(`Recipe generation failed: ${lastError?.message || 'Upstream service error'}`);
    error.status = 502;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch (parseErr) {
    const error = new Error(`Failed to parse recipe response as JSON: ${parseErr.message}`);
    error.status = 502;
    throw error;
  }

  const rawRecipes = Array.isArray(parsed?.recipes) ? parsed.recipes : [];
  const normalizedRecipes = rawRecipes.map((r) => ({
    title: r.title || 'Untitled Indian Dish',
    category: ['Known Classic', 'Local Traditional', 'Quick Everyday'].includes(r.category)
      ? r.category
      : 'Local Traditional',
    region: r.region || 'Indian',
    description: r.description || '',
    cookTimeMinutes: typeof r.cookTimeMinutes === 'number' ? r.cookTimeMinutes : 20,
    difficulty: ['Easy', 'Medium', 'Hard'].includes(r.difficulty) ? r.difficulty : 'Easy',
    ingredientsUsed: Array.isArray(r.ingredientsUsed) ? r.ingredientsUsed : [],
    missingIngredients: Array.isArray(r.missingIngredients) ? r.missingIngredients : [],
    steps: Array.isArray(r.steps) ? r.steps : [],
    chefTip: r.chefTip || '',
    nutrition: estimateRecipeNutrition({
      title: r.title,
      ingredients: [...(r.ingredientsUsed || []), ...(r.missingIngredients || [])],
    }),
  }));

  return {
    recipes: normalizedRecipes,
  };
}
