export const DEFAULT_BACKEND_URL = 'http://192.168.1.3:3001';

export const LIGHT_THEME = {
  isDark: false,
  saffronOrange: '#E8590C',
  tangerineOrange: '#F76707',
  herbGreen: '#2F9E44',
  freshGreen: '#40C057',

  bg: '#FCFAF7',
  surface: '#FCFAF7',
  surfaceContainerLow: '#F6F3EE',
  surfaceContainer: '#EFECE6',
  surfaceContainerHigh: '#E7E3DC',
  surfaceContainerLowest: '#FFFFFF',

  card: '#FFFFFF',
  cardAlt: '#F6F3EE',
  border: '#E2CFC7',
  borderStrong: '#8E7166',

  primary: '#A23A00',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FFDBCE',
  onPrimaryContainer: '#370E00',

  secondary: '#006E24',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#C7FFC3',
  onSecondaryContainer: '#002106',

  text: '#1A1B1E',
  textMuted: '#5A4138',
  textSubtle: '#8E7166',

  accent: '#A23A00',
  accentText: '#FFFFFF',

  inverseSurface: '#2F3033',
  inverseOnSurface: '#F2F0F4',

  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  highlightBg: '#FFDBCE',
  highlightText: '#370E00',
  glowText: '#E8590C',
  glowShadow: 'rgba(232, 89, 12, 0.45)',
  stepActiveBg: '#FFFFFF',
  badgeSeen: '#C7FFC3',
  badgeMaybe: '#FFDBCE',
  badgeText: '#1A1B1E',
};

export const DARK_THEME = {
  isDark: true,
  saffronOrange: '#E8590C',
  tangerineOrange: '#F76707',
  herbGreen: '#2F9E44',
  freshGreen: '#40C057',

  bg: '#121316',
  surface: '#121316',
  surfaceContainerLow: '#1A1B1E',
  surfaceContainer: '#222327',
  surfaceContainerHigh: '#2B2C31',
  surfaceContainerLowest: '#0D0E11',

  card: '#222327',
  cardAlt: '#1A1B1E',
  border: '#3D3A39',
  borderStrong: '#A98A7E',

  primary: '#FFB598',
  onPrimary: '#591C00',
  primaryContainer: '#7F2B00',
  onPrimaryContainer: '#FFDBCE',

  secondary: '#71DD7A',
  onSecondary: '#00390F',
  secondaryContainer: '#005319',
  onSecondaryContainer: '#C7FFC3',

  text: '#E3E2E6',
  textMuted: '#E2BFB2',
  textSubtle: '#A98A7E',

  accent: '#FFB598',
  accentText: '#591C00',

  inverseSurface: '#2B2C31',
  inverseOnSurface: '#E3E2E6',

  error: '#FFB4AB',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  highlightBg: '#7F2B00',
  highlightText: '#FFDBCE',
  glowText: '#FFB598',
  glowShadow: 'rgba(255, 181, 152, 0.55)',
  stepActiveBg: '#222327',
  badgeSeen: '#005319',
  badgeMaybe: '#7F2B00',
  badgeText: '#E3E2E6',
};

export const SCAN_STAGES = [
  'Reading selected photos...',
  'Analyzing detected veggies & dairy...',
  'Checking spice jars & pantry staples...',
  'Formulating ingredient list...',
];

export const RECIPE_STAGES = [
  'Analyzing selected fridge ingredients...',
  'Consulting regional Indian culinary archives...',
  'Matching classics & regional dishes...',
  'Calculating nutrition & cooking steps...',
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
