import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';

const RECIPE_CATEGORY_FILTERS = ['All', 'Known Classic', 'Local Traditional', 'Quick Everyday'];

export default function RecipesScreen({
  theme,
  styles,
  filteredRecipes,
  selectedRecipeCategory,
  onSelectRecipeCategory,
  onBackToInventory,
  onStartNewScan,
  onSelectRecipe,
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.resultsHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.resultsHeaderTopRow}>
          <TouchableOpacity
            onPress={onBackToInventory}
            style={[styles.backBtn, { backgroundColor: theme.cardAlt }]}
          >
            <Text style={[styles.backBtnText, { color: theme.text }]}>&lt; Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onStartNewScan}
            style={[styles.resetBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.resetBtnText, { color: theme.accentText }]}>New Scan</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.resultsTitle, { color: theme.text }]}>Indian Kitchen Recipes</Text>
        <Text style={[styles.resultsSubtitle, { color: theme.textSubtle }]}>
          Tap any dish to view full instructions &amp; voice cooking guide
        </Text>

        <View style={styles.categoryPillsRow}>
          {RECIPE_CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedRecipeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong },
                  isSelected && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => onSelectRecipeCategory(cat)}
              >
                <Text
                  style={[
                    styles.catPillText,
                    { color: theme.textMuted },
                    isSelected && { color: theme.accentText, fontWeight: '700' },
                  ]}
                >
                  {cat === 'Known Classic'
                    ? '🥘 Classic'
                    : cat === 'Local Traditional'
                    ? '🏺 Traditional'
                    : cat === 'Quick Everyday'
                    ? '⚡ Quick'
                    : 'All'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {filteredRecipes.length === 0 ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyText, { color: theme.textSubtle }]}>
            No recipes matched the "{selectedRecipeCategory}" category in this batch. Tap "All" above to view all generated recipes.
          </Text>
        </View>
      ) : (
        filteredRecipes.map((recipe, index) => {
          const isTraditional = recipe.category === 'Local Traditional';
          const isQuick = recipe.category === 'Quick Everyday';

          return (
            <TouchableOpacity
              key={`recipe-${recipe.id || index}`}
              style={[styles.recipeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => onSelectRecipe(recipe)}
              activeOpacity={0.82}
            >
              <View style={styles.recipeMetaRow}>
                <View
                  style={[
                    styles.recipeCategoryBadge,
                    isTraditional
                      ? styles.catBadgeTraditional
                      : isQuick
                      ? styles.catBadgeQuick
                      : styles.catBadgeClassic,
                  ]}
                >
                  <Text style={styles.recipeCategoryText}>
                    {isTraditional
                      ? '🏺 Local Traditional'
                      : isQuick
                      ? '⚡ Quick Everyday'
                      : '🥘 Known Classic'}
                  </Text>
                </View>
                <Text style={[styles.recipeRegionText, { color: theme.textSubtle }]}>
                  {recipe.region || 'Indian'}
                </Text>
              </View>

              <Text style={[styles.recipeTitle, { color: theme.text }]}>{recipe.title}</Text>
              <Text style={[styles.recipeDescription, { color: theme.textMuted }]}>
                {recipe.description}
              </Text>

              {recipe.nutrition && (
                <View
                  style={[
                    styles.nutritionQuickRow,
                    { backgroundColor: theme.cardAlt, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.nutritionQuickText, { color: theme.text }]}>
                    {recipe.nutrition.calories} kcal • {recipe.nutrition.proteinGrams}g protein •{' '}
                    {recipe.nutrition.carbsGrams}g carbs • {recipe.nutrition.fatGrams}g fat
                  </Text>
                </View>
              )}

              <View style={styles.recipeQuickStatsRow}>
                <Text style={[styles.quickStatText, { color: theme.textSubtle }]}>
                  ⏱ {recipe.cookTimeMinutes || 20} mins
                </Text>
                <Text style={[styles.quickStatText, { color: theme.textSubtle }]}>
                  • {recipe.difficulty || 'Easy'}
                </Text>
                <Text style={[styles.expandHintText, { color: theme.text }]}>View Recipe &gt;</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}
