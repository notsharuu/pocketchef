import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';
import { estimateRecipeNutrition } from './nutrition.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const VECTORS_BIN_PATH = path.join(DATA_DIR, 'recipes_vectors.bin');
const META_JSON_PATH = path.join(DATA_DIR, 'recipes_meta.json');

// Common Indian <-> English ingredient aliases so ingredient matching works seamlessly
const INGREDIENT_SYNONYMS = {
  potato: ['potato', 'potatoes', 'aloo', 'alu'],
  aloo: ['potato', 'potatoes', 'aloo', 'alu'],
  tomato: ['tomato', 'tomatoes', 'tamatar'],
  onion: ['onion', 'onions', 'pyaz', 'pyaaz'],
  okra: ['okra', 'bhindi', 'ladyfinger', 'ladies finger'],
  bhindi: ['okra', 'bhindi', 'ladyfinger', 'ladies finger'],
  brinjal: ['brinjal', 'eggplant', 'baingan', 'baigan', 'aubergine'],
  baingan: ['brinjal', 'eggplant', 'baingan', 'baigan', 'aubergine'],
  eggplant: ['brinjal', 'eggplant', 'baingan', 'baigan', 'aubergine'],
  curd: ['curd', 'yogurt', 'yoghurt', 'dahi'],
  dahi: ['curd', 'yogurt', 'yoghurt', 'dahi'],
  yogurt: ['curd', 'yogurt', 'yoghurt', 'dahi'],
  spinach: ['spinach', 'palak'],
  palak: ['spinach', 'palak'],
  cauliflower: ['cauliflower', 'gobi', 'gobhi', 'phool gobhi'],
  gobhi: ['cauliflower', 'gobi', 'gobhi'],
  gobi: ['cauliflower', 'gobi', 'gobhi'],
  peas: ['peas', 'green peas', 'matar', 'mutter'],
  matar: ['peas', 'green peas', 'matar', 'mutter'],
  paneer: ['paneer', 'cottage cheese'],
  coriander: ['coriander', 'dhania', 'cilantro'],
  'green chilli': ['green chilli', 'green chili', 'hari mirch', 'chilli'],
  bittergourd: ['bitter gourd', 'karela', 'pavakkai'],
  karela: ['bitter gourd', 'karela', 'pavakkai'],
  'bottle gourd': ['bottle gourd', 'lauki', 'ghiya', 'dudhi', 'sorakaya'],
  lauki: ['bottle gourd', 'lauki', 'ghiya', 'dudhi'],
  'ridge gourd': ['ridge gourd', 'turai', 'tori', 'jhinge', 'barbati'],
  ginger: ['ginger', 'adrak'],
  garlic: ['garlic', 'lahsun', 'lasan'],
  lentils: ['dal', 'lentil', 'lentils', 'toor', 'moong', 'masoor', 'chana', 'urad'],
  dal: ['dal', 'lentil', 'lentils', 'toor', 'moong', 'masoor', 'chana', 'urad'],
  rice: ['rice', 'chawal', 'basmati'],
  milk: ['milk', 'doodh'],
  carrot: ['carrot', 'carrots', 'gajar'],
  beans: ['beans', 'green beans', 'french beans', 'sem', 'barbati'],
  cabbage: ['cabbage', 'patta gobhi', 'bandh gobhi'],
  capsicum: ['capsicum', 'bell pepper', 'shimla mirch'],
};

let cachedVectors = null;
let cachedMeta = null;
let cachedExtractor = null;

export function isVectorDbReady() {
  return fs.existsSync(VECTORS_BIN_PATH) && fs.existsSync(META_JSON_PATH);
}

function loadVectorDb() {
  if (cachedVectors && cachedMeta) {
    return { vectors: cachedVectors, meta: cachedMeta };
  }
  if (!isVectorDbReady()) {
    const err = new Error('Vector database has not been built yet.');
    err.status = 503;
    throw err;
  }

  const metaRaw = fs.readFileSync(META_JSON_PATH, 'utf-8');
  cachedMeta = JSON.parse(metaRaw);

  // Precompute lowercase joined ingredients string once for fast search matching
  if (Array.isArray(cachedMeta?.items)) {
    for (const item of cachedMeta.items) {
      item._joinedIngsLower = (item.ingredients || []).join(' | ').toLowerCase();
    }
  }

  const binBuf = fs.readFileSync(VECTORS_BIN_PATH);
  cachedVectors = new Float32Array(
    binBuf.buffer,
    binBuf.byteOffset,
    binBuf.byteLength / Float32Array.BYTES_PER_ELEMENT
  );

  return { vectors: cachedVectors, meta: cachedMeta };
}

async function getExtractor(modelName) {
  if (!cachedExtractor) {
    cachedExtractor = await pipeline('feature-extraction', modelName, {
      dtype: 'fp32',
    });
  }
  return cachedExtractor;
}

/**
 * Preloads the vector DB and embedding model at server startup so the first search is instant.
 */
export async function warmupVectorDb() {
  if (!isVectorDbReady()) return;
  try {
    const { meta } = loadVectorDb();
    await getExtractor(meta.model || 'Xenova/all-MiniLM-L6-v2');
  } catch {
    // Warmup failure will surface on actual search if needed
  }
}

export function getVectorDbStats() {
  if (!isVectorDbReady()) {
    return { ready: false, count: 0, categories: {}, courses: [], diets: [] };
  }
  const { meta } = loadVectorDb();
  const categories = {};
  const courseCounts = {};
  const dietCounts = {};

  for (const item of meta.items) {
    categories[item.category] = (categories[item.category] || 0) + 1;

    if (item.course) {
      for (const raw of item.course.split(',')) {
        let c = raw.trim();
        if (!c) continue;
        if (/breakfast/i.test(c)) c = 'Breakfast';
        else if (/^main course$/i.test(c)) c = 'Main Course';
        else if (/^side dish$/i.test(c)) c = 'Side Dish';
        courseCounts[c] = (courseCounts[c] || 0) + 1;
      }
    }

    if (item.diet) {
      let d = item.diet.trim();
      if (/^vegetarian$/i.test(d)) d = 'Vegetarian';
      else if (/non[\s-]*veget[ae]rian/i.test(d)) {
        d = /high protein/i.test(d) ? 'High Protein Non-Veg' : 'Non-Vegetarian';
      } else if (/no onion no garlic/i.test(d)) d = 'Sattvic (No Onion/Garlic)';
      if (d) {
        dietCounts[d] = (dietCounts[d] || 0) + 1;
      }
    }
  }

  const courses = Object.entries(courseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const diets = Object.entries(dietCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, count]) => ({ name, count }));

  return {
    ready: true,
    count: meta.count,
    dimensions: meta.dimensions,
    model: meta.model,
    createdAt: meta.createdAt,
    categories,
    courses,
    diets,
  };
}

const PANTRY_STAPLE_PATTERNS = [
  /\bsalt\b/i,
  /\bsugar\b/i,
  /\bjaggery\b|\bgur\b/i,
  /\bwater\b/i,
  /\boil\b|\bghee\b|\bbutter\b/i,
  /\bturmeric\b|\bhaldi\b/i,
  /\bchill?i powder\b|\bred chill?i\b|\bkashmiri\b|\bpaprika\b|\bcayenne\b/i,
  /\bcumin\b|\bjeera\b/i,
  /\bcoriander powder\b|\bdhania powder\b/i,
  /\bgaram masala\b|\bkitchen king\b|\bsambar powder\b|\bchaat masala\b|\bcurry powder\b|\bpav bhaji masala\b|\bbiryani masala\b/i,
  /\bmustard seeds?\b|\brai\b|\bsarson\b/i,
  /\basafoetida\b|\bhing\b/i,
  /\bcurry leaves?\b|\bkadi patta\b/i,
  /\bbay lea(?:f|ves)\b|\btej patta\b/i,
  /\bcinnamon\b|\bdalchini\b|\bcardamom\b|\belaichi\b|\bcloves?\b|\blaung\b|\bstar anise\b|\bnutmeg\b|\bmace\b/i,
  /\bblack pepper\b|\bpeppercorn\b|\bkali mirch\b/i,
  /\bkasuri methi\b|\bfenugreek\b|\bmethi seeds?\b|\bfennel\b|\bsaunf\b|\bajwain\b|\bcarom\b|\bkalonji\b|\bnigella\b|\bsesame\b|\btil\b/i,
  /\bamchur\b|\bdry mango\b|\btamarind\b|\bimali\b|\bvinegar\b|\blemon juice\b|\blime juice\b/i,
  /\bbaking soda\b|\bbaking powder\b/i,
  /\bflour\b|\batta\b|\bmaida\b|\bbesan\b|\bcornflour\b|\bcorn starch\b/i,
];

function isCommonPantryStaple(ingredientName) {
  const clean = String(ingredientName || '').trim();
  if (!clean) return false;
  return PANTRY_STAPLE_PATTERNS.some((re) => re.test(clean));
}

function cleanIngredientLabel(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  // Remove nested or trailing measurement parentheticals e.g. "Cauliflower (1.0 medium head (about 2 cups))"
  s = s.replace(/\s*\([^()]*\([^()]*\)[^()]*\)/g, '');
  s = s.replace(/\s*\([^)]*\)/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

function expandIngredientTerms(ingredient) {
  const clean = String(ingredient || '').trim().toLowerCase();
  if (!clean) return [];
  const terms = new Set([clean]);
  if (INGREDIENT_SYNONYMS[clean]) {
    for (const syn of INGREDIENT_SYNONYMS[clean]) {
      terms.add(syn);
    }
  }
  return Array.from(terms);
}

function computeFastOverlap(expandedUserList, joinedRecipeIngsLower) {
  if (!expandedUserList.length || !joinedRecipeIngsLower) {
    return { matchedCount: 0, overlapRatio: 0 };
  }
  let matchedCount = 0;
  for (let u = 0; u < expandedUserList.length; u++) {
    const terms = expandedUserList[u].terms;
    for (let t = 0; t < terms.length; t++) {
      if (joinedRecipeIngsLower.includes(terms[t])) {
        matchedCount++;
        break;
      }
    }
  }
  return {
    matchedCount,
    overlapRatio: matchedCount / expandedUserList.length,
  };
}

function computeDetailedIngredientMatch(expandedUserList, recipeIngredients) {
  const matched = [];
  const joinedRecipeIngs = (recipeIngredients || []).join(' | ').toLowerCase();

  for (const u of expandedUserList) {
    if (u.terms.some((t) => joinedRecipeIngs.includes(t))) {
      matched.push(u.name);
    }
  }

  const pantryStaples = [];
  const additional = [];
  const seenPantry = new Set();
  const seenAdditional = new Set();

  for (const rIng of recipeIngredients || []) {
    const rLow = rIng.toLowerCase();
    const isCovered = expandedUserList.some((u) => u.terms.some((t) => rLow.includes(t)));
    if (isCovered) continue;

    const label = cleanIngredientLabel(rIng);
    if (!label) continue;
    const key = label.toLowerCase();

    if (isCommonPantryStaple(label)) {
      if (!seenPantry.has(key) && pantryStaples.length < 6) {
        seenPantry.add(key);
        pantryStaples.push(label);
      }
    } else if (!seenAdditional.has(key) && additional.length < 6) {
      seenAdditional.add(key);
      additional.push(label);
    }
  }

  return { matched, pantryStaples, additional };
}

function matchesDietTag(itemDiet, selectedDiet) {
  const d = (itemDiet || '').toLowerCase();
  const s = selectedDiet.toLowerCase();
  if (!d) return false;
  if (s === 'non-vegetarian') return d.includes('non veget');
  if (s === 'high protein non-veg') return d.includes('high protein non veget');
  if (s === 'vegetarian') return d.includes('vegetarian') && !d.includes('non veget');
  if (s === 'high protein vegetarian') return d.includes('high protein vegetarian');
  if (s === 'sattvic (no onion/garlic)') return d.includes('sattvic');
  return d.includes(s);
}

function matchesCourseTag(itemCourse, selectedCourse) {
  const c = (itemCourse || '').toLowerCase();
  const s = selectedCourse.toLowerCase();
  if (!c) return false;
  if (s === 'breakfast') return c.includes('breakfast');
  return c.includes(s);
}

/**
 * Searches the unified Indian recipe Vector DB using semantic vector similarity
 * combined with ingredient overlap, strict category/diet/course filtering, and diversity.
 */
export async function searchRecipesByVector({
  ingredients = [],
  notes = [],
  preferences = '',
  categories = [],
  query = '',
  limit = 9,
} = {}) {
  const { vectors, meta } = loadVectorDb();
  const dim = meta.dimensions;
  const items = meta.items;

  const cleanIngredients = (Array.isArray(ingredients) ? ingredients : [])
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  const selectedTags = (Array.isArray(categories) ? categories : [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  const STYLE_SET = new Set(['Known Classic', 'Local Traditional', 'Quick Everyday']);
  const COURSE_SET = new Set(['Lunch', 'Dinner', 'Snack', 'Breakfast', 'Side Dish', 'Main Course', 'Appetizer', 'Dessert']);

  const selectedStyles = selectedTags.filter((t) => STYLE_SET.has(t));
  const selectedCourses = selectedTags.filter((t) => COURSE_SET.has(t));
  const selectedDiets = selectedTags.filter((t) => !STYLE_SET.has(t) && !COURSE_SET.has(t));

  const queryParts = [];
  if (query) queryParts.push(query.trim());
  if (cleanIngredients.length > 0) queryParts.push(`Ingredients: ${cleanIngredients.join(', ')}`);
  if (selectedTags.length > 0) queryParts.push(`Categories: ${selectedTags.join(', ')}`);
  if (preferences) queryParts.push(`Preferences: ${preferences.trim()}`);
  if (Array.isArray(notes) && notes.length > 0) queryParts.push(`Context: ${notes.join('; ')}`);

  const queryText = queryParts.join(' | ') || 'Indian traditional home-style dish';

  const extractor = await getExtractor(meta.model || 'Xenova/all-MiniLM-L6-v2');
  const output = await extractor(queryText, { pooling: 'mean', normalize: true });
  const qVec = output.data;

  const prefLow = String(preferences || query || '').toLowerCase();
  const prefTokens = prefLow.split(/\s+/).filter((t) => t.length > 2);

  // Pre-expand user ingredients once before scanning all recipes
  const expandedUserList = cleanIngredients.map((name) => ({
    name,
    terms: expandIngredientTerms(name),
  }));

  // Score recipes (strictly filtering by selected Diet / Course / Style groups)
  const scored = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (selectedStyles.length > 0 && !selectedStyles.includes(item.category)) {
      continue;
    }
    if (selectedDiets.length > 0 && !selectedDiets.some((d) => matchesDietTag(item.diet, d))) {
      continue;
    }
    if (selectedCourses.length > 0 && !selectedCourses.some((c) => matchesCourseTag(item.course, c))) {
      continue;
    }

    const offset = i * dim;
    let dot = 0;
    for (let d = 0; d < dim; d++) {
      dot += qVec[d] * vectors[offset + d];
    }

    let overlapRatio = 0;
    if (expandedUserList.length > 0) {
      const joined = item._joinedIngsLower || (item.ingredients || []).join(' | ').toLowerCase();
      overlapRatio = computeFastOverlap(expandedUserList, joined).overlapRatio;
    }

    let prefBoost = 0;
    const searchable = `${item.title} ${item.region} ${item.diet} ${item.course} ${item.category}`.toLowerCase();
    if (prefTokens.length > 0) {
      for (const tok of prefTokens) {
        if (searchable.includes(tok)) prefBoost += 0.05;
      }
      prefBoost = Math.min(0.15, prefBoost);
    }

    const combinedScore =
      expandedUserList.length > 0
        ? 0.58 * dot + 0.42 * overlapRatio + prefBoost
        : dot + prefBoost;

    scored.push({
      index: i,
      vectorScore: dot,
      overlapRatio,
      combinedScore,
    });
  }

  scored.sort((a, b) => b.combinedScore - a.combinedScore);

  // Select diverse spectrum across active styles
  const targetCategories =
    selectedStyles.length > 0
      ? selectedStyles
      : ['Known Classic', 'Local Traditional', 'Quick Everyday'];
  const perCatTarget = Math.max(1, Math.floor(limit / targetCategories.length));
  const selectedIndices = new Set();
  const selected = [];

  for (const cat of targetCategories) {
    let count = 0;
    for (const s of scored) {
      if (count >= perCatTarget) break;
      const item = items[s.index];
      if (item.category === cat && !selectedIndices.has(s.index)) {
        selectedIndices.add(s.index);
        selected.push(s);
        count++;
      }
    }
  }

  // Fill any remaining slots up to limit with highest-scoring overall results
  for (const s of scored) {
    if (selected.length >= limit) break;
    if (!selectedIndices.has(s.index)) {
      selectedIndices.add(s.index);
      selected.push(s);
    }
  }

  const recipes = selected.map((s) => {
    const item = items[s.index];
    const detailed = computeDetailedIngredientMatch(expandedUserList, item.ingredients);
    const steps =
      Array.isArray(item.steps) && item.steps.length > 0
        ? item.steps
        : [item.description || `Prepare ${item.title} using ${(item.ingredients || []).slice(0, 6).join(', ')}.`];

    return {
      id: item.id,
      title: item.localName ? `${item.title} (${item.localName})` : item.title,
      category: item.category,
      region: item.region || 'Indian',
      description: item.description || `Authentic ${item.region || 'Indian'} dish.`,
      cookTimeMinutes: item.cookTimeMinutes || item.totalTimeMinutes || 25,
      difficulty: item.difficulty || 'Easy',
      ingredientsUsed: detailed.matched.length > 0 ? detailed.matched : (item.ingredients || []).slice(0, 5).map(cleanIngredientLabel).filter(Boolean),
      missingIngredients: detailed.pantryStaples,
      additionalIngredients: detailed.additional,
      steps,
      chefTip: item.chefTip || `Source dataset: ${item.source}`,
      source: item.source,
      url: item.url || '',
      similarityScore: Number(s.combinedScore.toFixed(3)),
      nutrition: estimateRecipeNutrition({
        title: item.title,
        ingredients: item.ingredients,
        course: item.course,
        diet: item.diet,
      }),
    };
  });

  return {
    engine: 'vector-db',
    totalIndexed: meta.count,
    recipes,
  };
}
