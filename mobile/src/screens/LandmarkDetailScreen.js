import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { X, MapPin, Navigation, Lock, Zap, Star } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { haversineDistance } from '../services/location';
import { CATEGORY_COLORS } from '../utils/theme';
import { CATEGORY_ICONS } from '../components/explorify/PinDetailModal';
import useStore from '../store/useStore';
import FeedbackModal from '../components/FeedbackModal';

const { width: W, height: H } = Dimensions.get('window');
const CHECK_IN_RANGE = 100;
const HERO_H = 280;

const TIER_META = {
  public:     { label: 'Public',     color: '#9CA3AF', xp: 150 },
  discovered: { label: 'Discovered', color: '#FFD700', xp: 320 },
  hidden:     { label: 'Hidden',     color: '#C084FC', xp: 600 },
};

export default function LandmarkDetailScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();

  const landmark = params?.landmark || null;
  const checkInStore = useStore((s) => s.checkIn);

  const tier    = landmark?.tier    || 'public';
  const category = landmark?.category || 'Architecture';
  const name    = landmark?.name    || 'Historic Landmark';
  const address = landmark?.address || '';
  const description = landmark?.description || '';
  const catColor = CATEGORY_COLORS[category] || '#64748b';
  const tierMeta = TIER_META[tier] || TIER_META.public;
  const CatIcon  = CATEGORY_ICONS[category];

  const [distance,  setDistance]  = useState(null);
  const [isInRange, setIsInRange] = useState(false);
  const [checkedIn, setCheckedIn] = useState(landmark?.collected || false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [xpEarned,  setXpEarned]  = useState(tierMeta.xp);
  const [arriveTime, setArriveTime] = useState(null);

  // Animations
  const sheetY       = useRef(new Animated.Value(H)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebScale   = useRef(new Animated.Value(0)).current;
  const btnPulse     = useRef(new Animated.Value(1)).current;
  const ringScale    = useRef(new Animated.Value(1)).current;
  const ringOpacity  = useRef(new Animated.Value(0.6)).current;
  const heroOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMode('discovery');
    Animated.sequence([
      Animated.timing(heroOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
    ]).start();

    let sub;
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (pos) => {
          if (!landmark?.lat && !landmark?.latitude) return;
          const lLat = landmark.lat ?? landmark.latitude;
          const lLon = landmark.lon ?? landmark.longitude;
          const d = haversineDistance(
            pos.coords.latitude, pos.coords.longitude,
            lLat, lLon,
          );
          setDistance(d);
          const inRange = d <= CHECK_IN_RANGE;
          setIsInRange(inRange);
          if (inRange && !arriveTime) {
            setArriveTime(Date.now());
          }
          const pct = Math.min(1, Math.max(0, 1 - (d - CHECK_IN_RANGE) / 900));
          Animated.timing(progressAnim, {
            toValue: inRange ? 1 : pct,
            duration: 400,
            useNativeDriver: false,
          }).start();
        },
      );
    };
    startTracking();
    return () => { sub?.remove(); setMode('exploration'); };
  }, []);

  useEffect(() => {
    if (isInRange && !checkedIn) {
      const ringAnim = Animated.loop(
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 2.6, duration: 1300, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0,   duration: 1300, useNativeDriver: true }),
        ]),
      );
      ringAnim.start();
      const pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(btnPulse, { toValue: 1.03, duration: 750, useNativeDriver: true }),
          Animated.timing(btnPulse, { toValue: 1,    duration: 750, useNativeDriver: true }),
        ]),
      );
      pulseAnim.start();
      return () => { ringAnim.stop(); pulseAnim.stop(); };
    }
  }, [isInRange, checkedIn]);

  const handleCheckIn = () => {
    setShowFeedback(true);
  };

  const submitFeedback = async (feedback) => {
    setShowFeedback(false);
    const dwellTime = arriveTime ? Math.round((Date.now() - arriveTime) / 60000) : 0;
    const { xp, outcomes, error } = await checkInStore(landmark, { ...feedback, dwellTime });
    if (error) {
      Alert.alert('Check-in Error', error);
      return;
    }
    setXpEarned(xp || tierMeta.xp);
    setCheckedIn(true);
    Animated.spring(celebScale, { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: true }).start();
    
    if (outcomes?.some(o => o.type === 'QUEST_COMPLETED')) {
      Alert.alert('Quest Milestone!', 'You explored enough themes to unlock a new Hidden Spot! Check your Quests tab.');
    }
    
    setTimeout(() => navigation.goBack(), 2600);
  };

  const distLabel = distance == null
    ? 'Locating…'
    : distance < 1000
    ? `${Math.round(distance)} m`
    : `${(distance / 1000).toFixed(1)} km`;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.heroWrap, { opacity: heroOpacity }]}>
        <LinearGradient
          colors={[catColor, catColor + 'cc', '#0f0f1a']}
          style={styles.hero}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        >
          {CatIcon && (
            <CatIcon
              size={140}
              color="rgba(255,255,255,0.08)"
              strokeWidth={1}
              style={styles.heroIconBg}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15,15,26,0.7)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[styles.heroBottom, { paddingBottom: 28 }]}>
            <View style={styles.heroChips}>
              <View style={[styles.tierChip, { backgroundColor: tierMeta.color + '33', borderColor: tierMeta.color + '99' }]}>
                <Star size={10} color={tierMeta.color} strokeWidth={2.5} />
                <Text style={[styles.tierChipText, { color: tierMeta.color }]}>{tierMeta.label}</Text>
              </View>
              <View style={styles.xpChip}>
                <Zap size={10} color="#FFD700" strokeWidth={2.5} />
                <Text style={styles.xpChipText}>+{xpEarned} XP</Text>
              </View>
            </View>
            <Text style={styles.heroName} numberOfLines={2}>{name}</Text>
            {address ? (
              <View style={styles.heroAddress}>
                <MapPin size={12} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                <Text style={styles.heroAddressText} numberOfLines={1}>{address}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </Animated.View>

      <Pressable onPress={() => navigation.goBack()} style={[styles.closeBtn, { top: insets.top + 10 }]}>
        <X size={18} color="#1A1A2E" strokeWidth={2.5} />
      </Pressable>

      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: sheetY }] }]}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.categoryRow}>
            <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
              {CatIcon && <CatIcon size={13} color={catColor} strokeWidth={2} />}
              <Text style={[styles.catBadgeText, { color: catColor }]}>{category}</Text>
            </View>
            {tier === 'hidden' && (
              <View style={styles.hiddenBadge}>
                <Text style={styles.hiddenBadgeText}>🔍 Hidden gem</Text>
              </View>
            )}
          </View>

          <Text style={styles.desc}>{description || `Discover the story behind this ${category.toLowerCase()} landmark. Check in when you arrive to earn XP and unlock its full history.`}</Text>

          <View style={[styles.proxCard, isInRange && { borderColor: '#22c55e' + '55' }]}>
            {isInRange ? (
              <View style={styles.inRangeWrap}>
                <View style={styles.ringContainer}>
                  <Animated.View style={[styles.ringPulse, { backgroundColor: '#22c55e' + '20', transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
                  <View style={[styles.ringDot, { backgroundColor: '#22c55e' }]}>
                    <MapPin size={20} color="white" strokeWidth={2} />
                  </View>
                </View>
                <View style={styles.inRangeText}>
                  <Text style={styles.inRangeTitle}>You're here!</Text>
                  <Text style={styles.inRangeSub}>Ready to check in and collect</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.proxHeader}>
                  <View style={styles.proxLeft}>
                    <Navigation size={14} color="#6B7280" strokeWidth={2} />
                    <Text style={styles.proxHeaderText}>Distance</Text>
                  </View>
                  <Text style={[styles.proxDist, { color: catColor }]}>{distLabel}</Text>
                </View>
                <View style={styles.proxTrack}>
                  <Animated.View style={[styles.proxFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] }) }]}>
                    <LinearGradient colors={[catColor + '80', catColor]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  </Animated.View>
                </View>
                <Text style={styles.proxHint}>Walk to within 100 m to check in</Text>
              </>
            )}
          </View>

          {checkedIn ? (
            <Animated.View style={[styles.celebration, { transform: [{ scale: celebScale }] }]}>
              <Text style={styles.celebEmoji}>🏅</Text>
              <Text style={styles.celebTitle}>Landmark Collected!</Text>
              <Text style={styles.celebSub}>+{xpEarned} XP added to your profile</Text>
            </Animated.View>
          ) : isInRange ? (
            <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
              <Pressable onPress={handleCheckIn} style={styles.checkinBtn}>
                <LinearGradient colors={[catColor, catColor + 'cc']} style={styles.checkinGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Zap size={20} color="white" strokeWidth={2} />
                  <Text style={styles.checkinText}>Check In · +{xpEarned} XP</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.lockedBtn}>
              <Lock size={15} color="#9CA3AF" strokeWidth={2} />
              <Text style={styles.lockedText}>{distance == null ? 'Finding your location…' : `${distLabel} away — keep walking`}</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <FeedbackModal visible={showFeedback} landmark={landmark} onValue={submitFeedback} onCancel={() => submitFeedback({})} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f1a' },
  heroWrap: { height: HERO_H },
  hero: { flex: 1, justifyContent: 'flex-end' },
  heroIconBg: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -70 },
  heroBottom: { paddingHorizontal: 20, gap: 8 },
  heroChips: { flexDirection: 'row', gap: 8 },
  tierChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  tierChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  xpChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)' },
  xpChipText: { fontSize: 11, fontWeight: '700', color: '#FFD700', letterSpacing: 0.3 },
  heroName: { color: 'white', fontSize: 26, fontWeight: '800', lineHeight: 32, letterSpacing: -0.3 },
  heroAddress: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroAddressText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  closeBtn: { position: 'absolute', right: 16, zIndex: 60, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: H - HERO_H + 44, backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  catBadgeText: { fontSize: 12, fontWeight: '700' },
  hiddenBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, backgroundColor: '#FEF3C7' },
  hiddenBadgeText: { fontSize: 11, fontWeight: '600', color: '#D97706' },
  desc: { fontSize: 14, lineHeight: 22, color: '#4B5563' },
  proxCard: { backgroundColor: '#f9fafb', borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.06)' },
  proxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  proxLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proxHeaderText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  proxDist: { fontSize: 22, fontWeight: '800' },
  proxTrack: { height: 10, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  proxFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 5, overflow: 'hidden' },
  proxHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  inRangeWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringContainer: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  ringPulse: { position: 'absolute', width: 64, height: 64, borderRadius: 32 },
  ringDot: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  inRangeText: { flex: 1 },
  inRangeTitle: { fontSize: 18, fontWeight: '800', color: '#15803d', marginBottom: 3 },
  inRangeSub: { fontSize: 13, color: '#6B7280' },
  lockedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18, backgroundColor: '#f3f4f6' },
  lockedText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  checkinBtn: { borderRadius: 18, overflow: 'hidden' },
  checkinGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  checkinText: { color: 'white', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  celebration: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#f0fdf4', borderRadius: 20 },
  celebEmoji: { fontSize: 60, marginBottom: 14 },
  celebTitle: { fontSize: 22, fontWeight: '800', color: '#15803d', marginBottom: 4 },
  celebSub: { fontSize: 14, color: '#4B5563' },
});
