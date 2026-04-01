import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
  Alert
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
import FeedbackModal from '../components/FeedbackModal';

const CHECK_IN_RANGE = 100; // metres

export default function LandmarkDetailScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();

  const landmark = params?.landmark || null;
  const checkInStore = useStore((s) => s.checkIn);

  const [distance, setDistance] = useState(null);
  const [isInRange, setIsInRange] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [xpEarned, setXpEarned] = useState(150);

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

  const handleCheckIn = () => {
    setShowFeedback(true);
  };

  const submitFeedback = async (feedback) => {
    setShowFeedback(false);
    const { xp, outcomes } = await checkInStore(landmark, feedback);
    setXpEarned(xp || 150);
    setCheckedIn(true);
    Animated.spring(celebrateScale, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true }).start();
    
    if (outcomes?.some(o => o.type === 'QUEST_COMPLETED')) {
      Alert.alert('Quest Milestone!', 'You explored enough themes to unlock a new Hidden Spot! Check your Quests tab.');
    }

    setTimeout(() => navigation.goBack(), 2200);
  };

  const categoryColor = landmark?.category ? CATEGORY_COLORS[landmark.category] : theme.primary;
  const name = landmark?.name || 'Historic Landmark';
  const category = landmark?.category || 'Architecture';
  const tier = landmark?.tier || 'public';
  const address = landmark?.address || '';

  const distLabel = distance == null ? 'Locating…' : distance < 1000 ? `${distance}m away` : `${(distance / 1000).toFixed(1)}km away`;

  return (
    <View style={styles.container}>
      <View style={[styles.bg, { backgroundColor: '#C8ECE8', opacity: 0.5 }]} />

      <Pressable onPress={() => navigation.goBack()} style={[styles.closeBtn, { top: insets.top + 8 }]}>
        <X size={20} color="#1A1A2E" strokeWidth={2} />
      </Pressable>

      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }]}>
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

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Discover the story behind this <Text style={{ fontWeight: '600' }}>{category.toLowerCase()}</Text> landmark.
          </Text>

          {/* Adaptive Reasons */}
          {landmark.reasons && landmark.reasons.length > 0 && (
            <View style={styles.reasonsContainer}>
              <Text style={styles.reasonsTitle}>Why this match?</Text>
              <View style={styles.reasonsRow}>
                {landmark.reasons.map((r, i) => (
                  <View key={i} style={styles.reasonBadge}>
                    <Text style={styles.reasonText}>✨ {r}</Text>
                  </View>
                ))}
                {landmark.score && (
                  <View style={[styles.scoreBadge, { backgroundColor: `${theme.primary}15` }]}>
                    <Text style={[styles.scoreText, { color: theme.primary }]}>{landmark.score}% Match</Text>
                  </View>
                )}
              </View>
            </View>
          )}


          <View style={styles.proximitySection}>
            <View style={styles.proximityRow}>
              <View style={styles.proximityLeft}>
                <MapPin size={16} color={theme.textSecondary} strokeWidth={2} />
                <Text style={[styles.proximityLabel, { color: theme.textSecondary }]}>{isInRange ? "You're here" : 'Distance'}</Text>
              </View>
              <Text style={[styles.proximityValue, { color: isInRange ? '#00C9B1' : theme.primary }]}>{distLabel}</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { backgroundColor: isInRange ? '#00C9B1' : theme.primary, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['5%', '100%'] }) }]} />
            </View>
          </View>

          <View style={styles.rewardRow}>
            <XPChip amount={xpEarned} />
          </View>

          {isInRange && !checkedIn && (
            <PrimaryAction onPress={handleCheckIn} style={{ width: '100%', marginTop: 8 }}>
              Check In + {xpEarned} XP
            </PrimaryAction>
          )}

          {checkedIn && (
            <Animated.View style={[styles.celebration, { transform: [{ scale: celebrateScale }] }]}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
              <Text style={[styles.celebrationTitle, { color: '#00C9B1' }]}>Landmark Collected!</Text>
              <Text style={[styles.celebrationSub, { color: theme.textSecondary }]}>+{xpEarned} XP earned</Text>
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>

      <FeedbackModal 
        visible={showFeedback} 
        landmark={landmark} 
        onValue={submitFeedback} 
        onCancel={() => submitFeedback({})} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { ...StyleSheet.absoluteFillObject },
  closeBtn: { position: 'absolute', right: 16, zIndex: 60, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '82%', backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', elevation: 20 },
  hero: { height: 190, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroText: { fontSize: 48, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 4 },
  heroFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'white', opacity: 0.8 },
  content: { paddingHorizontal: 22, paddingTop: 8 },
  landmarkName: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  proximitySection: { marginBottom: 18 },
  proximityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  proximityLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proximityLabel: { fontSize: 14, fontWeight: '500' },
  proximityValue: { fontSize: 14, fontWeight: '600' },
  progressTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 4 },
  rewardRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  celebration: { alignItems: 'center', paddingVertical: 28 },
  celebrationEmoji: { fontSize: 56, marginBottom: 12 },
  celebrationTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  celebrationSub: { fontSize: 14 },

  reasonsContainer: {
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reasonsTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreText: { fontSize: 12, fontWeight: '700' },
});

