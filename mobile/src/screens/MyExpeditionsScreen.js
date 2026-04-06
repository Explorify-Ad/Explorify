import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, Animated, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Users, Clock, MapPin, Crown,
  LogOut, StopCircle, MessageCircle, RefreshCw,
} from 'lucide-react-native';
import { CATEGORY_COLORS } from '../utils/theme';
import { CATEGORY_ICONS } from '../components/explorify/PinDetailModal';
import {
  fetchMyExpeditions, leaveExpedition, updateExpeditionStatus,
} from '../services/supabase';
import useStore from '../store/useStore';

const CORAL  = '#FF6B6B';
const TABS   = ['Active', 'Past'];

const AVATAR_COLORS = ['#F5A623', '#FF6B6B', '#7C3AED', '#0D9488', '#2563EB', '#DB2777'];
const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const timeAgo = (iso) => {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)  return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

export default function MyExpeditionsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const authUser   = useStore((s) => s.authUser);

  const [tab,          setTab]          = useState('Active');
  const [expeditions,  setExpeditions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  const tabIndicator = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (silent = false) => {
    if (!authUser?.id) return;
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const data = await fetchMyExpeditions(authUser.id);
      setExpeditions(data);
    } catch (e) {
      console.warn('fetchMyExpeditions:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authUser?.id]);

  useEffect(() => { load(); }, [load]);

  const switchTab = (t) => {
    setTab(t);
    Animated.spring(tabIndicator, {
      toValue: t === 'Active' ? 0 : 1,
      damping: 20, stiffness: 220, useNativeDriver: false,
    }).start();
  };

  const filtered = expeditions.filter((e) =>
    tab === 'Active' ? e.status === 'active' : e.status !== 'active',
  );

  const activeCount = expeditions.filter((e) => e.status === 'active').length;

  const handleLeave = (exp) => {
    Alert.alert(
      'Leave Expedition',
      `Leave "${exp.title}"? You won't receive further messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive',
          onPress: async () => {
            try {
              await leaveExpedition(exp.id, authUser.id);
              setExpeditions((prev) => prev.filter((e) => e.id !== exp.id));
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ],
    );
  };

  const handleEnd = (exp) => {
    Alert.alert(
      'End Expedition',
      `End "${exp.title}"? This closes it for all members and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End', style: 'destructive',
          onPress: async () => {
            try {
              await updateExpeditionStatus(exp.id, 'ended');
              setExpeditions((prev) =>
                prev.map((e) => e.id === exp.id ? { ...e, status: 'ended' } : e),
              );
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ],
    );
  };

  const openChat = (exp) => {
    navigation.navigate('ExpeditionChat', {
      expedition: {
        id:          exp.id,
        title:       exp.title,
        created_by:  exp.created_by,
        memberCount: exp.members?.length || 0,
        categories:  exp.categories || [],
        landmark:    exp.landmark_name ? { name: exp.landmark_name } : null,
      },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: '#FFFDF8' }]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <LinearGradient
        colors={['#1A1A2E', '#2d1b69']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color="white" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Expeditions</Text>
          {activeCount > 0 && (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>{activeCount} active</Text>
            </View>
          )}
        </View>

        <Pressable onPress={() => load(true)} style={styles.backBtn} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
            : <RefreshCw size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />}
        </Pressable>
      </LinearGradient>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        {TABS.map((t, i) => {
          const active = tab === t;
          return (
            <Pressable key={t} style={styles.tabBtn} onPress={() => switchTab(t)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
              {active && <View style={styles.tabUnderline} />}
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={CORAL} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>{tab === 'Active' ? '🧭' : '📜'}</Text>
          <Text style={styles.emptyTitle}>
            {tab === 'Active' ? 'No active expeditions' : 'No past expeditions'}
          </Text>
          <Text style={styles.emptySub}>
            {tab === 'Active'
              ? 'Join one from the map or start your own'
              : 'Completed expeditions will appear here'}
          </Text>
          {tab === 'Active' && (
            <Pressable
              style={styles.startBtn}
              onPress={() => { navigation.goBack(); }}
            >
              <Text style={styles.startBtnText}>Go to Map</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        >
          {filtered.map((exp) => (
            <ExpeditionCard
              key={exp.id}
              exp={exp}
              authUserId={authUser?.id}
              onChat={() => openChat(exp)}
              onLeave={() => handleLeave(exp)}
              onEnd={() => handleEnd(exp)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────

function ExpeditionCard({ exp, authUserId, onChat, onLeave, onEnd }) {
  const isCreator = exp.created_by === authUserId;
  const isActive  = exp.status === 'active';
  const cats      = exp.categories || [];
  const primaryCat = cats[0] || 'Architecture';
  const catColor  = CATEGORY_COLORS[primaryCat] || '#64748b';
  const CatIcon   = CATEGORY_ICONS[primaryCat];

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, damping: 15, stiffness: 300 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, damping: 15, stiffness: 300 }).start();

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      {/* Top gradient strip */}
      <LinearGradient
        colors={[catColor, catColor + 'aa', '#1A1A2E']}
        style={styles.cardStrip}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        {/* Watermark icon */}
        {CatIcon && (
          <CatIcon size={72} color="rgba(255,255,255,0.08)" strokeWidth={1} style={styles.stripWatermark} />
        )}

        <View style={styles.stripContent}>
          <View style={styles.stripLeft}>
            {isCreator && (
              <View style={styles.creatorBadge}>
                <Crown size={10} color="#FFD700" strokeWidth={2} />
                <Text style={styles.creatorBadgeText}>Created by you</Text>
              </View>
            )}
            <Text style={styles.cardTitle} numberOfLines={2}>{exp.title}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: isActive ? '#22c55e33' : '#6B728033' }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? '#22c55e' : '#9CA3AF' }]} />
            <Text style={[styles.statusText, { color: isActive ? '#22c55e' : '#9CA3AF' }]}>
              {isActive ? 'Active' : 'Ended'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Category chips */}
        <View style={styles.catChips}>
          {cats.map((cat) => {
            const cc = CATEGORY_COLORS[cat] || '#64748b';
            return (
              <View key={cat} style={[styles.catChip, { backgroundColor: cc + '18', borderColor: cc + '44' }]}>
                <Text style={[styles.catChipText, { color: cc }]}>{cat}</Text>
              </View>
            );
          })}
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {/* Members */}
          <View style={styles.metaItem}>
            <Users size={13} color="#6B7280" strokeWidth={2} />
            <Text style={styles.metaText}>{exp.members?.length || 0} members</Text>
          </View>
          {/* Member avatars */}
          <View style={styles.avatarStack}>
            {(exp.members || []).slice(0, 4).map((m, i) => (
              <View
                key={m.user_id ?? i}
                style={[styles.memberAvatar, { marginLeft: i === 0 ? 0 : -8, backgroundColor: avatarColor(m.user_name) }]}
              >
                <Text style={styles.memberAvatarText}>{m.user_name?.[0] ?? '?'}</Text>
              </View>
            ))}
            {(exp.members?.length || 0) > 4 && (
              <View style={[styles.memberAvatar, { marginLeft: -8, backgroundColor: '#9CA3AF' }]}>
                <Text style={styles.memberAvatarText}>+{exp.members.length - 4}</Text>
              </View>
            )}
          </View>
          {/* Time */}
          <View style={styles.metaItem}>
            <Clock size={13} color="#6B7280" strokeWidth={2} />
            <Text style={styles.metaText}>{timeAgo(exp.created_at)}</Text>
          </View>
        </View>

        {/* Meeting point */}
        {exp.landmark_name ? (
          <View style={styles.meetingRow}>
            <MapPin size={12} color={catColor} strokeWidth={2} />
            <Text style={styles.meetingText} numberOfLines={1}>{exp.landmark_name}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.cardActions}>
          {isActive ? (
            <>
              <Pressable
                style={styles.chatBtn}
                onPressIn={onPressIn} onPressOut={onPressOut}
                onPress={onChat}
              >
                <LinearGradient
                  colors={[CORAL, '#C2185B']}
                  style={styles.chatBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <MessageCircle size={15} color="white" strokeWidth={2} />
                  <Text style={styles.chatBtnText}>Open Chat</Text>
                </LinearGradient>
              </Pressable>

              {isCreator ? (
                <Pressable style={styles.dangerBtn} onPress={onEnd}>
                  <StopCircle size={15} color="#EF4444" strokeWidth={2} />
                  <Text style={styles.dangerBtnText}>End</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.dangerBtn} onPress={onLeave}>
                  <LogOut size={15} color="#EF4444" strokeWidth={2} />
                  <Text style={styles.dangerBtnText}>Leave</Text>
                </Pressable>
              )}
            </>
          ) : (
            <View style={styles.endedRow}>
              <Text style={styles.endedText}>This expedition has ended</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingBottom: 16,
  },
  backBtn: { padding: 12 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '700' },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  activeBadgeText: { color: '#4ade80', fontSize: 11, fontWeight: '600' },

  tabRow: {
    flexDirection: 'row', backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: CORAL },
  tabUnderline: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2.5, backgroundColor: CORAL, borderRadius: 2 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  startBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: CORAL, borderRadius: 100,
  },
  startBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  list: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  // Card
  card: {
    backgroundColor: 'white', borderRadius: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  cardStrip: { height: 100, justifyContent: 'flex-end', overflow: 'hidden' },
  stripWatermark: { position: 'absolute', right: -10, top: -10 },
  stripContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 14 },
  stripLeft: { flex: 1, gap: 4 },
  creatorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.25)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
  },
  creatorBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '700' },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: '800', lineHeight: 20 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardBody: { padding: 14, gap: 12 },

  catChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  catChipText: { fontSize: 11, fontWeight: '600' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  avatarStack: { flexDirection: 'row', flex: 1 },
  memberAvatar: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: 'white', fontSize: 10, fontWeight: '700' },

  meetingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 8,
  },
  meetingText: { fontSize: 12, color: '#6B7280', flex: 1 },

  cardActions: { flexDirection: 'row', gap: 10 },
  chatBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  chatBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 13,
  },
  chatBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  dangerBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  endedRow: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    backgroundColor: '#f9fafb', borderRadius: 14,
  },
  endedText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
});
