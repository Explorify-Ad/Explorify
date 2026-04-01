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
import { X, Eye, Lock, Star, Check, Navigation, Zap } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { TIER_COLORS, CATEGORY_COLORS } from '../utils/theme';
import { CATEGORY_ICONS } from '../components/explorify/PinDetailModal';
import { getCurrentLocation } from '../services/location';
import { fetchNearbyLandmarks } from '../services/supabase';

const { height: H } = Dimensions.get('window');
const RADII = [200, 500, 1000];

const TIER_META = {
  public:     { label: 'Common',     Icon: Star,  xp: 150 },
  discovered: { label: 'Rare',       Icon: Eye,   xp: 320 },
  hidden:     { label: 'Hidden',     Icon: Lock,  xp: 600 },
};

export default function NearbyScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { theme }  = useTheme();

  const [radius,       setRadius]       = useState(500);
  const [landmarks,    setLandmarks]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [userLocation, setUserLocation] = useState(route.params?.userLocation || null);

  const sheetY     = useRef(new Animated.Value(H * 0.7)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(sheetY, { toValue: 0, damping: 24, stiffness: 240, useNativeDriver: true }).start();

    // Radar pulse animation on the dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

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

  const hiddenCount    = landmarks.filter(l => l.tier === 'hidden').length;
  const discoveredCount = landmarks.filter(l => l.tier === 'discovered').length;

  return (
    <View style={styles.root}>
      {/* Map tint backdrop */}
      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={StyleSheet.absoluteFill} />

      {/* Radar rings (decorative) */}
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[styles.radarRing, {
            width: i * 90, height: i * 90,
            borderRadius: i * 45,
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
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY: sheetY }] }]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Explore Nearby</Text>
            <Text style={styles.headerSub}>
              {loading ? 'Searching…' : `${landmarks.length} place${landmarks.length !== 1 ? 's' : ''} found`}
            </Text>
          </View>
          {!loading && landmarks.length > 0 && (
            <View style={styles.tierSummary}>
              {hiddenCount > 0 && (
                <View style={[styles.tierPill, { backgroundColor: '#C084FC' + '22', borderColor: '#C084FC' + '55' }]}>
                  <Lock size={10} color="#C084FC" strokeWidth={2.5} />
                  <Text style={[styles.tierPillText, { color: '#C084FC' }]}>{hiddenCount} hidden</Text>
                </View>
              )}
              {discoveredCount > 0 && (
                <View style={[styles.tierPill, { backgroundColor: '#FFD700' + '22', borderColor: '#FFD700' + '55' }]}>
                  <Eye size={10} color="#B8860B" strokeWidth={2.5} />
                  <Text style={[styles.tierPillText, { color: '#B8860B' }]}>{discoveredCount} rare</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Radius selector */}
        <View style={styles.radiusRow}>
          {RADII.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRadius(r)}
              style={[styles.radiusChip, r === radius && styles.radiusChipActive]}
            >
              {r === radius && (
                <LinearGradient
                  colors={['#F5A623', '#F97316']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              )}
              <Navigation size={11} color={r === radius ? 'white' : '#6B7280'} strokeWidth={2} />
              <Text style={[styles.radiusChipText, r === radius && styles.radiusChipTextActive]}>
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
              <Text style={styles.statusText}>Finding places nearby…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.centered}>
              <Text style={styles.statusText}>{error}</Text>
              <Pressable onPress={() => load(radius)} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {!loading && !error && landmarks.length === 0 && (
            <View style={styles.centered}>
              <Navigation size={36} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Nothing close by</Text>
              <Text style={styles.statusText}>Try increasing the radius</Text>
            </View>
          )}

          {!loading && !error && landmarks.map((lm, idx) => {
            const catColor  = CATEGORY_COLORS[lm.category] || '#64748b';
            const meta      = TIER_META[lm.tier] || TIER_META.public;
            const CatIcon   = CATEGORY_ICONS[lm.category];
            const TierIcon  = meta.Icon;
            const tierColor = TIER_COLORS[lm.tier] || theme.primary;
            const distPct   = Math.max(0.04, 1 - lm.distance / radius);
            const distLabel = lm.distance < 1000
              ? `${Math.round(lm.distance)}m`
              : `${(lm.distance / 1000).toFixed(1)}km`;

            return (
              <Pressable
                key={lm.id}
                onPress={() => navigation.navigate('LandmarkDetail', { landmark: lm })}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                {/* Icon box */}
                <View style={styles.iconWrap}>
                  <LinearGradient
                    colors={[catColor, catColor + 'bb']}
                    style={styles.iconBox}
                    start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                  >
                    {CatIcon && <CatIcon size={20} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />}
                  </LinearGradient>
                  {lm.collected && (
                    <View style={styles.collectedBadge}>
                      <Check size={9} color="white" strokeWidth={3} />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                  <Text style={[styles.cardName, lm.tier === 'hidden' && { color: '#A855F7' }]} numberOfLines={1}>
                    {lm.name}
                  </Text>
                  <Text style={styles.cardCat}>{lm.category}</Text>
                  {/* Distance bar */}
                  <View style={styles.distTrack}>
                    <View style={[styles.distFill, { width: `${distPct * 100}%`, backgroundColor: catColor }]} />
                  </View>
                </View>

                {/* Right: tier + distance */}
                <View style={styles.cardRight}>
                  <View style={[styles.tierBadge, { borderColor: tierColor + '66', backgroundColor: tierColor + '15' }]}>
                    <TierIcon size={10} color={tierColor} strokeWidth={2.5} />
                    <Text style={[styles.tierText, { color: tierColor }]}>{meta.label}</Text>
                  </View>
                  <View style={styles.xpBadge}>
                    <Zap size={9} color="#F5A623" strokeWidth={2.5} />
                    <Text style={styles.xpText}>{meta.xp}</Text>
                  </View>
                  <Text style={styles.distText}>{distLabel}</Text>
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

  // Radar graphic
  radarRing: {
    position: 'absolute',
    borderWidth: 1.5, borderColor: 'white',
  },
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
    height: '82%',
    backgroundColor: '#FDFAF5',
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
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  tierSummary: { flexDirection: 'row', gap: 6, flexShrink: 0, paddingTop: 4 },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1,
  },
  tierPillText: { fontSize: 10, fontWeight: '700' },

  radiusRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  radiusChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'white', overflow: 'hidden',
  },
  radiusChipActive: { borderColor: 'transparent' },
  radiusChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  radiusChipTextActive: { color: 'white' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20, gap: 10 },

  centered: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  statusText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 22, paddingVertical: 10, borderRadius: 100,
    backgroundColor: '#F5A623', marginTop: 4,
  },
  retryText: { color: 'white', fontWeight: '700', fontSize: 13 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 18, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },

  iconWrap: { position: 'relative' },
  iconBox: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  collectedBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },

  cardBody: { flex: 1, minWidth: 0, gap: 3 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  cardCat: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  distTrack: {
    height: 3, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 2,
    overflow: 'hidden', marginTop: 4,
  },
  distFill: { height: '100%', borderRadius: 2 },

  cardRight: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 100, borderWidth: 1,
  },
  tierText: { fontSize: 10, fontWeight: '700' },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  xpText: { fontSize: 11, fontWeight: '600', color: '#F5A623' },
  distText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
});
