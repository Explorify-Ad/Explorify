import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Eye, Lock, Star, Check, Navigation, Zap, Sparkles, Clock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { TIER_COLORS, CATEGORY_COLORS } from '../utils/theme';
import { CATEGORY_ICONS } from '../components/explorify/PinDetailModal';
import { getCurrentLocation } from '../services/location';
import { fetchNearbyLandmarks } from '../services/supabase';
import { getRecommendations, buildContext, buildPreferences } from '../utils/recommendations';
import useStore from '../store/useStore';

const { height: H } = Dimensions.get('window');
const RADII = [200, 500, 1000];

const SORT_MODES = [
  { key: 'recommended', label: 'For You',  Icon: Sparkles },
  { key: 'nearest',     label: 'Nearest',  Icon: Navigation },
  { key: 'rare',        label: 'Rare',     Icon: Lock },
];

const TIER_META = {
  public:     { label: 'Common', Icon: Star, xp: 150 },
  discovered: { label: 'Rare',   Icon: Eye,  xp: 320 },
  hidden:     { label: 'Hidden', Icon: Lock, xp: 600 },
};

// Returns a context string based on the current hour
function getTimeContext() {
  const h = new Date().getHours();
  if (h >= 6  && h < 11) return { label: 'Morning picks',  hint: 'Fresh starts — parks and cafés', emoji: '🌅' };
  if (h >= 11 && h < 14) return { label: 'Lunchtime',      hint: 'Food & cultural gems nearby',    emoji: '🍽️' };
  if (h >= 14 && h < 17) return { label: 'Afternoon',      hint: 'Architecture & history shine now', emoji: '🏛️' };
  if (h >= 17 && h < 21) return { label: 'Evening picks',  hint: 'Art galleries & nightlife opening', emoji: '🌆' };
  return { label: 'Night mode', hint: 'Hidden spots and night venues', emoji: '🌙' };
}

export default function NearbyScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const interests     = useStore((s) => s.interests);
  const visitorType   = useStore((s) => s.visitorType);
  const collection    = useStore((s) => s.collection);
  const getUnlockedTiers = useStore((s) => s.getUnlockedTiers);
  const unlockedTiers = getUnlockedTiers();

  const [radius,       setRadius]       = useState(500);
  const [landmarks,    setLandmarks]    = useState([]);
  const [sorted,       setSorted]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [sortMode,     setSortMode]     = useState('recommended');
  const [userLocation, setUserLocation] = useState(route.params?.userLocation || null);

  const sheetY     = useRef(new Animated.Value(H * 0.7)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  const timeCtx = getTimeContext();

  useEffect(() => {
    Animated.spring(sheetY, { toValue: 0, damping: 24, stiffness: 240, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // Re-sort whenever landmarks, sort mode, or preferences change
  useEffect(() => {
    if (!landmarks.length) { setSorted([]); return; }

    const context     = buildContext({ weather: null, batteryTier: 'ok' });
    const preferences = buildPreferences({ interests, visitorType, collection });

    let result;
    if (sortMode === 'recommended') {
      result = getRecommendations(landmarks, preferences, context);
    } else if (sortMode === 'nearest') {
      result = [...landmarks].sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    } else {
      // 'rare' — hidden first, then discovered, then public; within each tier sort by score
      const scored = getRecommendations(landmarks, preferences, context);
      const tierRank = { hidden: 0, discovered: 1, public: 2 };
      result = scored.sort((a, b) => (tierRank[a.tier] ?? 2) - (tierRank[b.tier] ?? 2));
    }
    setSorted(result);
  }, [landmarks, sortMode, interests, visitorType, collection]);

  const load = useCallback(async (r) => {
    try {
      setLoading(true);
      setError(null);
      let loc = userLocation;
      if (!loc) { loc = await getCurrentLocation(); setUserLocation(loc); }
      const results = await fetchNearbyLandmarks(loc.latitude, loc.longitude, r);
      setLandmarks(results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => { load(radius); }, [radius]);

  const hiddenCount     = landmarks.filter(l => l.tier === 'hidden').length;
  const discoveredCount = landmarks.filter(l => l.tier === 'discovered').length;

  // Top recommended landmark (score-wise, uncollected)
  const topPick = sorted.find(l => !l.collected && l.score != null);

  const bg = isDark ? theme.surface : '#0f172a';

  return (
    <View style={styles.root}>
      {/* Backdrop */}
      <LinearGradient colors={[bg, '#1e3a5f']} style={StyleSheet.absoluteFill} />

      {/* Radar rings */}
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[styles.radarRing, {
            width: i * 90, height: i * 90, borderRadius: i * 45,
            opacity: 0.06 - i * 0.01,
            top: '50%', left: '50%',
            marginLeft: -(i * 45), marginTop: -(i * 45),
          }]}
        />
      ))}
      <Animated.View style={[styles.radarDot, { transform: [{ scale: pulseScale }] }]} />

      {/* Close */}
      <Pressable onPress={() => navigation.goBack()} style={[styles.closeBtn, { top: insets.top + 10 }]}>
        <X size={18} color="#1A1A2E" strokeWidth={2.5} />
      </Pressable>

      {/* Sheet */}
      <Animated.View style={[
        styles.sheet,
        { backgroundColor: theme.sheetBg, paddingBottom: insets.bottom + 8, transform: [{ translateY: sheetY }] },
      ]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Explore Nearby</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
              {loading ? 'Searching…' : `${landmarks.length} place${landmarks.length !== 1 ? 's' : ''} found`}
            </Text>
          </View>
          {!loading && landmarks.length > 0 && (
            <View style={styles.tierSummary}>
              {hiddenCount > 0 && (
                <View style={[styles.tierPill, { backgroundColor: '#C084FC22', borderColor: '#C084FC55' }]}>
                  <Lock size={10} color="#C084FC" strokeWidth={2.5} />
                  <Text style={[styles.tierPillText, { color: '#C084FC' }]}>{hiddenCount} hidden</Text>
                </View>
              )}
              {discoveredCount > 0 && (
                <View style={[styles.tierPill, { backgroundColor: '#FFD70022', borderColor: '#FFD70055' }]}>
                  <Eye size={10} color="#B8860B" strokeWidth={2.5} />
                  <Text style={[styles.tierPillText, { color: '#B8860B' }]}>{discoveredCount} rare</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Time-of-day context banner */}
        <View style={[styles.contextBanner, { backgroundColor: isDark ? theme.cardBg : '#1A1A2E' }]}>
          <Text style={styles.contextEmoji}>{timeCtx.emoji}</Text>
          <View style={styles.contextText}>
            <Text style={styles.contextLabel}>{timeCtx.label}</Text>
            <Text style={styles.contextHint}>{timeCtx.hint}</Text>
          </View>
          {topPick && (
            <View style={styles.topPickBadge}>
              <Sparkles size={10} color="#F5A623" strokeWidth={2} />
              <Text style={styles.topPickText}>Top pick</Text>
            </View>
          )}
        </View>

        {/* Sort mode chips */}
        <View style={styles.sortRow}>
          {SORT_MODES.map(({ key, label, Icon }) => {
            const active = sortMode === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSortMode(key)}
                style={[
                  styles.sortChip,
                  { borderColor: active ? theme.primary : theme.border, backgroundColor: isDark ? theme.cardBg : 'white' },
                  active && { borderColor: theme.primary, backgroundColor: theme.primary + '18' },
                ]}
              >
                <Icon size={11} color={active ? theme.primary : theme.textMuted} strokeWidth={2} />
                <Text style={[styles.sortChipText, { color: active ? theme.primary : theme.textSecondary }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Radius selector */}
        <View style={styles.radiusRow}>
          {RADII.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRadius(r)}
              style={[
                styles.radiusChip,
                { borderColor: theme.border, backgroundColor: isDark ? theme.cardBg : 'white' },
                r === radius && styles.radiusChipActive,
              ]}
            >
              {r === radius && (
                <LinearGradient
                  colors={['#F5A623', '#F97316']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              )}
              <Navigation size={11} color={r === radius ? 'white' : theme.textMuted} strokeWidth={2} />
              <Text style={[styles.radiusChipText, { color: r === radius ? 'white' : theme.textSecondary }]}>
                {r < 1000 ? `${r}m` : '1 km'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={styles.listContent}>
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={[styles.statusText, { color: theme.textMuted }]}>Finding places nearby…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.centered}>
              <Text style={[styles.statusText, { color: theme.textMuted }]}>{error}</Text>
              <Pressable onPress={() => load(radius)} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {!loading && !error && sorted.length === 0 && (
            <View style={styles.centered}>
              <Navigation size={36} color={theme.border} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>Nothing close by</Text>
              <Text style={[styles.statusText, { color: theme.textMuted }]}>Try increasing the radius</Text>
            </View>
          )}

          {!loading && !error && sorted.map((lm, idx) => {
            const catColor   = CATEGORY_COLORS[lm.category] || '#64748b';
            const meta       = TIER_META[lm.tier] || TIER_META.public;
            const CatIcon    = CATEGORY_ICONS[lm.category];
            const TierIcon   = meta.Icon;
            const tierColor  = TIER_COLORS[lm.tier] || theme.primary;
            const distPct    = Math.max(0.04, 1 - (lm.distance ?? 0) / radius);
            const distLabel  = (lm.distance ?? 0) < 1000
              ? `${Math.round(lm.distance ?? 0)}m`
              : `${((lm.distance ?? 0) / 1000).toFixed(1)}km`;
            const isTopPick  = idx === 0 && sortMode === 'recommended' && !lm.collected;
            const locked     = lm.tier === 'hidden' && !unlockedTiers.hidden;
            const scoreLabel = lm.score != null ? `${Math.round(lm.score)}%` : null;

            return (
              <Pressable
                key={lm.id}
                onPress={() => !locked && navigation.navigate('LandmarkDetail', { landmark: lm })}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: isDark ? theme.cardBg : 'white', opacity: locked ? 0.55 : pressed ? 0.87 : 1 },
                  isTopPick && styles.cardHighlighted,
                  pressed && !locked && styles.cardPressed,
                ]}
              >
                {/* Top pick ribbon */}
                {isTopPick && (
                  <View style={styles.topPickRibbon}>
                    <Sparkles size={9} color="white" strokeWidth={2} />
                    <Text style={styles.topPickRibbonText}>Top for you</Text>
                  </View>
                )}

                {/* Icon box */}
                <View style={styles.iconWrap}>
                  <LinearGradient
                    colors={locked ? ['#6B7280', '#9CA3AF'] : [catColor, catColor + 'bb']}
                    style={styles.iconBox}
                    start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                  >
                    {locked
                      ? <Lock size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />
                      : CatIcon && <CatIcon size={20} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />}
                  </LinearGradient>
                  {lm.collected && (
                    <View style={styles.collectedBadge}>
                      <Check size={9} color="white" strokeWidth={3} />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                  <Text
                    style={[
                      styles.cardName,
                      { color: locked ? theme.textMuted : lm.tier === 'hidden' ? '#A855F7' : theme.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {locked ? 'Hidden Spot' : lm.name}
                  </Text>
                  <Text style={[styles.cardCat, { color: theme.textMuted }]}>
                    {locked ? 'Unlock at Level 4' : lm.category}
                  </Text>
                  {/* Distance / score bar */}
                  <View style={[styles.distTrack, { backgroundColor: theme.border }]}>
                    <View style={[styles.distFill, { width: `${distPct * 100}%`, backgroundColor: locked ? '#9CA3AF' : catColor }]} />
                  </View>
                </View>

                {/* Right meta */}
                <View style={styles.cardRight}>
                  <View style={[styles.tierBadge, { borderColor: tierColor + '66', backgroundColor: tierColor + '15' }]}>
                    <TierIcon size={10} color={tierColor} strokeWidth={2.5} />
                    <Text style={[styles.tierText, { color: tierColor }]}>{meta.label}</Text>
                  </View>
                  {!locked && (
                    <View style={styles.xpBadge}>
                      <Zap size={9} color="#F5A623" strokeWidth={2.5} />
                      <Text style={styles.xpText}>{meta.xp}</Text>
                    </View>
                  )}
                  {sortMode === 'recommended' && scoreLabel && !locked && (
                    <Text style={[styles.scoreText, { color: theme.primary }]}>{scoreLabel}</Text>
                  )}
                  {!locked && (
                    <Text style={[styles.distText, { color: theme.textSecondary }]}>{distLabel}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  radarRing: { position: 'absolute', borderWidth: 1.5, borderColor: 'white' },
  radarDot: {
    position: 'absolute', top: '50%', left: '50%',
    width: 12, height: 12, borderRadius: 6,
    marginLeft: -6, marginTop: -6,
    backgroundColor: '#F5A623',
    shadowColor: '#F5A623', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
  },

  closeBtn: {
    position: 'absolute', right: 16, zIndex: 60,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '84%',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 24,
  },
  handle: {
    width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, marginTop: 2 },
  tierSummary: { flexDirection: 'row', gap: 6, flexShrink: 0, paddingTop: 4 },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1,
  },
  tierPillText: { fontSize: 10, fontWeight: '700' },

  // Time-of-day banner
  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 10, marginBottom: 2,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14,
  },
  contextEmoji: { fontSize: 20 },
  contextText: { flex: 1 },
  contextLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  contextHint:  { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  topPickBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,166,35,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100,
  },
  topPickText: { fontSize: 10, color: '#F5A623', fontWeight: '700' },

  // Sort chips
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5,
  },
  sortChipText: { fontSize: 12, fontWeight: '600' },

  radiusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  radiusChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, overflow: 'hidden',
  },
  radiusChipActive: { borderColor: 'transparent' },
  radiusChipText: { fontSize: 13, fontWeight: '600' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20, gap: 10 },

  centered: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  statusText: { fontSize: 13, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 100, marginTop: 4 },
  retryText: { color: 'white', fontWeight: '700', fontSize: 13 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHighlighted: {
    borderWidth: 1.5, borderColor: '#F5A62344',
    shadowColor: '#F5A623', shadowOpacity: 0.12, shadowRadius: 12,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },

  // Top-pick ribbon
  topPickRibbon: {
    position: 'absolute', top: 0, left: 0,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F5A623', paddingHorizontal: 8, paddingVertical: 3,
    borderTopLeftRadius: 18, borderBottomRightRadius: 12,
  },
  topPickRibbonText: { color: 'white', fontSize: 9, fontWeight: '800' },

  iconWrap: { position: 'relative' },
  iconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  collectedBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },

  cardBody: { flex: 1, minWidth: 0, gap: 3 },
  cardName: { fontSize: 14, fontWeight: '700' },
  cardCat: { fontSize: 11, fontWeight: '500' },
  distTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  distFill: { height: '100%', borderRadius: 2 },

  cardRight: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 100, borderWidth: 1,
  },
  tierText:  { fontSize: 10, fontWeight: '700' },
  xpBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  xpText:    { fontSize: 11, fontWeight: '600', color: '#F5A623' },
  scoreText: { fontSize: 10, fontWeight: '700' },
  distText:  { fontSize: 12, fontWeight: '600' },
});
