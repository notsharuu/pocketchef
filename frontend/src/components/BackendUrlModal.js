import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

export default function BackendUrlModal({
  visible,
  tempUrl,
  theme,
  styles,
  onChangeTempUrl,
  onCancel,
  onSave,
}) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.text }]}>Backend Server Configuration</Text>
          <Text style={[styles.modalDescription, { color: theme.textMuted }]}>
            Enter your Mac's local IP address and port 3001 so this iPhone can communicate with the backend over Wi-Fi.
          </Text>

          <TextInput
            style={[
              styles.urlInput,
              {
                backgroundColor: theme.cardAlt,
                borderColor: theme.borderStrong,
                color: theme.text,
              },
            ]}
            value={tempUrl}
            onChangeText={onChangeTempUrl}
            placeholder="http://192.168.1.3:3001"
            placeholderTextColor={theme.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: theme.cardAlt }]}
              onPress={onCancel}
            >
              <Text style={[styles.modalBtnCancelText, { color: theme.textMuted }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: theme.accent }]}
              onPress={onSave}
            >
              <Text style={[styles.modalBtnSaveText, { color: theme.accentText }]}>
                Save & Reconnect
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
