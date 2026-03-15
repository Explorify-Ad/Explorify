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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHUD } from '../components/explorify/TopHUD';
import { XPChip, TierBadge } from '../components/explorify/Badges';
import { useTheme } from '../context/ThemeContext';
import useStore from '../store/useStore';
import { CATEGORY_COLORS } from '../utils/theme';

const { width: W } = Dimensions.get('window');
const CARD_SIZE = (W - 48) / 2;

const FILTERS = ['All', 'Architecture', 'Food', 'Nature', 'History', 'Art'];

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');

  const collection = useStore((s) => s.collection);

  const shimmerAnims = useRef([0, 1, 2].map(() => new Animated.Value(-CARD_SIZE))).current;

  useEffect(() => {
    shimmerAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: CARD_SIZE * 2,
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

  const cardColor = (item) => CATEGORY_COLORS[item.category] || item.bg || '#64748b';

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <TopHUD />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: TOP_OFFSET, paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: theme.textPrimary }]}>Your Collection</Text>
        <Text style={[styles.subheading, { color: theme.textSecondary }]}>
          {collection.length} landmark{collection.length !== 1 ? 's' : ''} collected
        </Text>

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
                style={[styles.filterBtn, active && { borderBottomWidth: 2, borderBottomColor: theme.primary }]}
              >
                <Text style={[styles.filterText, { color: active ? theme.primary : theme.textSecondary }]}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

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
              <Pressable
                key={String(item.id)}
                style={[styles.card, { backgroundColor: cardColor(item), width: CARD_SIZE, height: CARD_SIZE }]}
              >
                <Text style={styles.cardWatermark} numberOfLines={1}>
                  {(item.name || '').split(' ')[0]}
                </Text>
                <View style={styles.cardOverlay}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.cardBadges}>
                    <XPChip amount={item.xpEarned || 150} />
                    <TierBadge tier={item.tier} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {collection.length > 0 && (
          <>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { borderColor: theme.textSecondary }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>Still out there</Text>
              <View style={[styles.dividerLine, { borderColor: theme.textSecondary }]} />
            </View>
            <View style={styles.grid}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.card, styles.hiddenCard, { width: CARD_SIZE, height: CARD_SIZE }]}>
                  <Animated.View
                    style={[styles.shimmer, { height: CARD_SIZE, transform: [{ translateX: shimmerAnims[i] }] }]}
                  />
                  <Text style={[styles.hiddenQ, { color: '#3D2B8E' }]}>?</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subheading: { fontSize: 13, marginBottom: 16 },
  filterScroll: { marginBottom: 16 },
  filterContent: { gap: 4, paddingRight: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  filterText: { fontSize: 14, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  card: { borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  cardWatermark: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    textAlign: 'center', textAlignVertical: 'center',
    fontSize: 36, fontWeight: '800', color: 'rgba(255,255,255,0.18)', paddingTop: 30,
  },
  cardOverlay: { padding: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  cardName: { fontSize: 13, fontWeight: '600', color: 'white', marginBottom: 6 },
  cardBadges: { flexDirection: 'row', gap: 6 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', opacity: 0.35 },
  dividerText: { fontSize: 12, textAlign: 'center' },
  hiddenCard: {
    backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  shimmer: { position: 'absolute', width: 24, backgroundColor: 'rgba(255,255,255,0.85)' },
  hiddenQ: { fontSize: 36, fontWeight: '800', opacity: 0.45 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
