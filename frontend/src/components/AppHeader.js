import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const SCREEN_SUBTITLES = {
  capture: 'Kitchen Scanner',
  inventory: 'Kitchen Inventory',
  recipes: 'Recommended Dishes',
  recipeDetail: 'Cooking Guide',
};

export default function AppHeader({
  currentScreen,
  isDarkMode,
  theme,
  styles,
  onToggleTheme,
  onOpenSettings,
}) {
  return (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View>
        <Text style={[styles.appTitle, { color: theme.text }]}>PocketChef 🌿</Text>
        <Text style={[styles.appSubtitle, { color: theme.textSubtle }]}>
          {SCREEN_SUBTITLES[currentScreen] || 'Recommended Dishes'}
        </Text>
      </View>

      <View style={styles.headerActionsRow}>
        <TouchableOpacity
          style={[
            styles.themeToggleBtn,
            { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong },
          ]}
          onPress={onToggleTheme}
          activeOpacity={0.75}
        >
          <Text style={[styles.themeToggleText, { color: theme.text }]}>
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.settingsIconBtn,
            { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong },
          ]}
          onPress={onOpenSettings}
          activeOpacity={0.75}
        >
          <Text style={[styles.settingsIconText, { color: theme.text }]}>⚙</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
