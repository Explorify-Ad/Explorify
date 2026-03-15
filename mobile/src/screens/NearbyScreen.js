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
import { X, Eye, Lock, Star } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { TIER_COLORS, CATEGORY_COLORS } from '../utils/theme';
import { getCurrentLocation } from '../services/location';
import { nearbySearch } from '../services/tomtom';

const { height: H } = Dimensions.get('window');
const RADII = [200, 500, 1000];

export default function NearbyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [radius, setRadius] = useState(500);
  const [landmarks, setLandmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(route.params?.userLocation || null);

  const sheetY = useRef(new Animated.Value(H * 0.6)).current;

  useEffect(() => {
    Animated.spring(sheetY, {
      toValue: 0,
      damping: 28,
      stiffness: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  const load = useCallback(async (r) => {
    try {
      setLoading(true);
      setError(null);
      let loc = userLocation;
      if (!loc) {
        loc = await getCurrentLocation();
        setUserLocation(loc);
      }
      const results = await nearbySearch(loc.latitude, loc.longitude, r, 20);
      setLandmarks(results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => { load(radius); }, [radius]);

  const TierIcon = (tier) => {
    if (tier === 'discovered') return Eye;
    if (tier === 'hidden') return Lock;
    return Star;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.mapBg, { backgroundColor: '#F2E8C6' }]} />

      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.closeBtn, { top: insets.top + 8 }]}
      >
        <X size={20} color="#1A1A2E" strokeWidth={2} />
      </Pressable>

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 8, transform: [{ translateY: sheetY }] },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
            Within {radius}m
          </Text>
          <View style={styles.radiusRow}>
            {RADII.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRadius(r)}
                style={[
                  styles.radiusBtn,
                  { backgroundColor: r === radius ? theme.primary : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <Text
                  style={[
                    styles.radiusBtnText,
                    { color: r === radius ? 'white' : theme.textSecondary },
                  ]}
                >
                  {r}m
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                Searching nearby…
              </Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.centered}>
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>{error}</Text>
              <Pressable
                onPress={() => load(radius)}
                style={[styles.retryBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {!loading && !error && landmarks.map((landmark) => {
            const isHidden = landmark.tier === 'hidden';
            const Icon = TierIcon(landmark.tier);
            const catColor = CATEGORY_COLORS[landmark.category] || '#888';
            const tierColor = TIER_COLORS[landmark.tier] || theme.primary;

            return (
              <Pressable
                key={landmark.id}
                onPress={() => navigation.navigate('LandmarkDetail', { landmark })}
                style={[
                  styles.listItem,
                  { backgroundColor: landmark.collected ? 'rgba(245,166,35,0.05)' : 'white' },
                ]}
              >
                <View style={[styles.catDot, { backgroundColor: catColor }]} />
                <View style={styles.listItemInfo}>
                  <Text
                    style={[
                      styles.listItemName,
                      { color: isHidden ? TIER_COLORS.hidden : theme.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {landmark.name}
                  </Text>
                  <Text style={[styles.listItemType, { color: theme.textSecondary }]}>
                    {landmark.category}
                  </Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={[styles.listItemDist, { color: theme.textSecondary }]}>
                    {landmark.distance < 1000
                      ? `${landmark.distance}m`
                      : `${(landmark.distance / 1000).toFixed(1)}km`}
                  </Text>
                  <Icon size={16} color={tierColor} strokeWidth={2} />
                </View>
              </Pressable>
            );
          })}

          {!loading && !error && landmarks.length === 0 && (
            <View style={styles.centered}>
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                No places found nearby. Try a larger radius.
              </Text>
            </View>
          )}

          {!loading && !error && landmarks.length > 0 && (
            <View style={[styles.clusterBanner, { borderLeftColor: TIER_COLORS.discovered }]}>
              <Text style={[styles.clusterTitle, { color: TIER_COLORS.discovered }]}>
                {landmarks.length} places found in this area
              </Text>
              <Text style={[styles.clusterLink, { color: TIER_COLORS.discovered }]}>
                Tap any to explore →
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapBg: { ...StyleSheet.absoluteFillObject },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '68%',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: { paddingHorizontal: 16, marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  radiusRow: { flexDirection: 'row', gap: 8 },
  radiusBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  radiusBtnText: { fontSize: 13, fontWeight: '500' },
  list: { flex: 1, paddingHorizontal: 16 },
  centered: { paddingVertical: 32, alignItems: 'center', gap: 10 },
  statusText: { fontSize: 13, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  retryText: { color: 'white', fontWeight: '600', fontSize: 13 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  listItemInfo: { flex: 1, minWidth: 0 },
  listItemName: { fontSize: 15, fontWeight: '600' },
  listItemType: { fontSize: 12, marginTop: 2 },
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  listItemDist: { fontSize: 13, fontWeight: '500' },
  clusterBanner: {
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(0,201,177,0.07)',
    marginVertical: 8,
    marginBottom: 16,
  },
  clusterTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  clusterLink: { fontSize: 12, fontWeight: '500' },
});
