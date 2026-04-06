import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import { TopHUD } from '../components/explorify/TopHUD';
import PinDetailModal, {
  CATEGORY_ICONS,
  CATEGORY_GRADIENTS,
  TIER_META,
} from '../components/explorify/PinDetailModal';
import { useTheme } from '../context/ThemeContext';
import useStore from '../store/useStore';

const { width: W } = Dimensions.get('window');
// 3 columns: 16px padding each side, 12px gap × 2
const PIN_SIZE = Math.floor((W - 56) / 3);

const FILTERS = ['All', 'Architecture', 'Food', 'Nature', 'History', 'Art'];

// ─── Single grid pin ─────────────────────────────────────────────────────────

function GridPin({ item, onPress }) {
  const Icon = CATEGORY_ICONS[item.category] || MapPin;
  const gradients = CATEGORY_GRADIENTS[item.category] || CATEGORY_GRADIENTS.Architecture;
  const tier = TIER_META[item.tier] || TIER_META.public;

  return (
    <Pressable
      style={{ alignItems: 'center', width: PIN_SIZE, marginBottom: 8 }}
      onPress={onPress}
    >
      {/*
        Two-layer trick:
          1. Outer view carries the drop shadow (NO overflow:hidden — shadow would be clipped)
          2. Inner LinearGradient is clipped to circle (overflow:hidden via borderRadius + clip)
          3. Icon lives in an absolute layer on the outer view — not clipped, stays sharp
      */}
      <View
        style={{
          width: PIN_SIZE,
          height: PIN_SIZE,
          borderRadius: PIN_SIZE / 2,
          shadowColor: tier.glow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: item.tier === 'public' ? 0.3 : 0.55,
          shadowRadius: item.tier === 'hidden' ? 16 : 10,
          elevation: 10,
        }}
      >
        {/* Ring border + gradient disc */}
        <View
          style={{
            position: 'absolute',
            width: PIN_SIZE,
            height: PIN_SIZE,
            borderRadius: PIN_SIZE / 2,
            borderWidth: item.tier === 'public' ? 2 : 3,
            borderColor: tier.color,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={gradients}
            style={{ flex: 1 }}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            {/* Beveled inner rim */}
            <View
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: PIN_SIZE / 2,
                borderWidth: 5,
                borderColor: 'rgba(0,0,0,0.18)',
              }}
            />
            {/* Specular gloss */}
            <View
              style={{
                position: 'absolute',
                top: PIN_SIZE * 0.1,
                left: PIN_SIZE * 0.19,
                width: PIN_SIZE * 0.28,
                height: PIN_SIZE * 0.13,
                backgroundColor: 'rgba(255,255,255,0.38)',
                borderRadius: 100,
                transform: [{ rotate: '-18deg' }],
              }}
            />
          </LinearGradient>
        </View>

        {/* Icon — above clip layer */}
        <View
          style={{
            position: 'absolute',
            width: PIN_SIZE,
            height: PIN_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            size={PIN_SIZE * 0.38}
            color="rgba(255,255,255,0.92)"
            strokeWidth={1.5}
          />
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: '#1A1A2E',
          marginTop: 6,
          textAlign: 'center',
          width: '100%',
          paddingHorizontal: 4,
        }}
      >
        {item.name}
      </Text>
      <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>
        {item.xpEarned || 150} XP
      </Text>
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedPin, setSelectedPin] = useState(null);

  const collection = useStore((s) => s.collection);

  const shimmerAnims = useRef(
    [0, 1, 2].map(() => new Animated.Value(-PIN_SIZE))
  ).current;

  useEffect(() => {
    shimmerAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: PIN_SIZE * 2,
          duration: 2000,
          delay: i * 300,
          useNativeDriver: true,
        })
      ).start();
    });
  }, []);

  const filtered =
    activeFilter === 'All'
      ? collection
      : collection.filter((l) => l.category === activeFilter);

  const TOP_OFFSET = insets.top + 80;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <TopHUD />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: TOP_OFFSET, paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: theme.textPrimary }]}>Your Collection</Text>
        <Text style={[styles.subheading, { color: theme.textSecondary }]}>
          {collection.length} landmark{collection.length !== 1 ? 's' : ''} collected
        </Text>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => {
            const active = f === activeFilter;
            return (
              <Pressable
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[
                  styles.filterBtn,
                  active && { borderBottomWidth: 2, borderBottomColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Pin grid or empty state */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nothing here yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Head to the map, get within 100m of a landmark and check in to collect it.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item) => (
              <GridPin
                key={String(item.id)}
                item={item}
                onPress={() => setSelectedPin(item)}
              />
            ))}
          </View>
        )}

        {/* Hidden / undiscovered placeholders */}
        {collection.length > 0 && (
          <>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { borderColor: theme.textSecondary }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
                Still out there
              </Text>
              <View style={[styles.dividerLine, { borderColor: theme.textSecondary }]} />
            </View>
            <View style={styles.grid}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{ alignItems: 'center', width: PIN_SIZE, marginBottom: 8 }}
                >
                  <View
                    style={[
                      styles.hiddenPin,
                      {
                        width: PIN_SIZE,
                        height: PIN_SIZE,
                        borderRadius: PIN_SIZE / 2,
                      },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.shimmer,
                        {
                          height: PIN_SIZE,
                          transform: [{ translateX: shimmerAnims[i] }],
                        },
                      ]}
                    />
                    <Text style={[styles.hiddenQ, { color: '#3D2B8E' }]}>?</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* 3D detail modal */}
      <PinDetailModal
        item={selectedPin}
        visible={!!selectedPin}
        onClose={() => setSelectedPin(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subheading: { fontSize: 13, marginBottom: 16 },
  filterScroll: { marginBottom: 20 },
  filterContent: { gap: 4, paddingRight: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  filterText: { fontSize: 14, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', opacity: 0.35 },
  dividerText: { fontSize: 12, textAlign: 'center' },
  hiddenPin: {
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  shimmer: {
    position: 'absolute',
    width: 24,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  hiddenQ: { fontSize: 28, fontWeight: '800', opacity: 0.45 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
