import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHUD } from '../components/explorify/TopHUD';
import { useTheme } from '../context/ThemeContext';

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
      {/* Grid rings */}
      {Array.from({ length: LEVELS }).map((_, l) => (
        <Polygon key={l} points={polyStr(MAX_R * ((l + 1) / LEVELS))} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
      ))}
      {/* Axis lines */}
      {data.map((_, i) => {
        const p = pt(i, MAX_R);
        return <Line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />;
      })}
      {/* Data polygon */}
      <Polygon points={dataStr} fill={`${primaryColor}33`} stroke={primaryColor} strokeWidth={2} />
      {/* Labels */}
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

const STATS = [
  { label: 'Landmarks', value: '147' },
  { label: 'Quests', value: '23' },
  { label: 'Streak', value: '7' },
  { label: 'Cities', value: '3' },
];

const DNA_CATEGORIES = [
  { label: 'Architecture', value: 90 },
  { label: 'History', value: 85 },
  { label: 'Hidden Gems', value: 75 },
  { label: 'Art', value: 70 },
  { label: 'Food', value: 60 },
  { label: 'Social', value: 50 },
  { label: 'Nature', value: 45 },
  { label: 'Nightlife', value: 30 },
];

const ACHIEVEMENTS = [
  { id: 1, name: 'First Steps', icon: '🎯', unlocked: true },
  { id: 2, name: 'Streak Master', icon: '🔥', unlocked: true },
  { id: 3, name: 'City Explorer', icon: '🌆', unlocked: true },
  { id: 4, name: 'Hidden Hunter', icon: '🔍', unlocked: false },
  { id: 5, name: 'Social Butterfly', icon: '🦋', unlocked: false },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const TOP_OFFSET = insets.top + 80;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <TopHUD level={12} currentXP={2340} maxXP={3000} streak={7} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: TOP_OFFSET, paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
            <View style={[styles.avatarInner, { backgroundColor: theme.surface }]}>
              <Text style={[styles.avatarLetter, { color: theme.primary }]}>E</Text>
            </View>
          </View>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>Urban Explorer · Lv.12</Text>
          <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
            Dublin · Member since Jan 2024
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* DNA Radar Chart */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Exploration DNA</Text>
        <View style={[styles.dnaCard, { backgroundColor: 'white' }]}>
          <RadarChart data={DNA_CATEGORIES} primaryColor={theme.primary} />
        </View>

        {/* Explorer type card */}
        <View style={[styles.explorerCard, { borderColor: 'rgba(245,166,35,0.3)' }]}>
          <Text style={[styles.explorerType, { color: theme.primary }]}>Heritage Seeker</Text>
          <Text style={[styles.explorerDesc, { color: theme.textSecondary }]}>
            You go deep, not wide. History and architecture are your compass.
          </Text>
          <Text style={[styles.explorerSimilarLabel, { color: theme.textSecondary }]}>
            Similar explorers
          </Text>
          <View style={styles.explorerAvatars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.explorerAvatar, { marginLeft: i === 1 ? 0 : -8 }]}>
                <Text style={styles.explorerAvatarText}>{i}</Text>
              </View>
            ))}
            <Text style={[styles.explorerMore, { color: theme.textSecondary }]}>+9 more</Text>
          </View>
        </View>

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Achievements</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementScroll}
        >
          {ACHIEVEMENTS.map((a) => (
            <Pressable
              key={a.id}
              style={[
                styles.achievementBtn,
                {
                  backgroundColor: a.unlocked ? 'white' : 'rgba(0,0,0,0.04)',
                  opacity: a.unlocked ? 1 : 0.45,
                },
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    padding: 3,
    marginBottom: 10,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 32, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  userMeta: { fontSize: 13 },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  dnaCard: {
    borderRadius: 20,
    padding: 8,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  explorerCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(245,166,35,0.04)',
    marginBottom: 24,
  },
  explorerType: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  explorerDesc: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  explorerSimilarLabel: { fontSize: 12, marginBottom: 8 },
  explorerAvatars: { flexDirection: 'row', alignItems: 'center' },
  explorerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5A623',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerAvatarText: { color: 'white', fontSize: 12, fontWeight: '700' },
  explorerMore: { fontSize: 12, marginLeft: 10 },
  achievementScroll: { gap: 12, paddingBottom: 4 },
  achievementBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  achievementIcon: { fontSize: 24 },
  achievementLock: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
