import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const SCREEN_SUBTITLES = {
  capture: 'Fridge Scanner',
  inventory: 'Your Ingredients',
  recipes: 'Best Matches',
  recipeDetail: 'Kitchen Mode',
};

export default function AppHeader({
  currentScreen,
  isDarkMode,
  theme,
  styles,
  onToggleTheme,
  onOpenSettings,
  onBack,
}) {
  const isCenteredHeader = currentScreen === 'recipeDetail' || currentScreen === 'nutrition';
  const centeredTitle = currentScreen === 'nutrition' ? 'Nutrition' : 'Kitchen Mode';

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {isCenteredHeader ? (
        <>
          <TouchableOpacity
            style={[
              styles.headerCircleBtn,
              {
                backgroundColor: theme.surfaceContainerLow,
                borderColor: theme.border,
              },
            ]}
            onPress={onBack}
            activeOpacity={0.75}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.headerCenterTitle, { color: theme.text }]}>{centeredTitle}</Text>

          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              style={[
                styles.headerCircleBtn,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  borderColor: theme.border,
                },
              ]}
              onPress={onToggleTheme}
              activeOpacity={0.75}
              accessibilityLabel={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <MaterialIcons
                name={isDarkMode ? 'light-mode' : 'dark-mode'}
                size={20}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.headerBrandRow}>
            {currentScreen === 'capture' ? (
              <View style={[styles.brandIconBox, { backgroundColor: theme.saffronOrange }]}>
                <MaterialIcons name="restaurant" size={20} color="#FFFFFF" />
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.headerCircleBtn,
                  {
                    backgroundColor: theme.surfaceContainerLow,
                    borderColor: theme.border,
                  },
                ]}
                onPress={onBack}
                activeOpacity={0.75}
                accessibilityLabel="Go back"
              >
                <MaterialIcons name="arrow-back" size={20} color={theme.text} />
              </TouchableOpacity>
            )}

            <View>
              <Text style={[styles.appTitle, { color: theme.text }]}>PocketChef</Text>
              <Text style={[styles.appSubtitle, { color: theme.textMuted }]}>
                {SCREEN_SUBTITLES[currentScreen] || 'Best Matches'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              style={[
                styles.headerCircleBtn,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  borderColor: theme.border,
                },
              ]}
              onPress={onToggleTheme}
              activeOpacity={0.75}
              accessibilityLabel={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <MaterialIcons
                name={isDarkMode ? 'light-mode' : 'dark-mode'}
                size={20}
                color={theme.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.headerCircleBtn,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  borderColor: theme.border,
                },
              ]}
              onPress={onOpenSettings}
              activeOpacity={0.75}
              accessibilityLabel="Server settings"
            >
              <MaterialIcons name="tune" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
