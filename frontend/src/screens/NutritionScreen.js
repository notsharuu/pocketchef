import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const DAILY_TARGETS = [
  { id: '1600', label: '1,600 kcal diet', proteinGrams: 60, carbsGrams: 210, fatGrams: 50, fiberGrams: 24 },
  { id: '2000', label: '2,000 kcal diet', proteinGrams: 75, carbsGrams: 260, fatGrams: 65, fiberGrams: 28 },
  { id: '2400', label: '2,400 kcal diet', proteinGrams: 95, carbsGrams: 310, fatGrams: 80, fiberGrams: 32 },
];

const PORTION_OPTIONS = [
  { label: 'Skip', value: 0 },
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '1.5×', value: 1.5 },
];

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function NutritionScreen({ theme, styles, selectedRecipe }) {
  const [servings, setServings] = useState(1);
  const [selectedTarget, setSelectedTarget] = useState(DAILY_TARGETS[1]);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [highlightedMacro, setHighlightedMacro] = useState(null);
  const [multipliers, setMultipliers] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const baseNutrition = selectedRecipe?.nutrition || {
    calories: 250,
    proteinGrams: 10,
    carbsGrams: 30,
    fatGrams: 10,
    fiberGrams: 4,
    ingredientsBreakdown: [],
  };

  // Build ingredient breakdown list (falls back cleanly if recipe has no breakdown array)
  const breakdownItems = useMemo(() => {
    if (Array.isArray(baseNutrition.ingredientsBreakdown) && baseNutrition.ingredientsBreakdown.length > 0) {
      return baseNutrition.ingredientsBreakdown;
    }
    const rawIngs = [
      ...(selectedRecipe?.ingredientsUsed || []),
      ...(selectedRecipe?.additionalIngredients || []),
    ];
    if (rawIngs.length === 0) {
      return [
        {
          id: 'base-dish',
          name: selectedRecipe?.title || 'Dish Serving',
          gramsPerServing: 220,
          kcal: baseNutrition.calories || 250,
          protein: baseNutrition.proteinGrams || 10,
          carbs: baseNutrition.carbsGrams || 30,
          fat: baseNutrition.fatGrams || 10,
          fiber: baseNutrition.fiberGrams || 4,
          prepNote: 'Overall IFCT dish estimate.',
        },
      ];
    }
    const count = rawIngs.length;
    return rawIngs.map((name, idx) => ({
      id: `fallback-${idx}`,
      name,
      gramsPerServing: Math.max(15, Math.round(220 / count)),
      kcal: Math.round((baseNutrition.calories || 250) / count),
      protein: Math.round(((baseNutrition.proteinGrams || 10) / count) * 10) / 10,
      carbs: Math.round(((baseNutrition.carbsGrams || 30) / count) * 10) / 10,
      fat: Math.round(((baseNutrition.fatGrams || 10) / count) * 10) / 10,
      fiber: Math.round(((baseNutrition.fiberGrams || 4) / count) * 10) / 10,
      prepNote: 'Proportional per-serving estimate.',
    }));
  }, [baseNutrition, selectedRecipe]);

  const hasCustomPortions = useMemo(
    () => breakdownItems.some((ing) => (multipliers[ing.id] ?? 1) !== 1),
    [breakdownItems, multipliers]
  );

  const totals = useMemo(() => {
    if (!hasCustomPortions) {
      return {
        kcal: (baseNutrition.calories || 0) * servings,
        protein: (baseNutrition.proteinGrams || 0) * servings,
        carbs: (baseNutrition.carbsGrams || 0) * servings,
        fat: (baseNutrition.fatGrams || 0) * servings,
        fiber: (baseNutrition.fiberGrams || Math.max(1, Math.round((baseNutrition.carbsGrams || 20) * 0.18))) * servings,
      };
    }

    return breakdownItems.reduce(
      (acc, ing) => {
        const mult = multipliers[ing.id] ?? 1;
        const factor = servings * mult;
        acc.kcal += ing.kcal * factor;
        acc.protein += ing.protein * factor;
        acc.carbs += ing.carbs * factor;
        acc.fat += ing.fat * factor;
        acc.fiber += (ing.fiber || 0) * factor;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  }, [baseNutrition, breakdownItems, hasCustomPortions, multipliers, servings]);

  // Donut arc calculations
  const proteinCals = totals.protein * 4;
  const carbsCals = totals.carbs * 4;
  const fatCals = totals.fat * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;

  const proteinPct = totalMacroCals > 0 ? Math.round((proteinCals / totalMacroCals) * 100) : 0;
  const carbsPct = totalMacroCals > 0 ? Math.round((carbsCals / totalMacroCals) * 100) : 0;
  const fatPct = totalMacroCals > 0 ? Math.max(0, 100 - proteinPct - carbsPct) : 0;

  const segments = [
    { key: 'fat', ratio: totalMacroCals > 0 ? fatCals / totalMacroCals : 0, color: theme.saffronOrange },
    { key: 'protein', ratio: totalMacroCals > 0 ? proteinCals / totalMacroCals : 0, color: theme.herbGreen },
    { key: 'carbs', ratio: totalMacroCals > 0 ? carbsCals / totalMacroCals : 0, color: theme.textSubtle },
  ];

  const activeCount = segments.filter((s) => s.ratio > 0.01).length;
  const gapSize = activeCount > 1 ? 9 : 0;
  const usableCircumference = Math.max(0, CIRCUMFERENCE - activeCount * gapSize);

  let cumulativeOffset = 0;
  const arcs = segments.map((seg) => {
    const length = seg.ratio > 0.01 ? Math.max(6, seg.ratio * usableCircumference) : 0;
    const offset = -cumulativeOffset;
    if (length > 0) cumulativeOffset += length + gapSize;
    return { ...seg, length, offset };
  });

  const legendItems = [
    { key: 'protein', label: 'Protein', grams: totals.protein, pct: proteinPct, color: theme.herbGreen },
    { key: 'carbs', label: 'Carbs', grams: totals.carbs, pct: carbsPct, color: theme.textSubtle },
    { key: 'fat', label: 'Fat', grams: totals.fat, pct: fatPct, color: theme.saffronOrange },
  ];

  const dailyRows = [
    { id: 'protein', label: 'Protein', grams: totals.protein, target: selectedTarget.proteinGrams, color: theme.herbGreen },
    { id: 'carbs', label: 'Carbohydrates', grams: totals.carbs, target: selectedTarget.carbsGrams, color: theme.textSubtle },
    { id: 'fat', label: 'Total Fat', grams: totals.fat, target: selectedTarget.fatGrams, color: theme.saffronOrange },
    { id: 'fiber', label: 'Dietary Fiber', grams: totals.fiber, target: selectedTarget.fiberGrams, color: theme.herbGreen },
  ];

  const servingSubtitle =
    servings === 1
      ? `Per serving • IFCT nutrient estimate${hasCustomPortions ? ' • Custom portion' : ''}`
      : `${servings} servings • IFCT nutrient estimate${hasCustomPortions ? ' • Custom portion' : ''}`;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Title + Servings Stepper */}
      <View style={{ gap: 10 }}>
        <View style={{ gap: 4 }}>
          <Text style={[styles.heroHeadline, { color: theme.text }]}>{selectedRecipe.title}</Text>
          <Text style={[styles.bodyMd, { color: theme.textMuted }]}>{servingSubtitle}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              borderRadius: 10,
              backgroundColor: theme.surfaceContainerLow,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 3,
            }}
          >
            <TouchableOpacity
              onPress={() => setServings((s) => Math.max(1, s - 1))}
              disabled={servings <= 1}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: servings <= 1 ? 0.35 : 1,
              }}
            >
              <Text style={[styles.titleMd, { color: theme.text }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.monoText, { color: theme.text, paddingHorizontal: 8 }]}>
              {servings}× srv
            </Text>
            <TouchableOpacity
              onPress={() => setServings((s) => Math.min(8, s + 1))}
              disabled={servings >= 8}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: servings >= 8 ? 0.35 : 1,
              }}
            >
              <Text style={[styles.titleMd, { color: theme.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Macro Donut Card */}
      <View
        style={{
          borderRadius: 16,
          backgroundColor: theme.surfaceContainerLowest,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={120} height={120} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke={theme.surfaceContainerHigh}
              strokeWidth={12}
            />
            {arcs.map(
              (arc) =>
                arc.length > 0 && (
                  <Circle
                    key={arc.key}
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeDasharray={`${arc.length.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
                    strokeDashoffset={arc.offset.toFixed(1)}
                    opacity={highlightedMacro && highlightedMacro !== arc.key ? 0.28 : 1}
                  />
                )
            )}
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={[styles.headlineMd, { color: theme.text }]}>{Math.round(totals.kcal)}</Text>
            <Text style={[styles.labelSm, { color: theme.textMuted }]}>kcal</Text>
          </View>
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          {legendItems.map((item) => {
            const isHighlighted = highlightedMacro === item.key;
            const isDimmed = highlightedMacro !== null && !isHighlighted;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setHighlightedMacro(isHighlighted ? null : item.key)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: isHighlighted ? theme.surfaceContainerLow : 'transparent',
                  opacity: isDimmed ? 0.45 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                  <Text style={[styles.bodyMd, { color: theme.text }]}>{item.label}</Text>
                  {isHighlighted && (
                    <Text style={[styles.monoText, { color: theme.textMuted, fontSize: 11 }]}>
                      ({item.pct}%)
                    </Text>
                  )}
                </View>
                <Text style={[styles.monoText, { color: theme.text }]}>{Math.round(item.grams)} g</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Daily Reference Section */}
      <View style={{ gap: 10 }}>
        <View style={styles.sectionHeaderBetween}>
          <Text style={[styles.headlineMd, { color: theme.text }]}>Daily Reference</Text>
          <TouchableOpacity
            onPress={() => setTargetModalOpen(true)}
            activeOpacity={0.75}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
          >
            <Text style={[styles.labelSm, { color: theme.textMuted }]}>{selectedTarget.label}</Text>
            <MaterialIcons name="expand-more" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View
          style={{
            borderRadius: 16,
            backgroundColor: theme.surfaceContainerLowest,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            gap: 14,
          }}
        >
          {dailyRows.map((row) => {
            const roundedGrams = Math.round(row.grams);
            const dvPct = Math.round((row.grams / row.target) * 100);
            const barWidthPct = roundedGrams <= 0 ? 0 : Math.min(100, Math.max(dvPct, 6));
            const isDimmed = highlightedMacro !== null && row.id !== highlightedMacro;

            return (
              <View key={row.id} style={{ gap: 6, opacity: isDimmed ? 0.4 : 1 }}>
                <View style={styles.sectionHeaderBetween}>
                  <Text style={[styles.labelLg, { color: theme.text }]}>{row.label}</Text>
                  <Text style={[styles.monoText, { color: row.color }]}>
                    {roundedGrams} g • {dvPct}%
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: theme.surfaceContainerHigh }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${barWidthPct}%`, backgroundColor: row.color },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* By Ingredient Section */}
      <View style={{ gap: 10 }}>
        <View style={styles.sectionHeaderBetween}>
          <Text style={[styles.headlineMd, { color: theme.text }]}>By Ingredient</Text>
          {hasCustomPortions && (
            <TouchableOpacity
              onPress={() => setMultipliers({})}
              activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <MaterialIcons name="refresh" size={15} color={theme.primary} />
              <Text style={[styles.labelSm, { color: theme.primary }]}>Reset portions</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ gap: 8 }}>
          {breakdownItems.map((item) => {
            const mult = multipliers[item.id] ?? 1;
            const factor = servings * mult;
            const kcal = Math.round(item.kcal * factor);
            const prot = Math.round(item.protein * factor);
            const carbs = Math.round(item.carbs * factor);
            const fat = Math.round(item.fat * factor);
            const fiber = Math.round((item.fiber || 0) * factor);
            const scaledGrams = Math.round(item.gramsPerServing * factor);
            const isExpanded = expandedId === item.id;
            const isSkipped = mult === 0;

            return (
              <View
                key={item.id}
                style={{
                  borderRadius: 12,
                  backgroundColor: theme.surfaceContainerLowest,
                  borderWidth: 1,
                  borderColor: theme.border,
                  overflow: 'hidden',
                }}
              >
                <TouchableOpacity
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.bodyMd,
                        {
                          flexShrink: 1,
                          color: isSkipped ? theme.textSubtle : theme.text,
                          textDecorationLine: isSkipped ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {mult !== 1 && (
                      <Text style={[styles.monoText, { color: theme.primary, fontSize: 11 }]}>
                        {mult === 0 ? 'Skipped' : `${mult}×`}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.monoText, { color: theme.textMuted }]}>
                      {kcal} kcal • {prot}g P
                    </Text>
                    <MaterialIcons
                      name={isExpanded ? 'expand-less' : 'expand-more'}
                      size={18}
                      color={theme.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View
                    style={{
                      paddingHorizontal: 14,
                      paddingBottom: 14,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: theme.border,
                      backgroundColor: theme.surfaceContainerLow,
                      gap: 10,
                    }}
                  >
                    <View style={styles.sectionHeaderBetween}>
                      <Text style={[styles.bodyMd, { color: theme.textMuted }]}>
                        Portion: <Text style={[styles.monoText, { color: theme.text }]}>{scaledGrams} g</Text>
                      </Text>
                      <Text style={[styles.monoText, { color: theme.textMuted, fontSize: 11 }]}>
                        {prot}g P · {carbs}g C · {fat}g F · {fiber}g Fib
                      </Text>
                    </View>

                    {item.prepNote ? (
                      <Text style={[styles.bodyMd, { color: theme.textMuted, fontSize: 13 }]}>
                        {item.prepNote}
                      </Text>
                    ) : null}

                    <View style={styles.sectionHeaderBetween}>
                      <Text style={[styles.labelSm, { color: theme.textMuted }]}>Adjust portion</Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 4,
                          padding: 3,
                          borderRadius: 8,
                          backgroundColor: theme.surfaceContainer,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        {PORTION_OPTIONS.map((opt) => {
                          const active = mult === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.label}
                              onPress={() =>
                                setMultipliers((prev) => ({ ...prev, [item.id]: opt.value }))
                              }
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 5,
                                borderRadius: 6,
                                backgroundColor: active ? theme.surfaceContainerLowest : 'transparent',
                              }}
                            >
                              <Text
                                style={[
                                  styles.monoText,
                                  {
                                    fontSize: 11,
                                    color: active ? theme.primary : theme.textMuted,
                                  },
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Daily Reference Picker Modal */}
      <Modal
        visible={targetModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTargetModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTargetModalOpen(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Daily Reference Target</Text>
            <View style={{ gap: 8 }}>
              {DAILY_TARGETS.map((target) => {
                const active = target.id === selectedTarget.id;
                return (
                  <TouchableOpacity
                    key={target.id}
                    onPress={() => {
                      setSelectedTarget(target);
                      setTargetModalOpen(false);
                    }}
                    style={[
                      styles.ingredientRowCard,
                      {
                        backgroundColor: active ? theme.primaryContainer : theme.surfaceContainerLow,
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
                      {target.label}
                    </Text>
                    {active && (
                      <MaterialIcons name="check" size={18} color={theme.onPrimaryContainer} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
