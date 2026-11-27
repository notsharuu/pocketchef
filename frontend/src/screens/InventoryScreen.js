import React from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function InventoryScreen({
  theme,
  styles,
  scanResult,
  checkedItems,
  selectedCount,
  manualIngredientInput,
  dbCategoriesData,
  selectedDbCategories,
  isGeneratingRecipes,
  progressWidth,
  recipeStageText,
  onChangeManualInput,
  onAddManualIngredient,
  onToggleItemCheck,
  onToggleAllItems,
  onClearDbCategories,
  onToggleDbCategory,
  onGenerateRecipes,
}) {
  const items = scanResult?.items || [];
  const preferenceGroups = [
    { key: 'diets', label: 'Diet', items: dbCategoriesData?.diets || [] },
    { key: 'styles', label: 'Style', items: dbCategoriesData?.styles || [] },
    { key: 'courses', label: 'Course', items: dbCategoriesData?.courses || [] },
  ].filter((g) => g.items.length > 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContentWithSticky}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header + Counter */}
        <View style={{ gap: 12 }}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.headlineLg, { color: theme.text }]}>Your Ingredients</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={[styles.monoText, { color: theme.secondary }]}>
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
              </Text>
              {items.length > 0 && (
                <TouchableOpacity
                  onPress={() => onToggleAllItems(selectedCount < items.length)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.labelSm, { color: theme.primary }]}>
                    {selectedCount < items.length ? 'Select All' : 'Clear'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Add Ingredient Pill Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.pillTextInput,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={manualIngredientInput}
              onChangeText={onChangeManualInput}
              placeholder="Add an ingredient (e.g. paneer, ginger)…"
              placeholderTextColor={theme.textSubtle}
              returnKeyType="done"
              onSubmitEditing={onAddManualIngredient}
            />
            <TouchableOpacity
              style={[styles.circleAddBtn, { backgroundColor: theme.primary }]}
              onPress={onAddManualIngredient}
              activeOpacity={0.8}
              accessibilityLabel="Add ingredient"
            >
              <MaterialIcons name="add" size={22} color={theme.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ingredient Pill Chips */}
        {items.length === 0 ? (
          <View
            style={[
              styles.progressCard,
              {
                backgroundColor: theme.surfaceContainerLow,
                borderColor: theme.border,
                borderStyle: 'dashed',
              },
            ]}
          >
            <Text style={[styles.bodyMd, { color: theme.textMuted }]}>
              No ingredients added yet. Type an ingredient above to get started.
            </Text>
          </View>
        ) : (
          <View style={styles.chipsWrap}>
            {items.map((item, idx) => {
              const isChecked = Boolean(checkedItems[item.name]);
              const isSeen = item.status === 'seen';

              return (
                <TouchableOpacity
                  key={`item-${item.name}-${idx}`}
                  onPress={() => onToggleItemCheck(item.name)}
                  activeOpacity={0.75}
                  style={[
                    styles.ingredientChip,
                    {
                      backgroundColor: isChecked
                        ? theme.surfaceContainerLowest
                        : theme.surfaceContainerLow,
                      borderColor: isChecked ? theme.borderStrong : theme.border,
                      opacity: isChecked ? 1 : 0.55,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isSeen ? theme.herbGreen : theme.saffronOrange,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.labelLg,
                      {
                        color: isChecked ? theme.text : theme.textSubtle,
                        textDecorationLine: isChecked ? 'none' : 'line-through',
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <MaterialIcons
                    name={isChecked ? 'check-circle' : 'radio-button-unchecked'}
                    size={16}
                    color={isChecked ? theme.secondary : theme.textSubtle}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Preferences Pills */}
        <View style={{ gap: 10 }}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.headlineMd, { color: theme.text }]}>Preferences</Text>
            {selectedDbCategories.length > 0 && (
              <TouchableOpacity onPress={onClearDbCategories} activeOpacity={0.7}>
                <Text style={[styles.labelSm, { color: theme.primary }]}>
                  Clear ({selectedDbCategories.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 12 }}>
            {preferenceGroups.map((group) => (
              <View key={group.key} style={{ gap: 6 }}>
                <Text style={[styles.labelSm, { color: theme.textMuted }]}>{group.label}</Text>
                <View style={styles.chipsWrap}>
                  {group.items.map((pref) => {
                    const active = selectedDbCategories.includes(pref);
                    return (
                      <TouchableOpacity
                        key={`pref-${group.key}-${pref}`}
                        onPress={() => onToggleDbCategory(pref)}
                        activeOpacity={0.75}
                        style={[
                          styles.prefChip,
                          {
                            backgroundColor: active
                              ? theme.secondaryContainer
                              : theme.surfaceContainerLow,
                            borderColor: active ? theme.secondary : theme.border,
                          },
                        ]}
                      >
                        {active && (
                          <MaterialIcons
                            name="check"
                            size={15}
                            color={theme.onSecondaryContainer}
                          />
                        )}
                        <Text
                          style={[
                            styles.labelSm,
                            {
                              color: active ? theme.onSecondaryContainer : theme.text,
                            },
                          ]}
                        >
                          {pref}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Generating Progress Card */}
        {isGeneratingRecipes && (
          <View
            style={[
              styles.progressCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.saffronOrange,
              },
            ]}
          >
            <View style={styles.sectionHeaderBetween}>
              <Text style={[styles.titleMd, { color: theme.text }]}>Finding Best Recipes…</Text>
              <Text style={[styles.monoText, { color: theme.primary }]}>PocketChef AI</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.surfaceContainerHigh }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressWidth, backgroundColor: theme.saffronOrange },
                ]}
              />
            </View>
            <Text style={[styles.bodyMd, { color: theme.textMuted }]}>{recipeStageText}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Floating CTA */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.primaryPillBtn,
            {
              backgroundColor: theme.primary,
              opacity: selectedCount === 0 || isGeneratingRecipes ? 0.5 : 1,
            },
          ]}
          onPress={onGenerateRecipes}
          disabled={selectedCount === 0 || isGeneratingRecipes}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryPillBtnText, { color: theme.onPrimary }]}>
            {isGeneratingRecipes ? 'Finding Recipes…' : 'Find Recipes'}
          </Text>
          <View style={[styles.countBadgePill, { backgroundColor: theme.primaryContainer }]}>
            <Text style={[styles.monoText, { color: theme.onPrimaryContainer }]}>
              {selectedCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
