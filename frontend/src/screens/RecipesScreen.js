import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const RECIPE_CATEGORY_FILTERS = ['All', 'Known Classic', 'Local Traditional', 'Quick Everyday'];

export default function RecipesScreen({
  theme,
  styles,
  filteredRecipes,
  selectedRecipeCategory,
  selectedCount = 0,
  onSelectRecipeCategory,
  onBackToInventory,
  onSelectRecipe,
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ gap: 4 }}>
        <Text style={[styles.headlineLg, { color: theme.text }]}>Best Matches</Text>
        <Text style={[styles.bodyMd, { color: theme.textMuted }]}>
          Curated from your {selectedCount} {selectedCount === 1 ? 'ingredient' : 'ingredients'}.
        </Text>
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {RECIPE_CATEGORY_FILTERS.map((cat) => {
          const isSelected = selectedRecipeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => onSelectRecipeCategory(cat)}
              activeOpacity={0.75}
              style={[
                styles.prefChip,
                {
                  backgroundColor: isSelected
                    ? theme.secondaryContainer
                    : theme.surfaceContainerLow,
                  borderColor: isSelected ? theme.secondary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.labelSm,
                  { color: isSelected ? theme.onSecondaryContainer : theme.text },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Recipe Cards */}
      {filteredRecipes.length === 0 ? (
        <View
          style={[
            styles.progressCard,
            {
              backgroundColor: theme.surfaceContainerLow,
              borderColor: theme.border,
              alignItems: 'center',
              paddingVertical: 28,
            },
          ]}
        >
          <MaterialIcons name="restaurant-menu" size={32} color={theme.textSubtle} />
          <Text style={[styles.titleMd, { color: theme.text, textAlign: 'center' }]}>
            No matching recipes found
          </Text>
          <Text style={[styles.bodyMd, { color: theme.textMuted, textAlign: 'center' }]}>
            Try switching to "All" or adding a few staple spices in your inventory.
          </Text>
          <TouchableOpacity
            style={[
              styles.pillOutlineBtn,
              {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
                marginTop: 6,
              },
            ]}
            onPress={onBackToInventory}
            activeOpacity={0.85}
          >
            <Text style={[styles.labelSm, { color: theme.onPrimary }]}>Adjust Ingredients</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filteredRecipes.map((recipe, index) => {
            const usedCount = recipe.ingredientsUsed?.length || 0;
            const addCount = recipe.additionalIngredients?.length || 0;
            const computedPct =
              usedCount + addCount > 0
                ? Math.max(40, Math.min(100, Math.round((usedCount / (usedCount + addCount)) * 100)))
                : 80;
            const matchPercent = recipe.matchPercent ?? computedPct;
            const matchBadgeText = `${matchPercent}% match`;
            const missingList = recipe.additionalIngredients?.length
              ? recipe.additionalIngredients
              : recipe.missingIngredients || [];
            const kcal = recipe.nutrition?.calories;
            const protein = recipe.nutrition?.proteinGrams;

            return (
              <TouchableOpacity
                key={`recipe-${recipe.id || index}`}
                onPress={() => onSelectRecipe(recipe)}
                activeOpacity={0.82}
                style={[
                  styles.recipeCard,
                  {
                    backgroundColor: theme.surfaceContainerLowest,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.sectionHeaderBetween}>
                  <View style={[styles.matchBadgePill, { backgroundColor: theme.secondaryContainer }]}>
                    <Text style={[styles.labelSm, { color: theme.onSecondaryContainer }]}>
                      {matchBadgeText}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={theme.textSubtle} />
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={[styles.headlineMd, { color: theme.text }]}>{recipe.title}</Text>
                  <Text style={[styles.bodyMd, { color: theme.textMuted }]}>
                    {recipe.region || recipe.cuisine || 'Indian'} • {recipe.cookTimeMinutes || 20}{' '}
                    min
                    {kcal != null ? ` • ${kcal} kcal` : ''}
                    {protein != null ? ` • ${protein}g protein` : ''}
                  </Text>
                  {missingList.length > 0 && (
                    <Text style={[styles.labelSm, { color: theme.primary, marginTop: 2 }]}>
                      Optional add-on: {missingList.slice(0, 3).join(', ')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
