import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TopHUD } from '../components/explorify/TopHUD';
import { useTheme } from '../context/ThemeContext';
import useStore from '../store/useStore';

const INTEREST_OPTIONS = [
  { id: 'architecture', label: '🏛️ Architecture' },
  { id: 'food',         label: '🍜 Food' },
  { id: 'nature',       label: '🌿 Nature' },
  { id: 'history',      label: '⚔️ History' },
  { id: 'art',          label: '🎨 Art' },
  { id: 'nightlife',    label: '🌃 Nightlife' },
];

const ACCESS_OPTIONS = [
  { id: 1, label: '1 — All routes' },
  { id: 2, label: '2 — Mostly flat' },
  { id: 3, label: '3 — No steep hills' },
  { id: 4, label: '4 — Wheelchair-friendly' },
  { id: 5, label: '5 — Full accessibility' },
];

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
function buildAchievements(collection, streak, totalQuests) {
  return [
    { id: 1, name: 'First Steps',    icon: '🎯', unlocked: collection.length >= 1 },
    { id: 2, name: 'Streak 3',       icon: '🔥', unlocked: streak >= 3 },
    { id: 3, name: 'Explorer',       icon: '🌆', unlocked: collection.length >= 5 },
    { id: 4, name: 'Hidden Hunter',  icon: '🔍', unlocked: collection.some((c) => c.tier === 'hidden') },
    { id: 5, name: 'Quest Finisher', icon: '🏆', unlocked: totalQuests >= 1 },
    { id: 6, name: 'Veteran',        icon: '🎖️', unlocked: totalQuests >= 10 },
  ];
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [refinementLoading, setRefinementLoading] = useState(false);

  const userName       = useStore((s) => s.userName);
  const getLevel       = useStore((s) => s.getLevel);
  const getStreak      = useStore((s) => s.getStreak);
  const getStats       = useStore((s) => s.getStats);
  const getDNAStats    = useStore((s) => s.getDNAStats);
  const getExplorerType = useStore((s) => s.getExplorerType);
  const collection     = useStore((s) => s.collection);

  const signOut        = useStore((s) => s.signOut);
  const authUser       = useStore((s) => s.authUser);
  const preferences    = useStore((s) => s.preferences);
  const setPreferences = useStore((s) => s.setPreferences);
  const interests      = useStore((s) => s.interests);
  const setInterests   = useStore((s) => s.setInterests);
  const resetLearning      = useStore((s) => s.resetLearning);
  const getWalkPaceKmh     = useStore((s) => s.getWalkPaceKmh);
  const walkPaceSamples    = useStore((s) => s.walkPaceSamples);
  const getTotalXP         = useStore((s) => s.getTotalXP);
  const explorerTypeHistory = useStore((s) => s.explorerTypeHistory);
  const refinementMessage  = useStore((s) => s.refinementMessage);
  const recommendedInterestAdditions = useStore((s) => s.recommendedInterestAdditions);
  const navigation         = useNavigation();

  const level        = getLevel();
  const streak       = getStreak();
  const stats        = getStats();
  const dna          = getDNAStats();
  const explorerType = getExplorerType();
  const achievements = buildAchievements(collection, streak, stats.quests);

  // Compute per-category dwell averages from local collection
  const dwellStats = useMemo(() => {
    const totals = {}, counts = {};
    collection.forEach(c => {
      if (c.dwell_time_min > 0 && c.category) {
        totals[c.category] = (totals[c.category] || 0) + c.dwell_time_min;
        counts[c.category] = (counts[c.category] || 0) + 1;
      }
    });
    const avgs = {};
    Object.keys(totals).forEach(cat => { avgs[cat] = Math.round(totals[cat] / counts[cat]); });
    return avgs; // { Architecture: 24, Food: 18, … }
  }, [collection]);

  // Compute category visit distribution for insight strip
  const catDistribution = useMemo(() => {
    const counts = {};
    collection.forEach(c => { if (c.category) counts[c.category] = (counts[c.category] || 0) + 1; });
    const total = collection.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, n]) => ({ cat, n, pct: Math.round((n / total) * 100) }));
  }, [collection]);

  const learnedPace = getWalkPaceKmh();
  const paceLabel = walkPaceSamples.length < 2 ? 'Default (no walks yet)' : `${learnedPace.toFixed(1)} km/h`;

  const totalXP = getTotalXP();
  const DISCOVERED_XP = 500;
  const HIDDEN_XP = 2500;
  const nextTierLabel = totalXP < DISCOVERED_XP ? 'Discovered'
    : totalXP < HIDDEN_XP ? 'Hidden' : null;
  const nextTierXP = totalXP < DISCOVERED_XP ? DISCOVERED_XP
    : totalXP < HIDDEN_XP ? HIDDEN_XP : null;
  const tierProgressPct = nextTierXP
    ? Math.min(100, Math.round((totalXP / nextTierXP) * 100)) : 100;

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
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 20 }]}>Adaptive Persona</Text>
        <View style={styles.visitorTypeContainer}>
          {visitorTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.visitorOption,
                preferences.visitor_type === type.id && { borderColor: theme.primary, backgroundColor: `${theme.primary}10` }
              ]}
              onPress={() => setPreferences({ visitor_type: type.id })}
            >
              <Text style={[styles.visitorLabel, preferences.visitor_type === type.id && { color: theme.primary }]}>
                {type.label}
              </Text>
              <Text style={styles.visitorDesc}>{type.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inline interest chip editor */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 4 }]}>Your Interests</Text>
        <View style={styles.chipWrap}>
          {INTEREST_OPTIONS.map(opt => {
            const active = interests.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => {
                  const next = active
                    ? interests.filter(i => i !== opt.id)
                    : [...interests, opt.id];
                  if (next.length > 0) setInterests(next);
                }}
              >
                <Text style={[styles.chipText, active && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Accessibility level */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Accessibility Needs</Text>
        <View style={styles.chipWrap}>
          {ACCESS_OPTIONS.map(opt => {
            const active = (preferences.accessibility_min || 1) === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, { flex: undefined, paddingHorizontal: 14 }, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setPreferences({ accessibility_min: opt.id })}
              >
                <Text style={[styles.chipText, active && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>


        {/* Detail Level Selection */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 10 }]}>Information Density</Text>
        <View style={styles.visitorTypeContainer}>
          {[
            { id: 'overview', label: '📖 Overview', desc: 'Short, punchy summaries.' },
            { id: 'deep dive', label: '🎓 Deep Dive', desc: 'Rich architectural history.' }
          ].map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.visitorOption,
                preferences.detail_level === type.id && { borderColor: theme.primary, backgroundColor: `${theme.primary}10` }
              ]}
              onPress={() => setPreferences({ detail_level: type.id })}
            >
              <Text style={[styles.visitorLabel, preferences.detail_level === type.id && { color: theme.primary }]}>
                {type.label}
              </Text>
              <Text style={styles.visitorDesc}>{type.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Language Selection */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 10 }]}>Primary Language</Text>
        <View style={styles.visitorTypeContainer}>
          {[
            { id: 'en', label: '🇬🇧 English' },
            { id: 'es', label: '🇪🇸 Español' },
            { id: 'fr', label: '🇫🇷 Français' }
          ].map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.visitorOption,
                { alignItems: 'center', padding: 12 },
                preferences.language_pref === type.id && { borderColor: theme.primary, backgroundColor: `${theme.primary}10` }
              ]}
              onPress={() => setPreferences({ language_pref: type.id })}
            >
              <Text style={[styles.visitorLabel, { marginBottom: 0 }, preferences.language_pref === type.id && { color: theme.primary }]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.visitorOption,
            { marginTop: 10, borderColor: theme.primary, backgroundColor: `${theme.primary}05`, width: '100%' },
            refinementLoading && { opacity: 0.5 }
          ]}
          onPress={async () => {
            if (refinementLoading || collection.length === 0) return;
            setRefinementLoading(true);
            const store = useStore.getState();
            await store.fetchRefinement();
            const msg = store.refinementMessage;
            const recs = store.recommendedInterestAdditions;

            if (msg) {
              Alert.alert(
                '🧠 Taste Profile Insight',
                msg,
                [
                  {
                    text: recs?.length > 0 ? '✅ Add to Interests' : 'Got It',
                    onPress: () => {
                      if (recs?.length > 0) {
                        // Auto-add recommended categories
                        const newInterests = [...new Set([...interests, ...recs])];
                        setInterests(newInterests);
                      }
                    },
                  },
                  { text: 'Not Now', style: 'cancel' },
                ]
              );
            }
            setRefinementLoading(false);
          }}
          disabled={refinementLoading}
        >
          <Text style={[styles.visitorLabel, { color: theme.primary, textAlign: 'center', marginBottom: 0 }]}>
            {refinementLoading ? '⏳ Analyzing...' : collection.length === 0 ? '🧠 Explore first to refine taste' : '🧠 Refine My Taste'}
          </Text>
        </TouchableOpacity>


        {/* Behavioral Insights — full scrutability */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>How Explorify Adapts to You</Text>
        <View style={[styles.insightsCard, { backgroundColor: 'white' }]}>
          {/* Cold Start Detection */}
          {collection.length === 0 && (
            <>
              <View style={styles.insightItem}>
                <View style={[styles.insightIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={{ fontSize: 20 }}>🆕</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Cold Start Active</Text>
                  <Text style={[styles.insightValue, { color: theme.textPrimary }]}>
                    Using onboarding data
                  </Text>
                </View>
                <View style={[styles.insightBadge, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={[styles.badgeText, { color: '#7C3AED' }]}>New User</Text>
                </View>
              </View>
              <View style={[styles.insightDivider, { backgroundColor: theme.border }]} />
            </>
          )}

          {/* Walking Pace */}
          <View style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: '#EFF6FF' }]}>
              <Text style={{ fontSize: 20 }}>🚶</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Learned Walking Pace</Text>
              <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{paceLabel}</Text>
            </View>
            <View style={styles.insightBadge}>
              <Text style={styles.badgeText}>
                {walkPaceSamples.length < 2 ? 'Learning' : learnedPace > 5.0 ? 'Fast Walker' : learnedPace > 4.5 ? 'Active' : 'Steady'}
              </Text>
            </View>
          </View>

          <View style={[styles.insightDivider, { backgroundColor: theme.border }]} />

          {/* Visit Style / Dwell Time */}
          <View style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: '#FDF2F8' }]}>
              <Text style={{ fontSize: 20 }}>⏳</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Visit Duration Style</Text>
              <Text style={[styles.insightValue, { color: theme.textPrimary }]}>
                {Object.keys(dwellStats).length > 0
                  ? `${Object.keys(dwellStats).length} categories personalised`
                  : collection.length === 0 ? 'Default (no data yet)' : 'Standard'}
              </Text>
              {Object.keys(dwellStats).length > 0 && (
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                  {Object.entries(dwellStats).slice(0, 3).map(([c, m]) => `${c}: ${m} min`).join(' · ')}
                </Text>
              )}
            </View>
            <View style={styles.insightBadge}>
              <Text style={styles.badgeText}>
                {Object.keys(dwellStats).length > 0 ? 'Learned' : 'Default'}
              </Text>
            </View>
          </View>

          <View style={[styles.insightDivider, { backgroundColor: theme.border }]} />

          {/* Difficulty Tier */}
          <View style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: '#FEF3C7' }]}>
              <Text style={{ fontSize: 20 }}>📊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Difficulty Tier</Text>
              <Text style={[styles.insightValue, { color: theme.textPrimary }]}>
                {!nextTierLabel ? 'All tiers unlocked 🎉'
                  : totalXP >= DISCOVERED_XP ? 'Discovered unlocked'
                  : 'Public tier only'}
              </Text>
              {nextTierLabel && (
                <View style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      {nextTierXP - totalXP} XP to unlock {nextTierLabel}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>{tierProgressPct}%</Text>
                  </View>
                  <View style={{ height: 5, backgroundColor: '#F3F4F6', borderRadius: 3 }}>
                    <View style={{ width: `${tierProgressPct}%`, height: 5, borderRadius: 3, backgroundColor: theme.primary }} />
                  </View>
                </View>
              )}
            </View>
            <View style={[styles.insightBadge, { 
              backgroundColor: collection.reduce((s, c) => s + (c.xpEarned || 150), 0) >= 2000 ? '#ECFDF5' : '#FEF3C7' 
            }]}>
              <Text style={[styles.badgeText, { 
                color: collection.reduce((s, c) => s + (c.xpEarned || 150), 0) >= 2000 ? '#059669' : '#92400E' 
              }]}>
                {collection.reduce((s, c) => s + (c.xpEarned || 150), 0)} XP
              </Text>
            </View>
          </View>

          <View style={[styles.insightDivider, { backgroundColor: theme.border }]} />

          {/* Route Completion */}
          <View style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: '#FEE2E2' }]}>
              <Text style={{ fontSize: 20 }}>🛤️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Route Preference</Text>
              <Text style={[styles.insightValue, { color: theme.textPrimary }]}>
                {preferences.abandonment_streak >= 3
                  ? 'Prefers shorter routes'
                  : preferences.abandonment_streak > 0
                  ? `${preferences.abandonment_streak} route(s) abandoned`
                  : 'Standard length'}
              </Text>
            </View>
            <View style={styles.insightBadge}>
              <Text style={styles.badgeText}>
                {preferences.abandonment_streak >= 3 ? 'Adapted' : 'Normal'}
              </Text>
            </View>
          </View>

          {/* Data source info */}
          <View style={styles.insightFooter}>
            <Text style={styles.insightFooterText}>
              Based on {collection.length} check-in{collection.length !== 1 ? 's' : ''} · These insights shape your routes and recommendations automatically.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.resetBtn} 
            onPress={() => {
              Alert.alert('Reset Learning', 'This will clear your learned walking pace, visit durations, and route preferences. Routes will use default values. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => resetLearning() }
              ]);
            }}
          >
            <Text style={styles.resetBtnText}>Reset Behavioral Learning</Text>
          </TouchableOpacity>
        </View>

        {/* Category insight strip */}
        {catDistribution.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>What You Actually Explore</Text>
            <View style={[styles.insightsCard, { backgroundColor: 'white', paddingVertical: 16 }]}>
              {catDistribution.map(({ cat, n, pct }) => {
                const stated = interests.some(i => i === cat.toLowerCase());
                return (
                  <View key={cat} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>
                        {cat} {stated ? '✅' : '⚠️'}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>{n} check-in{n !== 1 ? 's' : ''} · {pct}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#F3F4F6', borderRadius: 3 }}>
                      <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: stated ? theme.primary : '#F97316' }} />
                    </View>
                  </View>
                );
              })}
              <Text style={[styles.insightFooterText, { paddingTop: 8 }]}>
                ✅ Matches your interests · ⚠️ Outside stated interests (potential drift)
              </Text>
            </View>
          </>
        )}

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

        {/* Explorer type evolution */}
        {explorerTypeHistory.length > 1 && (
          <View style={{ marginBottom: 20, padding: 16, backgroundColor: 'white', borderRadius: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 }}>
              Your Explorer Evolution
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
              {explorerTypeHistory.map((h, i) => (
                <React.Fragment key={i}>
                  <Text style={{ fontSize: 12, color: i === explorerTypeHistory.length - 1 ? theme.primary : theme.textSecondary, fontWeight: i === explorerTypeHistory.length - 1 ? '700' : '400' }}>
                    {h.type}
                  </Text>
                  {i < explorerTypeHistory.length - 1 && (
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}> → </Text>
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

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
  insightsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  insightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  insightDivider: {
    height: 1,
    marginVertical: 16,
  },
  insightFooter: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  insightFooterText: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
    textAlign: 'center',
  },
  resetBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
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
