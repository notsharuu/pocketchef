export const DEFAULT_BACKEND_URL = 'http://192.168.1.3:3001';

export const LIGHT_THEME = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  text: '#0f172a',
  textMuted: '#475569',
  textSubtle: '#64748b',
  accent: '#0f172a',
  accentText: '#ffffff',
  highlightBg: '#fde047',
  highlightText: '#0f172a',
  glowText: '#b45309',
  glowShadow: 'rgba(245, 158, 11, 0.75)',
  stepActiveBg: '#f1f5f9',
  badgeSeen: '#dcfce7',
  badgeMaybe: '#fef3c7',
  badgeText: '#0f172a',
};

export const DARK_THEME = {
  bg: '#090d16',
  card: '#111827',
  cardAlt: '#1e293b',
  border: '#1f2937',
  borderStrong: '#334155',
  text: '#f8fafc',
  textMuted: '#cbd5e1',
  textSubtle: '#94a3b8',
  accent: '#f8fafc',
  accentText: '#0f172a',
  highlightBg: '#f59e0b',
  highlightText: '#090d16',
  glowText: '#fde047',
  glowShadow: 'rgba(250, 204, 21, 0.9)',
  stepActiveBg: '#1e293b',
  badgeSeen: '#14532d',
  badgeMaybe: '#78350f',
  badgeText: '#f8fafc',
};

export const SCAN_STAGES = [
  'Uploading shelf photos to server...',
  'Scanning vegetables, produce & spices across shelves...',
  'Cataloging closed steel dabbas & packaging...',
  'Synthesizing unified whole-fridge inventory...',
];

export const RECIPE_STAGES = [
  'Analyzing selected fridge ingredients...',
  'Consulting regional Indian culinary archives...',
  'Balancing known classics & deep rural traditional recipes...',
  'Formulating step-by-step cooking techniques & chef secrets...',
];

export const DEFAULT_DB_CATEGORIES = {
  styles: ['Known Classic', 'Local Traditional', 'Quick Everyday'],
  courses: ['Lunch', 'Dinner', 'Snack', 'Breakfast', 'Main Course', 'Side Dish'],
  diets: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'High Protein Vegetarian'],
};

export const DEFAULT_SUPPORTED_LANGUAGES = [
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
