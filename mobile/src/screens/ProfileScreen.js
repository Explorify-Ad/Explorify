import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TopHUD } from '../components/explorify/TopHUD';
import { useTheme } from '../context/ThemeContext';
import useStore from '../store/useStore';

const CHART_SIZE = 300;
const CX = CHART_SIZE / 2;
const CY = CHART_SIZE / 2;
const MAX_R = CHART_SIZE * 0.3;
const LEVELS = 5;

function RadarChart({ data, primaryColor }) {
  const n = data.length;
  const angle = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (i, r) => ({
    x: CX + r * Math.cos(angle(i)),
    y: CY + r * Math.sin(angle(i)),
  });
  const polyStr = (r) => data.map((_, i) => { const p = pt(i, r); return `${p.x},${p.y}`; }).join(' ');
  const dataStr = data.map((d, i) => { const p = pt(i, MAX_R * (d.value / 100)); return `${p.x},${p.y}`; }).join(' ');

  return (
    <Svg width={CHART_SIZE} height={CHART_SIZE}>
      {Array.from({ length: LEVELS }).map((_, l) => (
        <Polygon key={l} points={polyStr(MAX_R * ((l + 1) / LEVELS))} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
      ))}
      {data.map((_, i) => {
        const p = pt(i, MAX_R);
        return <Line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />;
      })}
      <Polygon points={dataStr} fill={`${primaryColor}33`} stroke={primaryColor} strokeWidth={2} />
      {data.map((d, i) => {
        const p = pt(i, MAX_R + 28);
        return (
          <SvgText key={i} x={p.x} y={p.y} textAnchor="middle" fontSize={11} fill="#9CA3AF">
            {d.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// Achievements derived from actual progress
function buildAchievements(collection, streak) {
  return [
    { id: 1, name: 'First Steps',    icon: '🎯', unlocked: collection.length >= 1 },
    { id: 2, name: 'Streak 3',       icon: '🔥', unlocked: streak >= 3 },
    { id: 3, name: 'Explorer',       icon: '🌆', unlocked: collection.length >= 5 },
    { id: 4, name: 'Hidden Hunter',  icon: '🔍', unlocked: collection.some((c) => c.tier === 'hidden') },
    { id: 5, name: 'Quest Finisher', icon: '🏆', unlocked: collection.length >= 10 },
    { id: 6, name: 'Veteran',        icon: '🎖️', unlocked: collection.length >= 25 },
  ];
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const userName       = useStore((s) => s.userName);
  const getLevel       = useStore((s) => s.getLevel);
  const getStreak      = useStore((s) => s.getStreak);
  const getStats       = useStore((s) => s.getStats);
  const getDNAStats    = useStore((s) => s.getDNAStats);
  const getExplorerType = useStore((s) => s.getExplorerType);
  const collection     = useStore((s) => s.collection);

  const signOut      = useStore((s) => s.signOut);
  const authUser     = useStore((s) => s.authUser);
  const navigation   = useNavigation();

  const level        = getLevel();
  const streak       = getStreak();
  const stats        = getStats();
  const dna          = getDNAStats();
  const explorerType = getExplorerType();
  const achievements = buildAchievements(collection, streak);

  const [visitorType, setVisitorType] = useState('tourist');

  const visitorTypes = [
    { id: 'tourist', label: '✈️ Tourist', desc: 'Prioritizes iconic landmarks.' },
    { id: 'local', label: '🏠 Local', desc: 'Surfaces hidden gems and off-beat spots.' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigation.navigate('Login');
  };

  const avatar     = (userName || 'E')[0].toUpperCase();
  const statsGrid  = [
    { label: 'Landmarks', value: String(stats.landmarks) },
    { label: 'Quests',    value: String(stats.quests) },
    { label: 'Streak',    value: String(streak) },
    { label: 'Cities',    value: String(stats.cities) },
  ];

  const TOP_OFFSET = insets.top + 80;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <TopHUD />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: TOP_OFFSET, paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
            <View style={[styles.avatarInner, { backgroundColor: theme.surface }]}>
              <Text style={[styles.avatarLetter, { color: theme.primary }]}>{avatar}</Text>
            </View>
          </View>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>
            {explorerType.type} · Lv.{level}
          </Text>
          <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
            {authUser?.email || userName} · Dublin
          </Text>
        </View>

        {/* Visitor Type Selection (Adaptive) */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 20 }]}>Persona</Text>
        <View style={styles.visitorTypeContainer}>
          {visitorTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.visitorOption,
                visitorType === type.id && { borderColor: theme.primary, backgroundColor: `${theme.primary}10` }
              ]}
              onPress={() => setVisitorType(type.id)}
            >
              <Text style={[styles.visitorLabel, visitorType === type.id && { color: theme.primary }]}>
                {type.label}
              </Text>
              <Text style={styles.visitorDesc}>{type.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {statsGrid.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* DNA Radar Chart */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Exploration DNA</Text>
        <View style={[styles.dnaCard, { backgroundColor: 'white' }]}>
          <RadarChart data={dna} primaryColor={theme.primary} />
        </View>

        {/* Explorer type */}
        <View style={[styles.explorerCard, { borderColor: 'rgba(245,166,35,0.3)' }]}>
          <Text style={[styles.explorerType, { color: theme.primary }]}>{explorerType.type}</Text>
          <Text style={[styles.explorerDesc, { color: theme.textSecondary }]}>
            {explorerType.desc}
          </Text>
        </View>

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Achievements</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementScroll}
        >
          {achievements.map((a) => (
            <Pressable
              key={a.id}
              style={[
                styles.achievementBtn,
                { backgroundColor: a.unlocked ? 'white' : 'rgba(0,0,0,0.04)', opacity: a.unlocked ? 1 : 0.4 },
              ]}
            >
              <Text style={styles.achievementIcon}>{a.icon}</Text>
              {!a.unlocked && (
                <View style={styles.achievementLock}>
                  <Text style={{ fontSize: 10 }}>🔒</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
        {/* Sign out */}
        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 2.5, padding: 3, marginBottom: 10 },
  avatarInner: { flex: 1, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 32, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  userMeta: { fontSize: 13 },
  visitorTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  visitorOption: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  visitorLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    color: '#374151',
  },
  visitorDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
  },
  statsGrid: {
    flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  dnaCard: {
    borderRadius: 20, padding: 8, marginBottom: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  explorerCard: {
    padding: 20, borderRadius: 20, borderWidth: 1,
    backgroundColor: 'rgba(245,166,35,0.04)', marginBottom: 24,
  },
  explorerType: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  explorerDesc: { fontSize: 14, lineHeight: 20 },
  achievementScroll: { gap: 12, paddingBottom: 4 },
  achievementBtn: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  achievementIcon: { fontSize: 24 },
  achievementLock: {
    position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  signOutBtn: {
    marginTop: 24,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
