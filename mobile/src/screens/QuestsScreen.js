import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock } from 'lucide-react-native';
import { TopHUD } from '../components/explorify/TopHUD';
import { SecondaryAction } from '../components/explorify/Buttons';
import { useTheme } from '../context/ThemeContext';

const SUGGESTED = [
  { id: 1, title: 'Gothic Revival Tour', category: 'Architecture', difficulty: 3, xp: 750, bg: '#64748b' },
  { id: 2, title: 'Street Food Safari', category: 'Food', difficulty: 2, xp: 500, bg: '#f97316' },
  { id: 3, title: 'Hidden Courtyards', category: 'Hidden Gems', difficulty: 3, xp: 900, bg: '#7c3aed' },
];

export default function QuestsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    setMode('quest');
    Animated.parallel([
      Animated.timing(progressAnim, { toValue: 1, duration: 900, delay: 200, useNativeDriver: false }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 0, duration: 500, delay: 400, useNativeDriver: true }),
    ]).start();
    return () => setMode('exploration');
  }, []);

  const TOP_OFFSET = insets.top + 80;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <TopHUD level={12} currentXP={2340} maxXP={3000} streak={7} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: TOP_OFFSET, paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Quest Card */}
        <Animated.View
          style={[
            styles.activeCard,
            { opacity: cardOpacity, transform: [{ translateY: cardY }] },
          ]}
        >
          <View style={styles.activeCardInner}>
            <View style={styles.activeQuestCat}>
              <Text>🏛️</Text>
              <Text style={styles.activeQuestCatText}>Architecture</Text>
            </View>
            <Text style={styles.activeQuestTitle}>Downtown Heritage Trail</Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '66%'] }) },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>2 of 3 landmarks found</Text>

            {/* Thumbnails */}
            <View style={styles.thumbRow}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.thumb, { backgroundColor: i <= 2 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }]}
                >
                  <Text style={styles.thumbText}>{i <= 2 ? '✓' : '?'}</Text>
                </View>
              ))}
            </View>

            {/* Meta */}
            <View style={styles.metaRow}>
              <View style={styles.xpPill}>
                <Text style={styles.xpPillText}>500 XP</Text>
              </View>
              <View style={styles.timePill}>
                <Clock size={12} color="white" strokeWidth={2} />
                <Text style={styles.timePillText}>2h 14m</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Section header */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Built for you</Text>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
          Based on your Architecture obsession 🏛
        </Text>

        {/* Suggested quests - horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestedScroll}
          contentContainerStyle={styles.suggestedContent}
        >
          {SUGGESTED.map((quest) => (
            <View key={quest.id} style={styles.questCard}>
              <View style={[styles.questCardTop, { backgroundColor: quest.bg }]}>
                <Text style={styles.questCardEmoji}>🏛️</Text>
              </View>
              <View style={styles.questCardBody}>
                <Text style={[styles.questCardTitle, { color: theme.textPrimary }]}>
                  {quest.title}
                </Text>
                <View style={styles.questCardMeta}>
                  <View style={styles.difficultyDots}>
                    {[1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.diffDot,
                          {
                            backgroundColor:
                              i <= quest.difficulty ? theme.primary : 'transparent',
                            borderColor: i <= quest.difficulty ? theme.primary : theme.textSecondary,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.questXP, { color: theme.primary }]}>{quest.xp} XP</Text>
                </View>
                <SecondaryAction style={{ width: '100%' }}>Start</SecondaryAction>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Explorer type card */}
        <View style={[styles.explorerCard, { borderColor: 'rgba(245,166,35,0.3)' }]}>
          <Text style={[styles.explorerLabel, { color: theme.textSecondary }]}>
            YOUR EXPLORER TYPE
          </Text>
          <Text style={[styles.explorerType, { color: theme.primary }]}>Heritage Seeker</Text>
          <Text style={[styles.explorerDesc, { color: theme.textSecondary }]}>
            You go deep, not wide.
          </Text>
          <View style={styles.explorerAvatars}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.explorerAvatar, { marginLeft: i === 1 ? 0 : -8 }]}>
                <Text style={styles.explorerAvatarText}>{i}</Text>
              </View>
            ))}
            <Text style={[styles.explorerMore, { color: theme.textSecondary }]}>
              +10 explorers like you
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  activeCard: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 24,
  },
  activeCardInner: {
    padding: 20,
    backgroundColor: '#7C3AED',
    background: 'linear-gradient(135deg, #7C3AED, #F97316)',
  },
  activeQuestCat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  activeQuestCatText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  activeQuestTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 4,
  },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 16 },
  thumbRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: 'rgba(255,255,255,0.8)', fontSize: 18 },
  metaRow: { flexDirection: 'row', gap: 8 },
  xpPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 100,
  },
  xpPillText: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
  },
  timePillText: { color: 'white', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sectionSub: { fontSize: 13, marginBottom: 16 },
  suggestedScroll: { marginBottom: 20 },
  suggestedContent: { gap: 14, paddingRight: 16 },
  questCard: {
    width: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  questCardTop: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questCardEmoji: { fontSize: 36, opacity: 0.35 },
  questCardBody: { padding: 14 },
  questCardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  questCardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  difficultyDots: { flexDirection: 'row', gap: 4 },
  diffDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  questXP: { fontSize: 12, fontWeight: '600' },
  explorerCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(245,166,35,0.04)',
  },
  explorerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  explorerType: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  explorerDesc: { fontSize: 14, marginBottom: 14 },
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
});
