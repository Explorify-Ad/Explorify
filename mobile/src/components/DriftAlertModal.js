import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import useStore from '../store/useStore';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export function DriftAlertModal() {
  const { theme } = useTheme();
  const driftAlert = useStore((s) => s.driftAlert);
  const interests = useStore((s) => s.interests);
  const setInterests = useStore((s) => s.setInterests);
  const clearDriftAlert = useStore((s) => s.clearDriftAlert);

  const [animValue] = useState(new Animated.Value(0));

  if (!driftAlert?.drifted) return null;

  const { type, from, to, confidence, visitCount } = driftAlert;
  // type: 'new_interest' | 'abandoned_interest'

  const isNewInterest = type === 'new_interest';
  const isAbandonedInterest = type === 'abandoned_interest';

  const handleAddInterest = () => {
    if (!interests.includes(to.toLowerCase())) {
      setInterests([...interests, to.toLowerCase()]);
    }
    clearDriftAlert();
  };

  const handleRemoveInterest = () => {
    const updated = interests.filter((i) => i.toLowerCase() !== to.toLowerCase());
    setInterests(updated);
    clearDriftAlert();
  };

  const handleDismiss = () => {
    clearDriftAlert();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlay} onPress={handleDismiss} />

        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          {/* Header Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isNewInterest
                  ? `${theme.primary}20`
                  : `#FF6B6B20`,
              },
            ]}
          >
            <Text style={styles.icon}>
              {isNewInterest ? '✨' : '📍'}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {isNewInterest
              ? `Exploring ${to}?`
              : `Haven't Visited ${to}?`}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {isNewInterest
              ? `You've been exploring **${to}** a lot lately (${visitCount} recent visits). This seems like a new interest! Should we add it to your profile?`
              : `You used to love **${to}**, but haven't visited in a while (${visitCount} total visits). Should we remove it from your interests?`}
          </Text>

          {/* Confidence & Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.stat, { borderColor: theme.border }]}>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                Confidence
              </Text>
              <Text
                style={[
                  styles.statValue,
                  { color: theme.primary },
                ]}
              >
                {(confidence * 100).toFixed(0)}%
              </Text>
            </View>

            {from && (
              <View style={[styles.stat, { borderColor: theme.border }]}>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  {isNewInterest ? 'Replacing' : 'Currently'}
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: theme.textPrimary },
                  ]}
                >
                  {from}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {isNewInterest ? (
              <>
                <Pressable
                  style={[
                    styles.buttonPrimary,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleAddInterest}
                >
                  <Text style={styles.buttonTextPrimary}>
                    ✅ Add to Interests
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.buttonSecondary,
                    { borderColor: theme.border },
                  ]}
                  onPress={handleDismiss}
                >
                  <Text
                    style={[
                      styles.buttonTextSecondary,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Not Now
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[
                    styles.buttonDanger,
                  ]}
                  onPress={handleRemoveInterest}
                >
                  <Text style={styles.buttonTextPrimary}>
                    🗑️ Remove from Interests
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.buttonSecondary,
                    { borderColor: theme.border },
                  ]}
                  onPress={handleDismiss}
                >
                  <Text
                    style={[
                      styles.buttonTextSecondary,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Keep It
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Footer Info */}
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            You can manage interests anytime in your profile.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    width: width * 0.88,
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  stat: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  buttonPrimary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDanger: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonSecondary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
