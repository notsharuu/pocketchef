// IFCT-inspired per-100g nutritional values for common Indian ingredients
// [kcal, protein(g), carbs(g), fat(g), typicalSingleServingGrams]
const INGREDIENT_NUTRITION_DB = {
  // Dairy & Proteins
  paneer: [265, 18.3, 1.2, 20.8, 75],
  'cottage cheese': [265, 18.3, 1.2, 20.8, 75],
  tofu: [144, 15.8, 2.8, 8.7, 80],
  chicken: [165, 25.0, 0.0, 6.5, 120],
  mutton: [230, 21.0, 0.0, 16.0, 110],
  lamb: [230, 21.0, 0.0, 16.0, 110],
  fish: [120, 20.0, 0.0, 4.0, 110],
  rohu: [115, 19.5, 0.0, 3.5, 110],
  prawn: [99, 20.5, 0.2, 1.4, 100],
  prawns: [99, 20.5, 0.2, 1.4, 100],
  shrimp: [99, 20.5, 0.2, 1.4, 100],
  egg: [143, 12.6, 0.7, 9.5, 55],
  eggs: [143, 12.6, 0.7, 9.5, 100],
  soya: [345, 52.0, 33.0, 0.5, 35],
  curd: [60, 3.1, 4.7, 3.3, 60],
  yogurt: [60, 3.1, 4.7, 3.3, 60],
  dahi: [60, 3.1, 4.7, 3.3, 60],
  milk: [62, 3.2, 4.8, 3.4, 80],
  cream: [290, 2.1, 3.0, 30.0, 20],
  cheese: [350, 22.0, 2.0, 28.0, 30],

  // Lentils & Legumes (dry weight per 100g, typical serving ~35g dry)
  dal: [340, 22.5, 59.0, 1.5, 35],
  lentil: [340, 22.5, 59.0, 1.5, 35],
  toor: [335, 22.3, 57.6, 1.7, 35],
  moong: [347, 23.8, 59.9, 1.2, 35],
  masoor: [343, 25.1, 59.0, 0.7, 35],
  urad: [341, 24.0, 58.9, 1.4, 35],
  chana: [364, 20.5, 61.0, 5.3, 40],
  chickpea: [364, 19.3, 60.6, 6.0, 45],
  rajma: [333, 22.9, 60.0, 1.3, 45],
  'kidney beans': [333, 22.9, 60.0, 1.3, 45],

  // Grains & Flours
  rice: [356, 7.1, 78.2, 0.7, 60],
  basmati: [356, 7.1, 78.2, 0.7, 60],
  poha: [346, 6.6, 77.3, 1.2, 50],
  atta: [341, 12.1, 69.4, 1.7, 60],
  wheat: [341, 12.1, 69.4, 1.7, 60],
  maida: [348, 11.0, 73.9, 0.9, 50],
  flour: [345, 11.0, 72.0, 1.2, 50],
  besan: [387, 22.4, 57.8, 6.7, 35],
  semolina: [360, 12.7, 72.8, 1.0, 50],
  rava: [360, 12.7, 72.8, 1.0, 50],
  suji: [360, 12.7, 72.8, 1.0, 50],
  bread: [265, 8.9, 49.0, 3.2, 60],
  oats: [389, 16.9, 66.3, 6.9, 40],

  // Fats & Oils (per serving ~8-12g)
  ghee: [900, 0.0, 0.0, 99.8, 8],
  butter: [717, 0.9, 0.1, 81.1, 8],
  oil: [884, 0.0, 0.0, 100.0, 10],
  'mustard oil': [884, 0.0, 0.0, 100.0, 10],
  'olive oil': [884, 0.0, 0.0, 100.0, 10],

  // Vegetables
  potato: [77, 2.0, 17.5, 0.1, 90],
  aloo: [77, 2.0, 17.5, 0.1, 90],
  onion: [40, 1.1, 9.3, 0.1, 50],
  tomato: [18, 0.9, 3.9, 0.2, 60],
  spinach: [23, 2.9, 3.6, 0.4, 80],
  palak: [23, 2.9, 3.6, 0.4, 80],
  peas: [81, 5.4, 14.5, 0.4, 50],
  matar: [81, 5.4, 14.5, 0.4, 50],
  cauliflower: [25, 1.9, 5.0, 0.3, 80],
  gobi: [25, 1.9, 5.0, 0.3, 80],
  gobhi: [25, 1.9, 5.0, 0.3, 80],
  brinjal: [25, 1.0, 5.9, 0.2, 90],
  eggplant: [25, 1.0, 5.9, 0.2, 90],
  baingan: [25, 1.0, 5.9, 0.2, 90],
  okra: [33, 1.9, 7.5, 0.2, 80],
  bhindi: [33, 1.9, 7.5, 0.2, 80],
  'bottle gourd': [14, 0.6, 3.4, 0.0, 100],
  lauki: [14, 0.6, 3.4, 0.0, 100],
  'bitter gourd': [17, 1.0, 3.7, 0.2, 80],
  karela: [17, 1.0, 3.7, 0.2, 80],
  carrot: [41, 0.9, 9.6, 0.2, 60],
  capsicum: [20, 0.9, 4.6, 0.2, 50],
  cabbage: [25, 1.3, 5.8, 0.1, 70],
  beans: [31, 1.8, 7.0, 0.1, 60],
  mushroom: [22, 3.1, 3.3, 0.3, 70],
  corn: [86, 3.3, 18.7, 1.4, 50],
  ginger: [80, 1.8, 17.8, 0.8, 5],
  garlic: [149, 6.4, 33.1, 0.5, 5],

  // Nuts, Coconut & Sweeteners
  coconut: [354, 3.3, 15.2, 33.5, 25],
  'coconut milk': [230, 2.3, 5.5, 23.8, 60],
  cashew: [553, 18.2, 30.2, 43.8, 12],
  almond: [579, 21.2, 21.6, 49.9, 10],
  peanut: [567, 25.8, 16.1, 49.2, 15],
  walnut: [654, 15.2, 13.7, 65.2, 10],
  pistachio: [560, 20.2, 27.2, 45.3, 10],
  raisin: [299, 3.1, 79.2, 0.5, 12],
  sesame: [573, 17.7, 23.4, 49.7, 8],
  'poppy seeds': [525, 18.0, 28.1, 41.6, 10],
  posto: [525, 18.0, 28.1, 41.6, 10],
  sugar: [387, 0.0, 100.0, 0.0, 15],
  jaggery: [383, 0.4, 98.0, 0.1, 15],
  honey: [304, 0.3, 82.4, 0.0, 12],
  khoya: [421, 14.6, 20.5, 31.2, 30],
  mawa: [421, 14.6, 20.5, 31.2, 30],
  'condensed milk': [321, 7.9, 54.4, 8.7, 30],

  // Additional Indian Vegetables, Millets & Legumes
  'urad dal': [341, 24.0, 58.9, 1.4, 35],
  'chana dal': [364, 20.5, 61.0, 5.3, 35],
  'moong dal': [347, 23.8, 59.9, 1.2, 35],
  'toor dal': [335, 22.3, 57.6, 1.7, 35],
  'masoor dal': [343, 25.1, 59.0, 0.7, 35],
  'black chana': [364, 20.5, 61.0, 5.3, 40],
  'kabuli chana': [364, 19.3, 60.6, 6.0, 45],
  pumpkin: [26, 1.0, 6.5, 0.1, 90],
  'sweet potato': [86, 1.6, 20.1, 0.1, 90],
  radish: [16, 0.7, 3.4, 0.1, 80],
  mooli: [16, 0.7, 3.4, 0.1, 80],
  'ridge gourd': [20, 1.2, 4.4, 0.2, 90],
  turai: [20, 1.2, 4.4, 0.2, 90],
  jackfruit: [95, 1.7, 23.2, 0.6, 80],
  kathal: [95, 1.7, 23.2, 0.6, 80],
  banana: [89, 1.1, 22.8, 0.3, 90],
  mango: [60, 0.8, 15.0, 0.4, 80],
  apple: [52, 0.3, 13.8, 0.2, 90],
  ragi: [328, 7.3, 72.0, 1.3, 50],
  jowar: [329, 10.6, 72.1, 3.5, 50],
  bajra: [361, 11.6, 67.5, 5.0, 50],
  sabudana: [358, 0.2, 88.7, 0.0, 50],
  vermicelli: [352, 11.0, 74.0, 1.2, 50],
  methi: [49, 4.4, 6.0, 0.9, 40],
  buttermilk: [40, 3.3, 4.8, 0.9, 120],
  chaas: [40, 3.3, 4.8, 0.9, 120],
};

const SORTED_NUTRITION_KEYS = Object.keys(INGREDIENT_NUTRITION_DB).sort(
  (a, b) => b.length - a.length
);

/**
 * Estimates per-serving calories and macronutrients (protein, carbs, fat)
 * from a recipe's ingredient list, title, and course.
 */
export function estimateRecipeNutrition({ title = '', ingredients = [], course = '', diet = '' } = {}) {
  const ingList = Array.isArray(ingredients) ? ingredients : [];
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let matchedCount = 0;
  const seenKeys = new Set();
  const rawBreakdown = [];

  const textPool = [
    ...ingList.map((i) => ({ label: String(i || '').trim(), lower: String(i || '').toLowerCase() })),
    { label: String(title || '').trim(), lower: String(title || '').toLowerCase(), isTitleFallback: true },
  ];

  for (const entry of textPool) {
    for (const key of SORTED_NUTRITION_KEYS) {
      if (!seenKeys.has(key) && entry.lower.includes(key)) {
        seenKeys.add(key);
        const [kcal100, prot100, carb100, fat100, defaultGrams] = INGREDIENT_NUTRITION_DB[key];
        const factor = defaultGrams / 100;
        const kcal = kcal100 * factor;
        const protein = prot100 * factor;
        const carbs = carb100 * factor;
        const fat = fat100 * factor;
        const fiber = Math.max(0, Math.round(carbs * 0.18 * 10) / 10);

        totalKcal += kcal;
        totalProtein += protein;
        totalCarbs += carbs;
        totalFat += fat;
        matchedCount++;

        const displayName = entry.isTitleFallback
          ? key.replace(/\b\w/g, (c) => c.toUpperCase())
          : entry.label || key.replace(/\b\w/g, (c) => c.toUpperCase());

        rawBreakdown.push({
          id: `ing-${rawBreakdown.length}-${key.replace(/\s+/g, '-')}`,
          name: displayName,
          gramsPerServing: defaultGrams,
          kcal,
          protein,
          carbs,
          fat,
          fiber,
          prepNote: `IFCT estimate based on ~${defaultGrams}g per serving.`,
        });
        break;
      }
    }
  }

  // Ensure cooking oil baseline if no explicit fat source was matched
  if (!seenKeys.has('oil') && !seenKeys.has('ghee') && !seenKeys.has('butter') && !seenKeys.has('mustard oil') && !seenKeys.has('olive oil')) {
    totalFat += 7;
    rawBreakdown.push({
      id: 'ing-cooking-oil',
      name: 'Cooking Oil / Ghee',
      gramsPerServing: 7,
      kcal: 63,
      protein: 0,
      carbs: 0,
      fat: 7,
      fiber: 0,
      prepNote: 'Standard cooking fat baseline (~7g per serving).',
    });
  }

  // Fallback baseline if recipe has sparse/unlisted ingredients
  if (matchedCount === 0) {
    const isNonVeg = /non[\s-]*veget/i.test(diet || '') || /chicken|mutton|fish|egg/i.test(title);
    const isDessert = /dessert|sweet/i.test(course || '');
    if (isDessert) {
      return {
        calories: 290,
        proteinGrams: 5,
        carbsGrams: 42,
        fatGrams: 11,
        fiberGrams: 2,
        ingredientsBreakdown: rawBreakdown,
        perServing: true,
        estimated: true,
      };
    }
    if (isNonVeg) {
      return {
        calories: 325,
        proteinGrams: 24,
        carbsGrams: 14,
        fatGrams: 19,
        fiberGrams: 2,
        ingredientsBreakdown: rawBreakdown,
        perServing: true,
        estimated: true,
      };
    }
    return {
      calories: 245,
      proteinGrams: 9,
      carbsGrams: 30,
      fatGrams: 10,
      fiberGrams: 4,
      ingredientsBreakdown: rawBreakdown,
      perServing: true,
      estimated: true,
    };
  }

  // Scale down gently if many dense ingredients matched (multi-ingredient thali/curry)
  const portionScale = matchedCount > 6 ? Math.max(0.65, 6 / matchedCount) : 1;
  const isSideOrChutney = /chutney|pickle|achaar|raita|salad|dip/i.test(`${title} ${course}`);
  const courseScale = isSideOrChutney ? 0.55 : portionScale;

  const proteinGrams = Math.max(1, Math.round(totalProtein * courseScale));
  const carbsGrams = Math.max(2, Math.round(totalCarbs * courseScale));
  const fatGrams = Math.max(1, Math.round(totalFat * courseScale));
  const fiberGrams = Math.max(1, Math.round(carbsGrams * 0.18));

  // Derive calories via Atwater factors (4*P + 4*C + 9*F) so kcal always matches displayed macros
  const rawCalories = proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9;
  const calories = Math.min(820, Math.max(60, Math.round(rawCalories / 5) * 5));

  const ingredientsBreakdown = rawBreakdown.map((item) => ({
    ...item,
    gramsPerServing: Math.max(1, Math.round(item.gramsPerServing * courseScale)),
    kcal: Math.round(item.kcal * courseScale),
    protein: Math.round(item.protein * courseScale * 10) / 10,
    carbs: Math.round(item.carbs * courseScale * 10) / 10,
    fat: Math.round(item.fat * courseScale * 10) / 10,
    fiber: Math.round(item.fiber * courseScale * 10) / 10,
  }));

  return {
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    fiberGrams,
    ingredientsBreakdown,
    perServing: true,
    estimated: true,
  };
}
