import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { X, MapPin } from 'lucide-react-native';
import { TierBadge, CategoryPill, XPChip } from '../components/explorify/Badges';
import { PrimaryAction } from '../components/explorify/Buttons';
import { useTheme } from '../context/ThemeContext';
import { haversineDistance } from '../services/tomtom';
import { CATEGORY_COLORS } from '../utils/theme';
import useStore from '../store/useStore';

const CHECK_IN_RANGE = 100; // metres

export default function LandmarkDetailScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();

  // landmark can be a full object passed from MapScreen/NearbyScreen,
  // or just an id (legacy). Fall back gracefully.
  const landmark = params?.landmark || null;

  const checkIn = useStore((s) => s.checkIn);

  const [distance, setDistance] = useState(null);
  const [isInRange, setIsInRange] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [xpEarned, setXpEarned] = useState(() => {
    const { public: pub, discovered, hidden } = { public: 150, discovered: 320, hidden: 600 };
    return ({ public: pub, discovered, hidden })[params?.landmark?.tier] || 150;
  });

  const sheetY = useRef(new Animated.Value(600)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMode('discovery');
    Animated.spring(sheetY, { toValue: 0, damping: 26, stiffness: 280, useNativeDriver: true }).start();

    let sub;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (pos) => {
          if (!landmark?.lat || !landmark?.lon) return;
          const d = haversineDistance(
            pos.coords.latitude,
            pos.coords.longitude,
            landmark.lat,
            landmark.lon,
          );
          setDistance(d);
          const inRange = d <= CHECK_IN_RANGE;
          setIsInRange(inRange);
          // Animate progress bar: 0 = far (>1km), 1 = in range
          const progress = Math.min(1, Math.max(0, 1 - (d - CHECK_IN_RANGE) / 900));
          Animated.timing(progressAnim, {
            toValue: inRange ? 1 : progress,
            duration: 400,
            useNativeDriver: false,
          }).start();
        },
      );
    };

    startTracking();

    return () => {
      sub?.remove();
      setMode('exploration');
    };
  }, []);

  const handleCheckIn = async () => {
    const earned = await checkIn(landmark);
    setXpEarned(earned || 150);
    setCheckedIn(true);
    Animated.spring(celebrateScale, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true }).start();
    setTimeout(() => navigation.goBack(), 2200);
  };

  const categoryColor = landmark?.category ? CATEGORY_COLORS[landmark.category] : theme.primary;
  const name = landmark?.name || 'Historic Landmark';
  const category = landmark?.category || 'Architecture';
  const tier = landmark?.tier || 'public';
  const address = landmark?.address || '';

  const distLabel = distance == null
    ? 'Locating…'
    : distance < 1000
    ? `${distance}m away`
    : `${(distance / 1000).toFixed(1)}km away`;

  return (
    <View style={styles.container}>
      <View style={[styles.bg, { backgroundColor: '#C8ECE8', opacity: 0.5 }]} />

      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.closeBtn, { top: insets.top + 8 }]}
      >
        <X size={20} color="#1A1A2E" strokeWidth={2} />
      </Pressable>

      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }]}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: categoryColor + 'CC' }]}>
          <Text style={styles.heroText}>{category.toUpperCase()}</Text>
          <View style={styles.heroFade} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.landmarkName, { color: theme.textPrimary }]}>{name}</Text>
          <View style={styles.badgeRow}>
            <TierBadge tier={tier} />
            <CategoryPill category={category} color={theme.primary} />
          </View>

          {address ? (
            <Text style={[styles.address, { color: theme.textSecondary }]}>{address}</Text>
          ) : null}

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Discover the story behind this{' '}
            <Text style={{ fontWeight: '600' }}>{category.toLowerCase()}</Text> landmark. Check in
            when you arrive to earn XP and unlock hidden details.{' '}
            <Text style={{ color: theme.primary, fontWeight: '600' }}>read more</Text>
          </Text>

          <View style={[styles.storyTrail, { borderLeftColor: '#00C9B1', backgroundColor: 'rgba(0,201,177,0.05)' }]}>
            <Text style={[styles.storyTrailLabel, { color: theme.textSecondary }]}>Part of</Text>
            <Text style={[styles.storyTrailName, { color: '#00C9B1' }]}>
              Local Discovery Trail
            </Text>
          </View>

          {/* GPS Proximity */}
          <View style={styles.proximitySection}>
            <View style={styles.proximityRow}>
              <View style={styles.proximityLeft}>
                <MapPin size={16} color={theme.textSecondary} strokeWidth={2} />
                <Text style={[styles.proximityLabel, { color: theme.textSecondary }]}>
                  {isInRange ? "You're here" : 'Distance'}
                </Text>
              </View>
              <Text style={[styles.proximityValue, { color: isInRange ? '#00C9B1' : theme.primary }]}>
                {distLabel}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: isInRange ? '#00C9B1' : theme.primary,
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['5%', '100%'] }),
                  },
                ]}
              />
            </View>
            {isInRange && (
              <Text style={[styles.proximityReady, { color: '#00C9B1' }]}>
                You're here. Collect it.
              </Text>
            )}
          </View>

          <View style={styles.rewardRow}>
            <XPChip amount={xpEarned} />
            {tier === 'hidden' && (
              <View style={styles.firstBadge}>
                <Text style={styles.firstBadgeText}>Hidden! 🔍</Text>
              </View>
            )}
          </View>

          {isInRange && !checkedIn && (
            <PrimaryAction onPress={handleCheckIn} style={{ width: '100%', marginTop: 8 }}>
              Check In + {xpEarned} XP
            </PrimaryAction>
          )}

          {checkedIn && (
            <Animated.View style={[styles.celebration, { transform: [{ scale: celebrateScale }] }]}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
              <Text style={[styles.celebrationTitle, { color: '#00C9B1' }]}>
                Landmark Collected!
              </Text>
              <Text style={[styles.celebrationSub, { color: theme.textSecondary }]}>
                +{xpEarned} XP earned
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject },
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
    height: '82%',
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  hero: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroText: {
    fontSize: 48,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 4,
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'white',
    opacity: 0.8,
  },
  content: { paddingHorizontal: 22, paddingTop: 8 },
  landmarkName: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  address: { fontSize: 12, marginBottom: 12 },
  description: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  storyTrail: {
    padding: 12,
    borderRadius: 14,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  storyTrailLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  storyTrailName: { fontSize: 14, fontWeight: '600' },
  proximitySection: { marginBottom: 18 },
  proximityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proximityLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proximityLabel: { fontSize: 14, fontWeight: '500' },
  proximityValue: { fontSize: 14, fontWeight: '600' },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 4 },
  proximityReady: { fontSize: 13, fontWeight: '500', marginTop: 8 },
  rewardRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  firstBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: '#FEF3C7',
  },
  firstBadgeText: { fontSize: 11, fontWeight: '600', color: '#D97706' },
  celebration: { alignItems: 'center', paddingVertical: 28 },
  celebrationEmoji: { fontSize: 56, marginBottom: 12 },
  celebrationTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  celebrationSub: { fontSize: 14 },
});
