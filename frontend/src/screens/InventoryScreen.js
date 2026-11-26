import React from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Animated } from 'react-native';

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
  onBackToScanner,
  onStartNewScan,
  onChangeManualInput,
  onAddManualIngredient,
  onToggleItemCheck,
  onToggleAllItems,
  onClearDbCategories,
  onToggleDbCategory,
  onGenerateRecipes,
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.resultsHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.resultsHeaderTopRow}>
          <TouchableOpacity
            onPress={onBackToScanner}
            style={[styles.backBtn, { backgroundColor: theme.cardAlt }]}
          >
            <Text style={[styles.backBtnText, { color: theme.text }]}>&lt; Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onStartNewScan}
            style={[styles.resetBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.resetBtnText, { color: theme.accentText }]}>New Scan</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.resultsTitle, { color: theme.text }]}>Fridge Inventory</Text>
        <Text style={[styles.resultsSubtitle, { color: theme.textSubtle }]}>
          {selectedCount} of {scanResult.items?.length || 0} ingredients selected
        </Text>
      </View>

      {/* Add Missing Ingredient */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.promptBarLabel, { color: theme.textMuted }]}>Add Missing Ingredient</Text>
        <View style={styles.promptBarRow}>
          <TextInput
            style={[
              styles.promptInput,
              { backgroundColor: theme.bg, borderColor: theme.borderStrong, color: theme.text },
            ]}
            value={manualIngredientInput}
            onChangeText={onChangeManualInput}
            placeholder="e.g. paneer, peas, ginger..."
            placeholderTextColor={theme.textSubtle}
            returnKeyType="done"
            onSubmitEditing={onAddManualIngredient}
          />
          <TouchableOpacity
            style={[styles.promptAddBtn, { backgroundColor: theme.accent }]}
            onPress={onAddManualIngredient}
          >
            <Text style={[styles.promptAddBtnText, { color: theme.accentText }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Detected Ingredients Checklist (2-Column Grid) */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>
            Detected Ingredients ({scanResult.items?.length || 0})
          </Text>
          {scanResult.items?.length > 0 ? (
            <TouchableOpacity
              onPress={() => onToggleAllItems(selectedCount < scanResult.items.length)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionSubtext, { color: theme.text, fontWeight: '700' }]}>
                {selectedCount < scanResult.items.length ? 'Select All' : 'Deselect All'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.sectionSubtext, { color: theme.textSubtle }]}>Tap to toggle</Text>
          )}
        </View>

        {!scanResult.items || scanResult.items.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSubtle }]}>
            No clear ingredients detected. Add ingredients above.
          </Text>
        ) : (
          <View style={styles.itemsGrid}>
            {scanResult.items.map((item, idx) => {
              const isChecked = Boolean(checkedItems[item.name]);
              const isSeen = item.status === 'seen';

              return (
                <TouchableOpacity
                  key={`item-${item.name}-${idx}`}
                  style={[
                    styles.itemChip,
                    { backgroundColor: theme.card },
                    isChecked
                      ? { borderColor: theme.accent }
                      : { borderColor: theme.border, opacity: 0.5 },
                  ]}
                  onPress={() => onToggleItemCheck(item.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemChipHeader}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isSeen ? theme.badgeSeen : theme.badgeMaybe },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: theme.badgeText }]}>
                        {isSeen ? 'SEEN' : 'MAYBE'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.checkboxIndicator,
                        { color: isChecked ? theme.text : theme.textSubtle },
                      ]}
                    >
                      {isChecked ? '[x]' : '[ ]'}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.itemName,
                      { color: isChecked ? theme.text : theme.textSubtle },
                      !isChecked && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Containers & Observations */}
      {scanResult.notes && scanResult.notes.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Containers & Observations</Text>
          {scanResult.notes.map((note, idx) => (
            <View key={`note-${idx}`} style={styles.noteRow}>
              <Text style={[styles.noteBullet, { color: theme.textSubtle }]}>-</Text>
              <Text style={[styles.noteText, { color: theme.textMuted }]}>{note}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Meal & Diet Preferences Selector & Recipe Trigger */}
      <View style={[styles.recipeLaunchCard, { borderWidth: 1, borderColor: theme.border }]}>
        <View style={styles.dbCategoryHeaderRow}>
          <Text style={styles.recipeLaunchTitle}>Meal & Diet Preferences</Text>
          {selectedDbCategories.length > 0 && (
            <TouchableOpacity onPress={onClearDbCategories}>
              <Text style={styles.clearCatsText}>Clear ({selectedDbCategories.length})</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.recipeLaunchSubtitle}>
          Filter by cooking style, meal course, or diet (optional).
        </Text>

        <Text style={styles.dbCatGroupLabel}>Style</Text>
        <View style={styles.dbCatChipsRow}>
          {dbCategoriesData.styles.map((cat) => {
            const active = selectedDbCategories.includes(cat);
            return (
              <TouchableOpacity
                key={`style-${cat}`}
                style={[styles.dbCatChip, active && styles.dbCatChipActive]}
                onPress={() => onToggleDbCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dbCatChipText, active && styles.dbCatChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.dbCatGroupLabel}>Course</Text>
        <View style={styles.dbCatChipsRow}>
          {dbCategoriesData.courses.map((course) => {
            const active = selectedDbCategories.includes(course);
            return (
              <TouchableOpacity
                key={`course-${course}`}
                style={[styles.dbCatChip, active && styles.dbCatChipActive]}
                onPress={() => onToggleDbCategory(course)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dbCatChipText, active && styles.dbCatChipTextActive]}>
                  {course}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.dbCatGroupLabel}>Diet</Text>
        <View style={[styles.dbCatChipsRow, { marginBottom: 16 }]}>
          {dbCategoriesData.diets.map((diet) => {
            const active = selectedDbCategories.includes(diet);
            return (
              <TouchableOpacity
                key={`diet-${diet}`}
                style={[styles.dbCatChip, active && styles.dbCatChipActive]}
                onPress={() => onToggleDbCategory(diet)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dbCatChipText, active && styles.dbCatChipTextActive]}>
                  {diet}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isGeneratingRecipes ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingHeaderRow}>
              <Text style={[styles.loadingTitle, { color: '#ffffff' }]}>Finding Best Recipes</Text>
              <Text style={[styles.loadingModelLabel, { color: '#94a3b8' }]}>PocketChef AI</Text>
            </View>

            <View style={[styles.progressBarTrack, { backgroundColor: '#1e293b' }]}>
              <Animated.View
                style={[styles.progressBarFill, { width: progressWidth, backgroundColor: '#ffffff' }]}
              />
            </View>

            <Text style={[styles.loadingStageText, { color: '#94a3b8' }]}>{recipeStageText}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.btnRecipe]}
            onPress={onGenerateRecipes}
            activeOpacity={0.8}
          >
            <Text style={styles.btnRecipeText}>Suggest Recipes ({selectedCount} Ingredients)</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
