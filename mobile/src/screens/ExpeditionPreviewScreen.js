import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Clock } from 'lucide-react-native';
import { LevelBadge, CategoryPill } from '../components/explorify/Badges';
import { useTheme } from '../context/ThemeContext';
import { joinExpedition } from '../services/supabase';
import useStore from '../store/useStore';

const CORAL = '#FF6B6B';
const TEAL  = '#0D9488';
const GOLD  = '#F5A623';

export default function ExpeditionPreviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

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

  const authUser = useStore((s) => s.authUser);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      await joinExpedition(expedition.id, authUser.id, authUser.name ?? 'Explorer');
      navigation.navigate('ExpeditionChat', { expedition });
    } catch (e) {
      console.warn('joinExpedition error:', e.message);
      setJoining(false);
    }
  };

  const sheetY = useRef(new Animated.Value(400)).current;
  useEffect(() => {
    Animated.spring(sheetY, {
      toValue: 0, damping: 30, stiffness: 300, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Blurred map background placeholder */}
      <View style={styles.mapBg} />

      {/* Close */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.closeBtn, { top: insets.top + 8 }]}
      >
        <X size={20} color="#1A1A2E" strokeWidth={2} />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 24,
          transform: [{ translateY: sheetY }] }]}
      >
        <View style={styles.handle} />

        {/* Leader */}
        <View style={styles.leaderRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{expedition.leader.avatar}</Text>
            </View>
            <View style={styles.levelPos}>
              <LevelBadge level={expedition.leader.level} />
            </View>
          </View>
          <View>
            <Text style={[styles.leaderName, { color: theme.textPrimary }]}>
              {expedition.leader.name}
            </Text>
            <Text style={[styles.leaderType, { color: theme.textSecondary }]}>
              {expedition.leader.type}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.textPrimary }]}>{expedition.title}</Text>

        {/* Category pills */}
        <View style={styles.pillRow}>
          {expedition.categories.map((c) => (
            <CategoryPill key={c} category={c} color="#64748b" />
          ))}
        </View>

        {/* DNA match */}
        <View style={styles.dnaPill}>
          <View style={styles.dnaDot} />
          <Text style={styles.dnaText}>{expedition.dnaMatch}% match for you</Text>
        </View>

        {/* Members */}
        <View style={styles.membersRow}>
          <View style={styles.avatarStack}>
            {expedition.members.map((m, i) => (
              <View key={i} style={[styles.memberAvatar, { marginLeft: i === 0 ? 0 : -8 }]}>
                <Text style={styles.memberAvatarText}>{m}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.spotsLeft, { color: CORAL }]}>+{expedition.spotsLeft} spots left</Text>
        </View>

        {/* Meeting info */}
        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <MapPin size={14} color={theme.textSecondary} strokeWidth={2} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              {expedition.meetingPoint}
            </Text>
          </View>
          <View style={styles.infoPill}>
            <Clock size={14} color={theme.textSecondary} strokeWidth={2} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Starts in {expedition.startsIn}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.joinBtn, { opacity: joining ? 0.6 : 1 }]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining
              ? <ActivityIndicator color="white" />
              : <Text style={styles.joinText}>Join Expedition</Text>}
          </Pressable>
          <Pressable
            style={styles.peekBtn}
            onPress={() => navigation.navigate('ExpeditionChat', { expedition })}
          >
            <Text style={[styles.peekText, { color: CORAL }]}>Peek Inside</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5EDD5',
  },
  closeBtn: {
    position: 'absolute', right: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarWrap: { position: 'relative', width: 44, height: 44 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F5A623',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: 'white', fontWeight: '700', fontSize: 16 },
  levelPos: { position: 'absolute', bottom: -4, right: -8 },
  leaderName: { fontSize: 15, fontWeight: '600' },
  leaderType: { fontSize: 12, marginTop: 1 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dnaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,166,35,0.15)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, alignSelf: 'flex-start', marginBottom: 12,
  },
  dnaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F5A623' },
  dnaText: { fontSize: 13, fontWeight: '600', color: '#F5A623' },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarStack: { flexDirection: 'row' },
  memberAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5A623', borderWidth: 2, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: 'white', fontSize: 11, fontWeight: '700' },
  spotsLeft: { fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  infoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100,
  },
  infoText: { fontSize: 12, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 12 },
  joinBtn: {
    flex: 1, height: 52, borderRadius: 26,
    backgroundColor: '#FF6B6B',
    alignItems: 'center', justifyContent: 'center',
  },
  joinText: { color: 'white', fontWeight: '700', fontSize: 15 },
  peekBtn: {
    height: 52, paddingHorizontal: 20, borderRadius: 26,
    borderWidth: 2, borderColor: '#FF6B6B',
    alignItems: 'center', justifyContent: 'center',
  },
  peekText: { fontWeight: '600', fontSize: 15 },
});
