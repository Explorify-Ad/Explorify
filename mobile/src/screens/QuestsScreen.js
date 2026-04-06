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
import { Clock, CheckCircle2 } from 'lucide-react-native';
import { TopHUD } from '../components/explorify/TopHUD';
import { SecondaryAction } from '../components/explorify/Buttons';
import { useTheme } from '../context/ThemeContext';
import useStore, { QUESTS } from '../store/useStore';

export default function QuestsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(20)).current;

  const getActiveQuest     = useStore((s) => s.getActiveQuest);
  const getSuggestedQuests = useStore((s) => s.getSuggestedQuests);
  const getExplorerType    = useStore((s) => s.getExplorerType);
  const setActiveQuest     = useStore((s) => s.setActiveQuest);
  const completeQuest      = useStore((s) => s.completeQuest);
  const completedQuests    = useStore((s) => s.completedQuests);
  const getDailyChallenge  = useStore((s) => s.getDailyChallenge);
  const claimDailyChallenge = useStore((s) => s.claimDailyChallenge);

  const daily = getDailyChallenge();

  const activeQuest  = getActiveQuest();
  const suggested    = getSuggestedQuests();
  const explorerType = getExplorerType();

  const isComplete = activeQuest.progress >= activeQuest.target;
  const allDone    = QUESTS.every((q) => completedQuests.includes(q.id));

  const progressPct = activeQuest.target > 0 ? activeQuest.progress / activeQuest.target : 0;

  useEffect(() => {
    setMode('quest');
    Animated.parallel([
      Animated.timing(progressAnim, { toValue: progressPct, duration: 900, delay: 200, useNativeDriver: false }),
      Animated.timing(cardOpacity,  { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }),
      Animated.timing(cardY,        { toValue: 0, duration: 500, delay: 400, useNativeDriver: true }),
    ]).start();
    return () => setMode('exploration');
  }, [activeQuest.id]);

  const HUD_HEIGHT = insets.top + 62;

  return (
    <View style={styles.container}>
      {/* Purple header band — active quest lives here */}
      <View style={[styles.headerBand, { paddingTop: HUD_HEIGHT }]}>
        <Animated.View style={[styles.activeCard, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}>
          {isComplete ? (
            /* ── Quest complete state ── */
            <View style={styles.completeState}>
              <CheckCircle2 size={44} color="white" strokeWidth={1.5} style={{ marginBottom: 10 }} />
              <Text style={styles.completeTitle}>Quest Complete!</Text>
              <Text style={styles.completeSubtitle}>{activeQuest.title}</Text>
              <Pressable
                style={styles.claimBtn}
                onPress={() => completeQuest(activeQuest.id)}
              >
                <Text style={styles.claimBtnText}>Claim {activeQuest.xp} XP →</Text>
              </Pressable>
            </View>
          ) : (
            /* ── Active progress state ── */
            <>
              <View style={styles.activeQuestCat}>
                <Text>{activeQuest.emoji}</Text>
                <Text style={styles.activeQuestCatText}>{activeQuest.category}</Text>
              </View>
              <Text style={styles.activeQuestTitle}>{activeQuest.title}</Text>

              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {activeQuest.progress} of {activeQuest.target} landmarks found
              </Text>

              <View style={styles.thumbRow}>
                {Array.from({ length: activeQuest.target }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.thumb, {
                      backgroundColor: i < activeQuest.progress ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                    }]}
                  >
                    <Text style={styles.thumbText}>{i < activeQuest.progress ? '✓' : '?'}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.xpPill}>
                  <Text style={styles.xpPillText}>{activeQuest.xp} XP</Text>
                </View>
                <View style={styles.timePill}>
                  <Clock size={12} color="white" strokeWidth={2} />
                  <Text style={styles.timePillText}>~{activeQuest.target * 20}min</Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </View>

      <TopHUD />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          {allDone ? 'All quests done!' : 'Built for you'}
        </Text>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
          {completedQuests.length > 0
            ? `${completedQuests.length} of ${QUESTS.length} quests completed`
            : 'Tap Start to make a quest active'}
        </Text>

        {/* ── Daily challenge ─────────────────────────────────────── */}
        {daily && (
          <View style={[
            styles.dailyCard,
            daily.claimed && { opacity: 0.55 },
          ]}>
            <View style={styles.dailyLeft}>
              <Text style={styles.dailyLabel}>TODAY'S CHALLENGE</Text>
              <Text style={styles.dailyTitle}>
                {daily.emoji}  Visit {daily.target} {daily.category} spot{daily.target > 1 ? 's' : ''} today
              </Text>
              {/* Progress bar */}
              <View style={styles.dailyTrack}>
                <View style={[styles.dailyFill, { width: `${(daily.progress / daily.target) * 100}%` }]} />
              </View>
              <Text style={styles.dailyProgress}>
                {daily.progress}/{daily.target} · +{daily.xpBonus} XP bonus
              </Text>
            </View>
            {daily.achieved && !daily.claimed ? (
              <Pressable style={styles.claimDailyBtn} onPress={claimDailyChallenge}>
                <Text style={styles.claimDailyText}>Claim</Text>
              </Pressable>
            ) : daily.claimed ? (
              <View style={styles.claimedBadge}>
                <Text style={styles.claimedText}>✓</Text>
              </View>
            ) : null}
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestedScroll}
          contentContainerStyle={styles.suggestedContent}
        >
          {suggested.map((quest) => (
            <View key={quest.id} style={styles.questCard}>
              <View style={[styles.questCardTop, { backgroundColor: quest.bg }]}>
                <Text style={styles.questCardEmoji}>{quest.emoji}</Text>
              </View>
              <View style={styles.questCardBody}>
                <Text style={[styles.questCardTitle, { color: theme.textPrimary }]}>{quest.title}</Text>
                <View style={styles.questCardMeta}>
                  <View style={styles.difficultyDots}>
                    {[1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[styles.diffDot, {
                          backgroundColor: i <= quest.difficulty ? theme.primary : 'transparent',
                          borderColor: i <= quest.difficulty ? theme.primary : theme.textSecondary,
                        }]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.questXP, { color: theme.primary }]}>{quest.xp} XP</Text>
                </View>
                <SecondaryAction style={{ width: '100%' }} onPress={() => setActiveQuest(quest.id)}>
                  Start
                </SecondaryAction>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.explorerCard, { borderColor: 'rgba(245,166,35,0.3)' }]}>
          <Text style={[styles.explorerLabel, { color: theme.textSecondary }]}>YOUR EXPLORER TYPE</Text>
          <Text style={[styles.explorerType, { color: theme.primary }]}>{explorerType.type}</Text>
          <Text style={[styles.explorerDesc, { color: theme.textSecondary }]}>{explorerType.desc}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#7C3AED' },
  headerBand: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FDFAF5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },
  activeCard: {},
  activeQuestCat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  activeQuestCatText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  activeQuestTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  progressTrack: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4,
    overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4,
  },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 16 },
  thumbRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  thumb: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbText: { color: 'rgba(255,255,255,0.8)', fontSize: 18 },
  metaRow: { flexDirection: 'row', gap: 8 },
  xpPill: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 100,
  },
  xpPillText: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100,
  },
  timePillText: { color: 'white', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sectionSub: { fontSize: 13, marginBottom: 16 },
  suggestedScroll: { marginBottom: 20 },
  suggestedContent: { gap: 14, paddingRight: 16 },
  questCard: {
    width: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  questCardTop: { height: 90, alignItems: 'center', justifyContent: 'center' },
  questCardEmoji: { fontSize: 36, opacity: 0.35 },
  questCardBody: { padding: 14 },
  questCardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  questCardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  difficultyDots: { flexDirection: 'row', gap: 4 },
  diffDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  questXP: { fontSize: 12, fontWeight: '600' },
  explorerCard: { padding: 20, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(245,166,35,0.04)' },
  explorerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  explorerType: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  explorerDesc: { fontSize: 14 },
  // Daily challenge
  dailyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)',
  },
  dailyLeft: { flex: 1 },
  dailyLabel: { fontSize: 10, fontWeight: '700', color: '#F5A623', letterSpacing: 1, marginBottom: 4 },
  dailyTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 10 },
  dailyTrack: { height: 5, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  dailyFill: { height: '100%', backgroundColor: '#F5A623', borderRadius: 3 },
  dailyProgress: { fontSize: 11, color: '#6B7280' },
  claimDailyBtn: {
    marginLeft: 12, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F5A623', borderRadius: 100,
  },
  claimDailyText: { color: 'white', fontSize: 13, fontWeight: '700' },
  claimedBadge: {
    marginLeft: 12, width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
  },
  claimedText: { color: 'white', fontSize: 16, fontWeight: '700' },
  // Quest complete state
  completeState: { alignItems: 'center', paddingVertical: 8 },
  completeTitle: { color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  completeSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 20 },
  claimBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderRadius: 100,
  },
  claimBtnText: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
});
