import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export function PrimaryAction({ children, onPress, disabled, style }) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[styles.primary, { backgroundColor: theme.primary }, disabled && { opacity: 0.5 }]}
      >
        <Text style={styles.primaryText}>{children}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function SecondaryAction({ children, onPress, style }) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.secondary, { borderColor: theme.primary }]}
      >
        <Text style={[styles.secondaryText, { color: theme.primary }]}>{children}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function FAB({ icon, badge, pulse, onPress, bgColor, style }) {
  const { theme } = useTheme();
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  const bg = bgColor || theme.primary;

  useEffect(() => {
    if (pulse) {
      Animated.loop(
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.5, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [pulse]);

  return (
    <Pressable onPress={onPress} style={[styles.fab, { backgroundColor: bg }, style]}>
      {pulse && (
        <Animated.View
          style={[
            styles.fabPulse,
            { backgroundColor: bg, transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />
      )}
      {icon}
      {badge !== undefined && badge > 0 && (
        <View style={[styles.fabBadge, { backgroundColor: theme.secondary }]}>
          <Text style={styles.fabBadgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondary: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  secondaryText: { fontWeight: '600', fontSize: 15 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
});
