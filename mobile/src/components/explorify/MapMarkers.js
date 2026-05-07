import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { TIER_COLORS } from '../../utils/theme';

export function PublicMarker({ icon: Icon, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 1.15, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.markerBase, { shadowColor: TIER_COLORS.public }]}
      >
        {Icon && <Icon size={22} color={TIER_COLORS.public} strokeWidth={2} />}
      </Pressable>
    </Animated.View>
  );
}

export function DiscoveredMarker({ icon: Icon, onPress }) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View>
      <Animated.View
        style={[
          styles.markerRing,
          {
            borderColor: TIER_COLORS.discovered,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />
      <Pressable onPress={onPress} style={styles.markerBase}>
        {Icon && <Icon size={22} color={TIER_COLORS.discovered} strokeWidth={2} />}
      </Pressable>
    </View>
  );
}

export function HiddenMarker({ onPress }) {
  const shimmerX = useRef(new Animated.Value(-42)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, { toValue: 84, duration: 2000, useNativeDriver: true })
    ).start();
  }, []);

  return (
    <Pressable onPress={onPress} style={[styles.markerBase, styles.hiddenMarker]}>
      <Animated.View
        style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]}
      />
      <Text style={styles.questionMark}>?</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  markerBase: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  markerRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
  },
  hiddenMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    width: 18,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  questionMark: {
    fontSize: 18,
    fontWeight: '700',
    color: TIER_COLORS.hidden,
    opacity: 0.7,
  },
});
