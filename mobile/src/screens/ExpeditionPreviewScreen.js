import React, { useRef, useEffect, useState } from 'react';
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
import { X, MapPin, Clock, Users, Zap, ChevronRight, Check } from 'lucide-react-native';
import { LevelBadge } from '../components/explorify/Badges';
import { CATEGORY_COLORS } from '../utils/theme';
import { CATEGORY_ICONS } from '../components/explorify/PinDetailModal';
import { joinExpedition, fetchExpeditionMembers } from '../services/supabase';
import useStore from '../store/useStore';

const { height: H } = Dimensions.get('window');
const CORAL  = '#FF6B6B';
const HERO_H = 260;

// Simple deterministic colour per initial letter
const AVATAR_COLORS = ['#F5A623', '#FF6B6B', '#7C3AED', '#0D9488', '#2563EB', '#DB2777'];
const avatarColor = (letter) => AVATAR_COLORS[(letter?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function ExpeditionPreviewScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();

  const expedition = route.params?.expedition ?? {
    id: '1',
    title: 'Art Nouveau Morning Walk',
    leader: { name: 'Alex Chen', type: 'Heritage Seeker', level: 18, avatar: 'A' },
    categories: ['Architecture', 'History'],
    dnaMatch: 94,
    members: ['A', 'B', 'C'],
    spotsLeft: 2,
    meetingPoint: 'Central Plaza',
    startsIn: '14 min',
  };

  const authUser   = useStore((s) => s.authUser);
  const [joining,  setJoining]  = useState(false);
  const [isMember, setIsMember] = useState(
    // Quick check from the memberIds passed by MapScreen (avoids a round-trip on mount)
    () => (expedition.memberIds ?? []).includes(authUser?.id),
  );
  const isCreator = expedition.created_by === authUser?.id;

  // Confirm membership from DB on mount (in case params are stale)
  useEffect(() => {
    if (!expedition.id || !authUser?.id) return;
    fetchExpeditionMembers(expedition.id)
      .then((members) => setIsMember(members.some((m) => m.user_id === authUser.id)))
      .catch(() => {});
  }, [expedition.id, authUser?.id]);

  // Animations
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const sheetY      = useRef(new Animated.Value(H)).current;
  const liveOpacity = useRef(new Animated.Value(1)).current;
  const matchWidth  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
    ]).start(() => {
      // Animate DNA bar after sheet arrives
      Animated.spring(matchWidth, {
        toValue: expedition.dnaMatch / 100,
        damping: 18, stiffness: 140, useNativeDriver: false,
      }).start();
    });

    // LIVE badge blink
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveOpacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(liveOpacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      await joinExpedition(expedition.id, authUser.id, authUser.name ?? 'Explorer');
      setIsMember(true);
      navigation.navigate('ExpeditionChat', { expedition });
    } catch (e) {
      console.warn('joinExpedition error:', e.message);
      setJoining(false);
    }
  };

  const openChat = () => navigation.navigate('ExpeditionChat', { expedition });

  // Match colour by DNA percentage
  const matchColor = expedition.dnaMatch >= 85
    ? '#22c55e'
    : expedition.dnaMatch >= 60
    ? '#F5A623'
    : '#EF4444';

  const memberColors = expedition.members.map((m) => avatarColor(m));

  return (
    <View style={styles.root}>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <Animated.View style={[styles.heroWrap, { opacity: heroOpacity }]}>
        <LinearGradient
          colors={['#FF6B6B', '#C2185B', '#1A1A2E']}
          style={styles.hero}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        >
          {/* Decorative category icons watermark */}
          {expedition.categories.slice(0, 2).map((cat, i) => {
            const Icon = CATEGORY_ICONS[cat];
            return Icon ? (
              <Icon
                key={cat}
                size={110}
                color="rgba(255,255,255,0.05)"
                strokeWidth={1}
                style={{ position: 'absolute', right: i * 60 - 20, top: 20 + i * 20 }}
              />
            ) : null;
          })}

          {/* Vignette */}
          <LinearGradient
            colors={['transparent', 'rgba(26,26,46,0.75)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.35 }}
            end={{ x: 0, y: 1 }}
          />

          {/* LIVE + category pills */}
          <View style={styles.heroTopRow}>
            <Animated.View style={[styles.liveBadge, { opacity: liveOpacity }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </Animated.View>
            <View style={styles.heroCats}>
              {expedition.categories.map((cat) => {
                const color = CATEGORY_COLORS[cat] || '#64748b';
                return (
                  <View key={cat} style={[styles.heroCatChip, { backgroundColor: color + '33', borderColor: color + '66' }]}>
                    <Text style={[styles.heroCatText, { color: 'rgba(255,255,255,0.9)' }]}>{cat}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Title + members */}
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle} numberOfLines={2}>{expedition.title}</Text>
            <View style={styles.heroMembersRow}>
              {/* Avatar stack */}
              <View style={styles.avatarStack}>
                {expedition.members.slice(0, 5).map((m, i) => (
                  <View
                    key={i}
                    style={[styles.heroAvatar, { marginLeft: i === 0 ? 0 : -10, backgroundColor: memberColors[i] }]}
                  >
                    <Text style={styles.heroAvatarText}>{m}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.spotsChip}>
                <Users size={11} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                <Text style={styles.spotsText}>
                  {expedition.spotsLeft} spot{expedition.spotsLeft !== 1 ? 's' : ''} left
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Close */}
      <Pressable onPress={() => navigation.goBack()} style={[styles.closeBtn, { top: insets.top + 10 }]}>
        <X size={18} color="#1A1A2E" strokeWidth={2.5} />
      </Pressable>

      {/* ── Sheet ─────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }]}
      >
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* DNA match */}
          <View style={styles.matchCard}>
            <View style={styles.matchHeader}>
              <View>
                <Text style={styles.matchLabel}>Explorer Match</Text>
                <Text style={[styles.matchPct, { color: matchColor }]}>{expedition.dnaMatch}%</Text>
              </View>
              <View style={[styles.matchBadge, { backgroundColor: matchColor + '18' }]}>
                <Zap size={14} color={matchColor} strokeWidth={2} />
                <Text style={[styles.matchBadgeText, { color: matchColor }]}>
                  {expedition.dnaMatch >= 85 ? 'Great fit' : expedition.dnaMatch >= 60 ? 'Good fit' : 'Fair fit'}
                </Text>
              </View>
            </View>
            <View style={styles.matchTrack}>
              <Animated.View
                style={[
                  styles.matchFill,
                  { width: matchWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              >
                <LinearGradient
                  colors={[matchColor + 'aa', matchColor]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
          </View>

          {/* Leader */}
          <View style={styles.leaderCard}>
            <LinearGradient
              colors={[avatarColor(expedition.leader.avatar), avatarColor(expedition.leader.avatar) + 'bb']}
              style={styles.leaderAvatar}
              start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
            >
              <Text style={styles.leaderAvatarText}>{expedition.leader.avatar}</Text>
            </LinearGradient>
            <View style={styles.leaderInfo}>
              <Text style={styles.leaderName}>{expedition.leader.name}</Text>
              <Text style={styles.leaderType}>{expedition.leader.type}</Text>
            </View>
            <LevelBadge level={expedition.leader.level} />
          </View>

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <MapPin size={16} color={CORAL} strokeWidth={2} />
              <Text style={styles.infoLabel}>Meeting point</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{expedition.meetingPoint || 'TBD'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Clock size={16} color={CORAL} strokeWidth={2} />
              <Text style={styles.infoLabel}>Starts in</Text>
              <Text style={styles.infoValue}>{expedition.startsIn || 'Now'}</Text>
            </View>
          </View>

        </ScrollView>

        {/* Action buttons — fixed at bottom */}
        <View style={[styles.actions, { paddingHorizontal: 20 }]}>
          {isMember ? (
            /* Already a member — open chat directly */
            <Pressable style={styles.joinBtn} onPress={openChat}>
              <LinearGradient
                colors={['#22c55e', '#15803d']}
                style={styles.joinGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Check size={18} color="white" strokeWidth={2.5} />
                <Text style={styles.joinText}>
                  {isCreator ? 'Open Your Expedition' : 'Continue Expedition'}
                </Text>
              </LinearGradient>
            </Pressable>
          ) : (
            /* Not yet a member */
            <>
              <Pressable
                style={[styles.joinBtn, joining && { opacity: 0.7 }]}
                onPress={handleJoin}
                disabled={joining}
              >
                <LinearGradient
                  colors={[CORAL, '#C2185B']}
                  style={styles.joinGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {joining ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.joinText}>Join Expedition</Text>
                      <ChevronRight size={18} color="white" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.peekBtn} onPress={openChat}>
                <Text style={styles.peekText}>Peek Inside</Text>
              </Pressable>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f1a' },

  // Hero
  heroWrap: { height: HERO_H },
  hero: { flex: 1, justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 100,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  liveText: { color: 'white', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroCats: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  heroCatChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1,
  },
  heroCatText: { fontSize: 11, fontWeight: '600' },
  heroBottom: { gap: 10 },
  heroTitle: { color: 'white', fontSize: 24, fontWeight: '800', lineHeight: 30, letterSpacing: -0.3 },
  heroMembersRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarStack: { flexDirection: 'row' },
  heroAvatar: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { color: 'white', fontSize: 12, fontWeight: '700' },
  spotsChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
  },
  spotsText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '600' },

  // Close
  closeBtn: {
    position: 'absolute', right: 16, zIndex: 60,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },

  // Sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: H - HERO_H + 44,
    backgroundColor: 'white',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 24,
  },
  handle: {
    width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 14 },

  // DNA match card
  matchCard: {
    backgroundColor: '#f9fafb', borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.06)',
  },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  matchLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 2 },
  matchPct: { fontSize: 36, fontWeight: '900', lineHeight: 38 },
  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100,
  },
  matchBadgeText: { fontSize: 13, fontWeight: '700' },
  matchTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' },
  matchFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 4, overflow: 'hidden' },

  // Leader card
  leaderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f9fafb', borderRadius: 18, padding: 14,
  },
  leaderAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  leaderAvatarText: { color: 'white', fontWeight: '800', fontSize: 18 },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  leaderType: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Info grid
  infoGrid: { flexDirection: 'row', gap: 10 },
  infoCard: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, gap: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5, marginTop: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },

  // Actions
  actions: { paddingTop: 12, paddingBottom: 4, gap: 10 },
  joinBtn: { borderRadius: 18, overflow: 'hidden' },
  joinGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 18,
  },
  joinText: { color: 'white', fontSize: 16, fontWeight: '800' },
  peekBtn: {
    paddingVertical: 14, borderRadius: 18,
    borderWidth: 2, borderColor: CORAL,
    alignItems: 'center',
  },
  peekText: { color: CORAL, fontSize: 15, fontWeight: '700' },
});
