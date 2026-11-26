import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';

export default function RecipeDetailScreen({
  theme,
  styles,
  selectedRecipe,
  supportedLanguages,
  speechLanguage,
  translatedIngredients,
  activeSpeechState,
  activeWordIndex,
  isSpeaking,
  isPreparingSpeech,
  onBackToRecipes,
  onStartNewScan,
  onSelectLanguage,
  onSpeakStep,
  onStopDictation,
}) {
  const recipeKey = selectedRecipe.id || selectedRecipe.title;
  const isCurrentRecipeSpeech = activeSpeechState?.recipeId === recipeKey;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.resultsHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.resultsHeaderTopRow}>
          <TouchableOpacity
            onPress={onBackToRecipes}
            style={[styles.backBtn, { backgroundColor: theme.cardAlt }]}
          >
            <Text style={[styles.backBtnText, { color: theme.text }]}>&lt; All Recipes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onStartNewScan}
            style={[styles.resetBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.resetBtnText, { color: theme.accentText }]}>New Scan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recipeMetaRow}>
          <View
            style={[
              styles.recipeCategoryBadge,
              selectedRecipe.category === 'Local Traditional'
                ? styles.catBadgeTraditional
                : selectedRecipe.category === 'Quick Everyday'
                ? styles.catBadgeQuick
                : styles.catBadgeClassic,
            ]}
          >
            <Text style={styles.recipeCategoryText}>
              {selectedRecipe.category === 'Local Traditional'
                ? '🏺 Local Traditional'
                : selectedRecipe.category === 'Quick Everyday'
                ? '⚡ Quick Everyday'
                : '🥘 Known Classic'}
            </Text>
          </View>
          <Text style={[styles.recipeRegionText, { color: theme.textSubtle }]}>
            {selectedRecipe.region || 'Indian'}
          </Text>
        </View>

        <Text style={[styles.resultsTitle, { color: theme.text }]}>{selectedRecipe.title}</Text>
        <Text style={[styles.recipeDescription, { color: theme.textMuted }]}>
          {selectedRecipe.description}
        </Text>

        <View style={styles.recipeQuickStatsRow}>
          <Text style={[styles.quickStatText, { color: theme.textSubtle }]}>
            ⏱ {selectedRecipe.cookTimeMinutes || 20} mins
          </Text>
          <Text style={[styles.quickStatText, { color: theme.textSubtle }]}>
            • {selectedRecipe.difficulty || 'Easy'}
          </Text>
        </View>

        {/* Voice Guide Language Selector */}
        <View style={styles.langBarHeaderRow}>
          <Text style={[styles.langBarLabel, { color: theme.text }]}>Voice Guide Language</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langScrollRow}
        >
          {supportedLanguages.map((lang) => {
            const isLangActive = speechLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langPill,
                  { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong },
                  isLangActive && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => onSelectLanguage(lang.code)}
              >
                <Text
                  style={[
                    styles.langPillText,
                    { color: theme.textMuted },
                    isLangActive && { color: theme.accentText, fontWeight: '700' },
                  ]}
                >
                  {lang.code === 'en' ? 'English' : `${lang.label} (${lang.nativeLabel})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Nutrition Breakdown Card */}
      {selectedRecipe.nutrition && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.nutritionBoxTitle, { color: theme.textSubtle }]}>
            Estimated Nutrition (Per Serving)
          </Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionCell}>
              <Text style={[styles.nutritionValue, { color: theme.text }]}>
                {selectedRecipe.nutrition.calories}
              </Text>
              <Text style={[styles.nutritionLabel, { color: theme.textSubtle }]}>kcal</Text>
            </View>
            <View style={styles.nutritionCell}>
              <Text style={[styles.nutritionValue, { color: theme.text }]}>
                {selectedRecipe.nutrition.proteinGrams}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: theme.textSubtle }]}>Protein</Text>
            </View>
            <View style={styles.nutritionCell}>
              <Text style={[styles.nutritionValue, { color: theme.text }]}>
                {selectedRecipe.nutrition.carbsGrams}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: theme.textSubtle }]}>Carbs</Text>
            </View>
            <View style={styles.nutritionCell}>
              <Text style={[styles.nutritionValue, { color: theme.text }]}>
                {selectedRecipe.nutrition.fatGrams}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: theme.textSubtle }]}>Fat</Text>
            </View>
          </View>
        </View>
      )}

      {/* Ingredients Card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {selectedRecipe.ingredientsUsed && selectedRecipe.ingredientsUsed.length > 0 && (
          <>
            <Text style={[styles.subheading, { color: theme.text, marginTop: 0 }]}>
              Fridge Items Used:
            </Text>
            <Text style={[styles.bodyListText, { color: theme.textMuted }]}>
              {(translatedIngredients?.used || selectedRecipe.ingredientsUsed).join(', ')}
            </Text>
          </>
        )}

        {selectedRecipe.additionalIngredients && selectedRecipe.additionalIngredients.length > 0 && (
          <>
            <Text style={[styles.subheading, { color: theme.text }]}>Other Ingredients Needed:</Text>
            <Text style={[styles.bodyListText, { color: theme.textMuted }]}>
              {(translatedIngredients?.additional || selectedRecipe.additionalIngredients).join(', ')}
            </Text>
          </>
        )}

        {selectedRecipe.missingIngredients && selectedRecipe.missingIngredients.length > 0 && (
          <>
            <Text style={[styles.subheading, { color: theme.text }]}>Common Pantry Staples Needed:</Text>
            <Text style={[styles.bodyListText, { color: theme.textMuted, marginBottom: 0 }]}>
              {(translatedIngredients?.pantry || selectedRecipe.missingIngredients).join(', ')}
            </Text>
          </>
        )}
      </View>

      {/* Preparation Steps with Live Word-by-Word Glow */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.stepsHeaderRow, { marginTop: 0, marginBottom: 12 }]}>
          <Text style={[styles.subheading, { color: theme.text, marginTop: 0 }]}>Preparation Steps</Text>
          {selectedRecipe.steps && selectedRecipe.steps.length > 0 && (
            <View style={styles.dictationControlsRow}>
              {isCurrentRecipeSpeech && (isSpeaking || isPreparingSpeech) ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.dictBtnSmall,
                      { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong },
                      (activeSpeechState?.stepIndex ?? 0) === 0 && { opacity: 0.4 },
                    ]}
                    onPress={() =>
                      onSpeakStep(selectedRecipe, Math.max(0, (activeSpeechState?.stepIndex ?? 0) - 1))
                    }
                    disabled={(activeSpeechState?.stepIndex ?? 0) === 0}
                  >
                    <Text style={[styles.dictBtnSmallText, { color: theme.text }]}>&lt; Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dictBtnSmall,
                      { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong },
                      (activeSpeechState?.stepIndex ?? 0) >= selectedRecipe.steps.length - 1 && {
                        opacity: 0.4,
                      },
                    ]}
                    onPress={() =>
                      onSpeakStep(
                        selectedRecipe,
                        Math.min(
                          selectedRecipe.steps.length - 1,
                          (activeSpeechState?.stepIndex ?? 0) + 1
                        )
                      )
                    }
                    disabled={(activeSpeechState?.stepIndex ?? 0) >= selectedRecipe.steps.length - 1}
                  >
                    <Text style={[styles.dictBtnSmallText, { color: theme.text }]}>Next &gt;</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dictBtnStop} onPress={onStopDictation}>
                    <Text style={styles.dictBtnStopText}>Stop</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.dictBtnPlay, { backgroundColor: theme.accent }]}
                  onPress={() =>
                    onSpeakStep(
                      selectedRecipe,
                      isCurrentRecipeSpeech ? activeSpeechState?.stepIndex ?? 0 : 0
                    )
                  }
                >
                  <Text style={[styles.dictBtnPlayText, { color: theme.accentText }]}>
                    {isPreparingSpeech ? 'Preparing...' : 'Listen Steps'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {(selectedRecipe.steps || []).map((step, sIdx) => {
          const isActiveStep = isCurrentRecipeSpeech && activeSpeechState?.stepIndex === sIdx;
          const isHighlightedOriginal = isActiveStep && !activeSpeechState?.translatedText;
          const isHighlightedTranslated = isActiveStep && Boolean(activeSpeechState?.translatedText);

          const glowStyle = {
            color: theme.glowText,
            fontWeight: '800',
            textShadowColor: theme.glowShadow,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
          };

          return (
            <TouchableOpacity
              key={`detail-step-${sIdx}`}
              style={[
                styles.stepRow,
                isActiveStep && [styles.stepRowActive, { backgroundColor: theme.stepActiveBg }],
              ]}
              onPress={() => onSpeakStep(selectedRecipe, sIdx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepNumber, { color: theme.text }]}>{sIdx + 1}.</Text>
              <View style={{ flex: 1 }}>
                {isHighlightedOriginal && activeSpeechState?.spans?.length > 0 ? (
                  <Text style={[styles.stepText, { color: theme.textMuted }]}>
                    {activeSpeechState.spans.map((span, wIdx) => (
                      <Text key={`w-${wIdx}`} style={wIdx === activeWordIndex ? glowStyle : undefined}>
                        {span.text}
                      </Text>
                    ))}
                  </Text>
                ) : (
                  <Text style={[styles.stepText, { color: theme.textMuted }]}>{step}</Text>
                )}

                {isHighlightedTranslated ? (
                  activeSpeechState?.spans?.length > 0 ? (
                    <Text style={[styles.translatedStepText, { color: theme.text }]}>
                      {activeSpeechState.spans.map((span, wIdx) => (
                        <Text key={`tw-${wIdx}`} style={wIdx === activeWordIndex ? glowStyle : undefined}>
                          {span.text}
                        </Text>
                      ))}
                    </Text>
                  ) : (
                    <Text style={[styles.translatedStepText, { color: theme.text }]}>
                      {activeSpeechState.translatedText}
                    </Text>
                  )
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}

        {selectedRecipe.chefTip ? (
          <View
            style={[
              styles.chefTipBox,
              { backgroundColor: theme.cardAlt, borderLeftColor: theme.accent },
            ]}
          >
            <Text style={[styles.chefTipTitle, { color: theme.text }]}>Chef's Secret:</Text>
            <Text style={[styles.chefTipText, { color: theme.textMuted }]}>
              {selectedRecipe.chefTip}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
