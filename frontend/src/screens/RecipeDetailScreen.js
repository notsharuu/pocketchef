import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { fetchRecipeVideo } from '../services/api';

export default function RecipeDetailScreen({
  theme,
  styles,
  backendUrl,
  selectedRecipe,
  supportedLanguages,
  speechLanguage,
  translatedIngredients,
  activeSpeechState,
  activeWordIndex,
  isSpeaking,
  isPreparingSpeech,
  onSelectLanguage,
  onSpeakStep,
  onStopDictation,
  onOpenNutrition,
}) {
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  const recipeKey = selectedRecipe.id || selectedRecipe.title;
  const isCurrentRecipeSpeech = activeSpeechState?.recipeId === recipeKey;
  const currentStepIdx = isCurrentRecipeSpeech ? activeSpeechState?.stepIndex ?? 0 : 0;
  const steps = selectedRecipe.steps || [];

  const activeLangObj =
    supportedLanguages.find((l) => l.code === speechLanguage) || supportedLanguages[0];

  // Build combined checkable ingredients list
  const usedList = translatedIngredients?.used || selectedRecipe.ingredientsUsed || [];
  const additionalList =
    translatedIngredients?.additional || selectedRecipe.additionalIngredients || [];
  const pantryList = translatedIngredients?.pantry || selectedRecipe.missingIngredients || [];
  const allIngredients = [
    ...usedList.map((name, i) => ({ id: `used-${i}`, name, tag: 'In fridge' })),
    ...additionalList.map((name, i) => ({ id: `add-${i}`, name, tag: 'Needed' })),
    ...pantryList.map((name, i) => ({ id: `pantry-${i}`, name, tag: 'Pantry' })),
  ];

  // Pre-tick ingredients that are already in the fridge whenever the recipe changes
  useEffect(() => {
    const initialChecked = {};
    (selectedRecipe.ingredientsUsed || []).forEach((_, i) => {
      initialChecked[`used-${i}`] = true;
    });
    setCheckedIngredients(initialChecked);
  }, [selectedRecipe.id, selectedRecipe.title]);

  // Fetch embedded YouTube cooking tutorial for this recipe
  useEffect(() => {
    const controller = new AbortController();
    setVideoInfo(null);
    setIsLoadingVideo(true);

    fetchRecipeVideo(
      backendUrl,
      {
        title: selectedRecipe.title,
        cuisine: selectedRecipe.region || selectedRecipe.cuisine || '',
      },
      controller.signal
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setVideoInfo(data?.available ? data : null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setVideoInfo(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingVideo(false);
        }
      });

    return () => controller.abort();
  }, [backendUrl, selectedRecipe.title, selectedRecipe.region, selectedRecipe.cuisine]);

  const toggleIngredient = (id) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTogglePlay = () => {
    if (isCurrentRecipeSpeech && (isSpeaking || isPreparingSpeech)) {
      onStopDictation();
    } else if (steps.length > 0) {
      onSpeakStep(selectedRecipe, currentStepIdx);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContentWithSticky}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Metadata */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.heroHeadline, { color: theme.text }]}>{selectedRecipe.title}</Text>
          <Text style={[styles.bodyMd, { color: theme.textMuted }]}>
            {selectedRecipe.region || selectedRecipe.cuisine || 'Indian'} •{' '}
            {selectedRecipe.cookTimeMinutes || 20} min
            {selectedRecipe.nutrition?.calories != null
              ? ` • ${selectedRecipe.nutrition.calories} kcal`
              : ''}
            {selectedRecipe.nutrition?.proteinGrams != null
              ? ` • ${selectedRecipe.nutrition.proteinGrams}g protein`
              : ''}
          </Text>
          {selectedRecipe.description ? (
            <Text style={[styles.bodyMd, { color: theme.textMuted }]}>
              {selectedRecipe.description}
            </Text>
          ) : null}
        </View>

        {/* Embedded YouTube Recipe Video */}
        {isLoadingVideo ? (
          <View
            style={[
              styles.videoCard,
              {
                backgroundColor: theme.surfaceContainerLow,
                borderColor: theme.border,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              },
            ]}
          >
            <ActivityIndicator size="small" color={theme.saffronOrange} />
            <Text style={[styles.labelSm, { color: theme.textMuted }]}>
              Finding YouTube cooking video…
            </Text>
          </View>
        ) : videoInfo?.embedUrl ? (
          <View
            style={[
              styles.videoCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.videoPlayerBox}>
              <WebView
                source={{
                  baseUrl: 'https://pocketchef.app',
                  html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head><body><iframe src="https://www.youtube-nocookie.com/embed/${videoInfo.videoId}?playsinline=1&rel=0&modestbranding=1&origin=https://pocketchef.app" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></body></html>`,
                }}
                userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
                originWhitelist={['*']}
                style={{ flex: 1, backgroundColor: '#000000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
            <View style={styles.videoMetaRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[styles.labelLg, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {videoInfo.title}
                </Text>
                <Text style={[styles.labelSm, { color: theme.textMuted }]} numberOfLines={1}>
                  {videoInfo.channelTitle} • Video Guide
                </Text>
              </View>
              {videoInfo.watchUrl ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(videoInfo.watchUrl)}
                  style={[
                    styles.langSelectorPill,
                    {
                      backgroundColor: theme.surfaceContainerLow,
                      borderColor: theme.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name="open-in-new" size={14} color={theme.primary} />
                  <Text style={[styles.labelSm, { color: theme.primary }]}>YouTube</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Estimated Nutrition Bar (Tap to open detailed Nutrition screen) */}
        {selectedRecipe.nutrition && (
          <TouchableOpacity
            onPress={onOpenNutrition}
            activeOpacity={0.78}
            accessibilityLabel="Open detailed nutritional values"
            style={[
              styles.nutritionBarCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.nutritionCell}>
              <Text style={[styles.nutritionVal, { color: theme.text }]}>
                {selectedRecipe.nutrition.calories}
              </Text>
              <Text style={[styles.nutritionLbl, { color: theme.textMuted }]}>kcal</Text>
            </View>
            <View style={styles.nutritionCell}>
              <Text style={[styles.nutritionVal, { color: theme.text }]}>
                {selectedRecipe.nutrition.proteinGrams}g
              </Text>
              <Text style={[styles.nutritionLbl, { color: theme.textMuted }]}>Protein</Text>
            </View>
            <View style={styles.nutritionCell}>
              <Text style={[styles.nutritionVal, { color: theme.text }]}>
                {selectedRecipe.nutrition.carbsGrams}g
              </Text>
              <Text style={[styles.nutritionLbl, { color: theme.textMuted }]}>Carbs</Text>
            </View>
            <View style={styles.nutritionCell}>
              <Text style={[styles.nutritionVal, { color: theme.text }]}>
                {selectedRecipe.nutrition.fatGrams}g
              </Text>
              <Text style={[styles.nutritionLbl, { color: theme.textMuted }]}>Fat</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.textSubtle} />
          </TouchableOpacity>
        )}

        {/* Ingredients Section + Inline Language Selector */}
        <View style={{ gap: 10 }}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.headlineMd, { color: theme.text }]}>Ingredients</Text>
            <TouchableOpacity
              onPress={() => setIsLangModalOpen(true)}
              activeOpacity={0.75}
              style={[
                styles.langSelectorPill,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  borderColor: theme.border,
                },
              ]}
            >
              <MaterialIcons name="translate" size={15} color={theme.saffronOrange} />
              <Text style={[styles.labelSm, { color: theme.text }]}>
                {activeLangObj?.label || 'English'}
              </Text>
              <MaterialIcons name="expand-more" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 8 }}>
            {allIngredients.map((ing) => {
              const isChecked = Boolean(checkedIngredients[ing.id]);
              return (
                <TouchableOpacity
                  key={ing.id}
                  onPress={() => toggleIngredient(ing.id)}
                  activeOpacity={0.75}
                  style={[
                    styles.ingredientRowCard,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <MaterialIcons
                      name={isChecked ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={isChecked ? theme.herbGreen : theme.textSubtle}
                    />
                    <Text
                      style={[
                        styles.bodyMd,
                        {
                          flex: 1,
                          fontSize: 15,
                          color: isChecked ? theme.textSubtle : theme.text,
                          textDecorationLine: isChecked ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {ing.name}
                    </Text>
                  </View>
                  <Text style={[styles.labelSm, { color: theme.textMuted }]}>{ing.tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Steps Section */}
        <View style={{ gap: 10 }}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.headlineMd, { color: theme.text }]}>Steps</Text>
            <Text style={[styles.monoText, { color: theme.textMuted }]}>
              Step {currentStepIdx + 1} of {Math.max(1, steps.length)}
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            {steps.map((step, sIdx) => {
              const isDone = sIdx < currentStepIdx;
              const isCurrent = sIdx === currentStepIdx;
              const isActiveSpeech =
                isCurrentRecipeSpeech && activeSpeechState?.stepIndex === sIdx;
              const isHighlightedOriginal =
                isActiveSpeech && !activeSpeechState?.translatedText;
              const isHighlightedTranslated =
                isActiveSpeech && Boolean(activeSpeechState?.translatedText);

              const glowStyle = {
                color: theme.glowText,
                fontWeight: '800',
                textShadowColor: theme.glowShadow,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              };

              return (
                <TouchableOpacity
                  key={`step-${sIdx}`}
                  onPress={() => onSpeakStep(selectedRecipe, sIdx)}
                  activeOpacity={0.8}
                  style={[
                    styles.stepCard,
                    {
                      backgroundColor: isCurrent
                        ? theme.surfaceContainerLowest
                        : isDone
                        ? theme.surfaceContainerLow
                        : theme.surfaceContainerLowest,
                      borderColor: isCurrent ? theme.saffronOrange : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.labelSm,
                      {
                        color: isCurrent
                          ? theme.primary
                          : isDone
                          ? theme.secondary
                          : theme.textMuted,
                      },
                    ]}
                  >
                    {isCurrent
                      ? `Step ${sIdx + 1} • Now`
                      : isDone
                      ? `Step ${sIdx + 1} • Done`
                      : `Step ${sIdx + 1}`}
                  </Text>

                  {isHighlightedOriginal && activeSpeechState?.spans?.length > 0 ? (
                    <Text style={[styles.bodyMd, { color: theme.text, fontSize: 15, lineHeight: 22 }]}>
                      {activeSpeechState.spans.map((span, wIdx) => (
                        <Text
                          key={`w-${wIdx}`}
                          style={wIdx === activeWordIndex ? glowStyle : undefined}
                        >
                          {span.text}
                        </Text>
                      ))}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.bodyMd,
                        {
                          color: isDone ? theme.textMuted : theme.text,
                          fontSize: isCurrent ? 15 : 14,
                          lineHeight: isCurrent ? 22 : 20,
                        },
                      ]}
                    >
                      {step}
                    </Text>
                  )}

                  {isHighlightedTranslated ? (
                    activeSpeechState?.spans?.length > 0 ? (
                      <Text
                        style={[
                          styles.bodyMd,
                          { color: theme.primary, fontSize: 15, lineHeight: 22, marginTop: 4 },
                        ]}
                      >
                        {activeSpeechState.spans.map((span, wIdx) => (
                          <Text
                            key={`tw-${wIdx}`}
                            style={wIdx === activeWordIndex ? glowStyle : undefined}
                          >
                            {span.text}
                          </Text>
                        ))}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.bodyMd,
                          { color: theme.primary, fontSize: 15, lineHeight: 22, marginTop: 4 },
                        ]}
                      >
                        {activeSpeechState.translatedText}
                      </Text>
                    )
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedRecipe.chefTip ? (
            <View
              style={[
                styles.chefTipBox,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  borderLeftColor: theme.saffronOrange,
                },
              ]}
            >
              <Text style={[styles.labelLg, { color: theme.text }]}>Chef's Secret</Text>
              <Text style={[styles.bodyMd, { color: theme.textMuted }]}>
                {selectedRecipe.chefTip}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Calm Floating Voice Player */}
      {steps.length > 0 && (
        <View style={[styles.voiceBarWrapper, { backgroundColor: 'transparent' }]}>
          <View style={[styles.voiceBarPill, { backgroundColor: theme.inverseSurface }]}>
            <Text
              style={[styles.labelSm, { color: theme.inverseOnSurface, flex: 1 }]}
              numberOfLines={1}
            >
              Step {currentStepIdx + 1} of {steps.length} • {activeLangObj?.label || 'English'}
              {isPreparingSpeech ? ' • Preparing…' : isSpeaking ? ' • Speaking' : ''}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={() => onSpeakStep(selectedRecipe, Math.max(0, currentStepIdx - 1))}
                disabled={currentStepIdx === 0}
                style={[styles.voiceCtrlBtn, { opacity: currentStepIdx === 0 ? 0.35 : 1 }]}
                accessibilityLabel="Previous step"
              >
                <MaterialIcons name="skip-previous" size={22} color={theme.inverseOnSurface} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTogglePlay}
                style={[styles.voicePlayCircle, { backgroundColor: theme.saffronOrange }]}
                accessibilityLabel={isSpeaking ? 'Stop voice guidance' : 'Play voice guidance'}
              >
                <MaterialIcons
                  name={
                    isPreparingSpeech
                      ? 'hourglass-top'
                      : isCurrentRecipeSpeech && isSpeaking
                      ? 'pause'
                      : 'play-arrow'
                  }
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  onSpeakStep(selectedRecipe, Math.min(steps.length - 1, currentStepIdx + 1))
                }
                disabled={currentStepIdx >= steps.length - 1}
                style={[
                  styles.voiceCtrlBtn,
                  { opacity: currentStepIdx >= steps.length - 1 ? 0.35 : 1 },
                ]}
                accessibilityLabel="Next step"
              >
                <MaterialIcons name="skip-next" size={22} color={theme.inverseOnSurface} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Language Picker Modal */}
      <Modal
        visible={isLangModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLangModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalOpen(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.border,
                maxHeight: '75%',
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Voice & Ingredient Language
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {supportedLanguages.map((lang) => {
                const active = lang.code === speechLanguage;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => {
                      onSelectLanguage(lang.code);
                      setIsLangModalOpen(false);
                    }}
                    style={[
                      styles.ingredientRowCard,
                      {
                        backgroundColor: active
                          ? theme.primaryContainer
                          : theme.surfaceContainerLow,
                        borderColor: active ? theme.saffronOrange : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.labelLg,
                        { color: active ? theme.onPrimaryContainer : theme.text },
                      ]}
                    >
                      {lang.code === 'en' ? 'English' : `${lang.label} (${lang.nativeLabel})`}
                    </Text>
                    {active && (
                      <MaterialIcons
                        name="check"
                        size={18}
                        color={theme.onPrimaryContainer}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
