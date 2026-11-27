import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function CaptureScreen({
  theme,
  styles,
  isScanning,
  stagedPhotos,
  progressWidth,
  scanStageIndex = 0,
  scanStageText,
  onAddFromCamera,
  onAddFromGallery,
  onOpenManualInventory,
  onRemovePhotoAtIndex,
  onScanSubmit,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const canScan = stagedPhotos.length > 0 && !isScanning;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Hero Prompt */}
      <View style={{ gap: 4 }}>
        <Text style={[styles.heroHeadline, { color: theme.text }]}>What’s in your fridge?</Text>
        <Text style={[styles.bodyMd, { color: theme.textMuted }]}>
          Pick 1–8 photos from your library or camera to discover Indian recipes.
        </Text>
      </View>

      {/* Dashed Photo Picker Card */}
      <View
        style={[
          styles.dropZoneCard,
          {
            backgroundColor: theme.surfaceContainerLow,
            borderColor: theme.borderStrong,
          },
        ]}
      >
        <View style={[styles.dropZoneIconCircle, { backgroundColor: theme.primaryContainer }]}>
          <MaterialIcons name="photo-library" size={24} color={theme.onPrimaryContainer} />
        </View>

        <View style={{ alignItems: 'center', gap: 4, maxWidth: 260 }}>
          <Text style={[styles.titleMd, { color: theme.text, textAlign: 'center' }]}>
            Choose from Photos
          </Text>
          <Text style={[styles.bodyMd, { color: theme.textMuted, textAlign: 'center' }]}>
            Select fridge shelves, crisper, or pantry shots.
          </Text>
        </View>

        <View style={styles.dropZoneBtnRow}>
          <TouchableOpacity
            style={[
              styles.pillOutlineBtn,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.border,
                opacity: isScanning || stagedPhotos.length >= 8 ? 0.5 : 1,
              },
            ]}
            onPress={onAddFromCamera}
            disabled={isScanning || stagedPhotos.length >= 8}
            activeOpacity={0.75}
          >
            <MaterialIcons name="photo-camera" size={16} color={theme.text} />
            <Text style={[styles.labelSm, { color: theme.text }]}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillOutlineBtn,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.border,
                opacity: isScanning || stagedPhotos.length >= 8 ? 0.5 : 1,
              },
            ]}
            onPress={onAddFromGallery}
            disabled={isScanning || stagedPhotos.length >= 8}
            activeOpacity={0.75}
          >
            <MaterialIcons name="collections" size={16} color={theme.primary} />
            <Text style={[styles.labelSm, { color: theme.primary }]}>Browse Library</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Photos Grid */}
      <View style={{ gap: 10 }}>
        <View style={styles.sectionHeaderBetween}>
          <Text style={[styles.labelLg, { color: theme.text }]}>Selected Photos</Text>
          <Text style={[styles.monoText, { color: theme.textMuted }]}>
            {stagedPhotos.length} / 8
          </Text>
        </View>

        <View style={styles.photoGrid4}>
          {stagedPhotos.map((photo, index) => {
            const isActive = index === selectedIndex;
            return (
              <TouchableOpacity
                key={`photo-${index}`}
                onPress={() => setSelectedIndex(index)}
                activeOpacity={0.85}
                style={[
                  styles.photoTile,
                  {
                    backgroundColor: theme.surfaceContainer,
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? theme.saffronOrange : theme.border,
                  },
                ]}
              >
                <Image source={{ uri: photo.uri }} style={styles.photoTileImg} />
                {!isScanning && (
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => onRemovePhotoAtIndex(index)}
                    accessibilityLabel={`Remove photo ${index + 1}`}
                  >
                    <MaterialIcons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {stagedPhotos.length < 8 && (
            <TouchableOpacity
              onPress={onAddFromGallery}
              disabled={isScanning}
              activeOpacity={0.75}
              style={[
                styles.photoAddTile,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  borderColor: theme.borderStrong,
                  opacity: isScanning ? 0.5 : 1,
                },
              ]}
            >
              <MaterialIcons name="add-photo-alternate" size={22} color={theme.textMuted} />
              <Text style={[styles.labelSm, { color: theme.textMuted }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Multi-Stage AI Scanning Card */}
      {isScanning && (
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="auto-awesome" size={18} color={theme.saffronOrange} />
              <Text style={[styles.titleMd, { color: theme.text }]}>Scanning your photos…</Text>
            </View>
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

          <View style={{ gap: 6 }}>
            {[
              'Reading selected photos',
              'Analyzing detected veggies & dairy…',
              'Formulating ingredient list',
            ].map((label, idx) => {
              const done = scanStageIndex > idx;
              const current = scanStageIndex === idx;
              return (
                <View key={label} style={styles.stageRow}>
                  <MaterialIcons
                    name={done ? 'check-circle' : current ? 'radio-button-checked' : 'schedule'}
                    size={17}
                    color={
                      done
                        ? theme.secondary
                        : current
                        ? theme.saffronOrange
                        : theme.textSubtle
                    }
                  />
                  <Text
                    style={[
                      styles.bodyMd,
                      {
                        color: done
                          ? theme.secondary
                          : current
                          ? theme.text
                          : theme.textSubtle,
                        fontWeight: current ? '600' : '400',
                      },
                    ]}
                  >
                    {idx === 1 && current && scanStageText ? scanStageText : label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Primary CTA + Manual Entry Link */}
      <View style={{ gap: 8 }}>
        <TouchableOpacity
          style={[
            styles.primaryPillBtn,
            {
              backgroundColor: theme.primary,
              opacity: canScan ? 1 : 0.45,
            },
          ]}
          onPress={onScanSubmit}
          disabled={!canScan}
          activeOpacity={0.85}
        >
          <MaterialIcons name="auto-awesome" size={20} color={theme.onPrimary} />
          <Text style={[styles.primaryPillBtnText, { color: theme.onPrimary }]}>
            {isScanning ? 'Scanning Ingredients…' : 'Scan Ingredients'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtnCenter}
          onPress={onOpenManualInventory}
          disabled={isScanning}
          activeOpacity={0.7}
        >
          <Text style={[styles.labelSm, { color: theme.textMuted }]}>
            Or enter ingredients manually
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
