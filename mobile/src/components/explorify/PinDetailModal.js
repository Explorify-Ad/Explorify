import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Building2,
  UtensilsCrossed,
  Leaf,
  Scroll,
  Palette,
  Moon,
  MapPin,
} from 'lucide-react-native';
import { TIER_COLORS } from '../../utils/theme';

const { width: W } = Dimensions.get('window');
const PIN_SIZE = Math.min(W * 0.5, 200);

export const CATEGORY_ICONS = {
  Architecture: Building2,
  Food:         UtensilsCrossed,
  Nature:       Leaf,
  History:      Scroll,
  Art:          Palette,
  Nightlife:    Moon,
};

export const CATEGORY_GRADIENTS = {
  Architecture: ['#b0bec5', '#64748b', '#37474f'],
  Food:         ['#ffb74d', '#f97316', '#c2410c'],
  Nature:       ['#69f0ae', '#22c55e', '#1b5e20'],
  History:      ['#ffe082', '#d97706', '#7c5200'],
  Art:          ['#f48fb1', '#ec4899', '#880e4f'],
  Nightlife:    ['#b39ddb', '#7c3aed', '#311b92'],
};

export const TIER_META = {
  public:     { color: '#9CA3AF', glow: '#6B7280', label: 'Public' },
  discovered: { color: '#FFD700', glow: '#D97706', label: 'Discovered' },
  hidden:     { color: '#C084FC', glow: '#7C3AED', label: 'Hidden' },
};

export default function PinDetailModal({ item, visible, onClose }) {
  const rotX = useRef(new Animated.Value(0)).current;
  const rotY = useRef(new Animated.Value(0)).current;

  const springBack = () => {
    Animated.parallel([
      Animated.spring(rotX, { toValue: 0, friction: 5, tension: 80, useNativeDriver: false }),
      Animated.spring(rotY, { toValue: 0, friction: 5, tension: 80, useNativeDriver: false }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      // Capture immediately — prevents backdrop from stealing the gesture
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gs) => {
        rotY.setValue((gs.dx / PIN_SIZE) * 55);
        rotX.setValue(-(gs.dy / PIN_SIZE) * 55);
      },
      onPanResponderRelease: springBack,
      onPanResponderTerminate: springBack,
    })
  ).current;

  const rotXDeg = rotX.interpolate({
    inputRange: [-90, 90],
    outputRange: ['-90deg', '90deg'],
    extrapolate: 'clamp',
  });
  const rotYDeg = rotY.interpolate({
    inputRange: [-90, 90],
    outputRange: ['-90deg', '90deg'],
    extrapolate: 'clamp',
  });

  if (!item) return null;

  const Icon = CATEGORY_ICONS[item.category] || MapPin;
  const gradients = CATEGORY_GRADIENTS[item.category] || CATEGORY_GRADIENTS.Architecture;
  const tier = TIER_META[item.tier] || TIER_META.public;

  const date = item.checkedInAt
    ? new Date(item.checkedInAt).toLocaleDateString('en-IE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/*
        Outer Pressable = backdrop (tap outside to close).
        Inner contentArea uses pointerEvents="box-none" so taps on its children
        don't bubble up and trigger onClose.
      */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.contentArea} pointerEvents="box-none">

          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <X size={18} color="white" strokeWidth={2.5} />
          </Pressable>

          {/* 3D rotatable pin — PanResponder captures all touches here */}
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.pinWrapper,
              {
                transform: [
                  { perspective: 900 },
                  { rotateX: rotXDeg },
                  { rotateY: rotYDeg },
                ],
              },
            ]}
          >
            {/* Metallic ring — no overflow:hidden so drop shadow renders */}
            <View
              style={[
                styles.ringOuter,
                {
                  width: PIN_SIZE + 14,
                  height: PIN_SIZE + 14,
                  borderRadius: (PIN_SIZE + 14) / 2,
                  borderColor: tier.color,
                  shadowColor: tier.glow,
                },
              ]}
            >
              {/* Gradient disc — clipped to circle */}
              <LinearGradient
                colors={gradients}
                style={[
                  styles.pinDisc,
                  { width: PIN_SIZE, height: PIN_SIZE, borderRadius: PIN_SIZE / 2 },
                ]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
              >
                <View style={[styles.innerRim, { borderRadius: PIN_SIZE / 2 }]} />
                <View
                  style={[
                    styles.gloss,
                    {
                      top: PIN_SIZE * 0.09,
                      left: PIN_SIZE * 0.2,
                      width: PIN_SIZE * 0.3,
                      height: PIN_SIZE * 0.14,
                    },
                  ]}
                />
              </LinearGradient>

              {/* Icon — outside overflow clip so it stays sharp */}
              <View style={[styles.iconLayer, { width: PIN_SIZE, height: PIN_SIZE }]}>
                <Icon
                  size={PIN_SIZE * 0.38}
                  color="rgba(255,255,255,0.92)"
                  strokeWidth={1.3}
                />
              </View>
            </View>
          </Animated.View>

          <Text style={styles.dragHint}>drag to rotate</Text>

          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: TIER_COLORS[item.tier] || '#F5A623' }]}>
              <Text style={styles.pillText}>{tier.label}</Text>
            </View>
            <View style={styles.pillOutline}>
              <Text style={styles.pillOutlineText}>{item.category}</Text>
            </View>
          </View>

          <Text style={styles.xpLabel}>+{item.xpEarned || 150} XP</Text>
          {date && <Text style={styles.date}>Collected {date}</Text>}

        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 18, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: -200,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinWrapper: {
    marginBottom: 24,
  },
  ringOuter: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 22,
    elevation: 18,
    padding: 4,
    backgroundColor: 'transparent',
  },
  pinDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerRim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 10,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  gloss: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 100,
    transform: [{ rotate: '-20deg' }],
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHint: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  name: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
  },
  pillText: { color: 'white', fontSize: 13, fontWeight: '600' },
  pillOutline: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  pillOutlineText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  xpLabel: {
    color: '#FFD700',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
  },
  date: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
  },
});
