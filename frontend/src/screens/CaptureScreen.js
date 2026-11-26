import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, Animated } from 'react-native';

export default function CaptureScreen({
  theme,
  styles,
  isScanning,
  stagedPhotos,
  progressWidth,
  scanStageText,
  onAddFromCamera,
  onAddFromGallery,
  onOpenManualInventory,
  onClearAllStaged,
  onRemovePhotoAtIndex,
  onScanSubmit,
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {!isScanning && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Scan Whole Fridge</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSubtle }]}>
            Take or select photos of different shelves, crisper drawers, or door racks to build your kitchen inventory.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.accent }]}
              onPress={onAddFromCamera}
            >
              <Text style={[styles.btnPrimaryText, { color: theme.accentText }]}>Add Shelf Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnSecondary,
                { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong },
              ]}
              onPress={onAddFromGallery}
            >
              <Text style={[styles.btnSecondaryText, { color: theme.textMuted }]}>Select Multiple</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.manualEntryLink}
            onPress={onOpenManualInventory}
            activeOpacity={0.7}
          >
            <Text style={[styles.manualEntryLinkText, { color: theme.textMuted }]}>
              Or type ingredients manually &gt;
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {stagedPhotos.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.stagingHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Selected Photos ({stagedPhotos.length}/8)
            </Text>
            {!isScanning && (
              <TouchableOpacity onPress={onClearAllStaged}>
                <Text style={styles.dangerLinkText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.thumbnailGrid}>
            {stagedPhotos.map((photo, index) => (
              <View
                key={`photo-${index}`}
                style={[styles.thumbnailWrapper, { borderColor: theme.border }]}
              >
                <Image source={{ uri: photo.uri }} style={styles.thumbnailImage} />
                <View style={styles.shelfTagBadge}>
                  <Text style={styles.shelfTagText}>Shelf #{index + 1}</Text>
                </View>
                {!isScanning && (
                  <TouchableOpacity
                    style={styles.deleteBadge}
                    onPress={() => onRemovePhotoAtIndex(index)}
                  >
                    <Text style={styles.deleteBadgeText}>x</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {isScanning ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingHeaderRow}>
                <Text style={[styles.loadingTitle, { color: theme.text }]}>
                  Analyzing {stagedPhotos.length} {stagedPhotos.length === 1 ? 'photo' : 'photos'}
                </Text>
                <Text style={[styles.loadingModelLabel, { color: theme.textSubtle }]}>
                  PocketChef Vision
                </Text>
              </View>

              <View style={[styles.progressBarTrack, { backgroundColor: theme.border }]}>
                <Animated.View
                  style={[styles.progressBarFill, { width: progressWidth, backgroundColor: theme.accent }]}
                />
              </View>

              <Text style={[styles.loadingStageText, { color: theme.textMuted }]}>{scanStageText}</Text>
            </View>
          ) : (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.btn, styles.btnScan, { backgroundColor: theme.accent }]}
                onPress={onScanSubmit}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnScanText, { color: theme.accentText }]}>
                  Scan Entire Fridge ({stagedPhotos.length}{' '}
                  {stagedPhotos.length === 1 ? 'Photo' : 'Photos'})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
