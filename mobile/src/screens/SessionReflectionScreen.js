import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { CheckCircle2, TrendingUp, Sparkles, ArrowRight } from 'lucide-react-native';
import useStore from '../store/useStore';
import { useTheme } from '../context/ThemeContext';

/**
 * SessionReflectionScreen
 * Shows at end of exploration session:
 * - What was accomplished
 * - Interest drift detected
 * - Difficulty tier unlocked
 * - Recommendations for next session
 */
export default function SessionReflectionScreen({ navigation, route }) {
  const { theme } = useTheme();
  const sessionData = route?.params?.sessionData || {};

  const [reflectionItems, setReflectionItems] = useState([]);

  // Extract data from session
  const {
    landmarksVisited = [],
    xpEarned = 0,
    driftDetected = null,
    tierUnlocked = null,
    nextRecommendations = [],
    sessionDuration = 0,
  } = sessionData;

  useEffect(() => {
    buildReflectionItems();
  }, [sessionData]);

  const buildReflectionItems = () => {
    const items = [];

    // Item 1: Landmarks visited
    if (landmarksVisited.length > 0) {
      items.push({
        id: 'landmarks',
        type: 'accomplishment',
        icon: '📍',
        title: `Visited ${landmarksVisited.length} landmark${landmarksVisited.length !== 1 ? 's' : ''}`,
        subtitle: landmarksVisited.map(l => l.name).join(', '),
        detail: `+${xpEarned} XP earned`,
        color: '#3B82F6',
      });
    }

    // Item 2: Drift detected
    if (driftDetected) {
      items.push({
        id: 'drift',
        type: 'drift',
        icon: '🎯',
        title: 'Interest Shift Detected',
        subtitle: `You're exploring ${driftDetected.to} more now.`,
        detail: `${(driftDetected.confidence * 100).toFixed(0)}% confident you'd like to add it`,
        color: '#F59130',
        driftData: driftDetected,
      });
    }

    // Item 3: Tier unlocked
    if (tierUnlocked) {
      items.push({
        id: 'tier',
        type: 'milestone',
        icon: '🎉',
        title: `Unlocked ${tierUnlocked.name}!`,
        subtitle: `New landmarks at difficulty ${tierUnlocked.level} now available`,
        detail: `${tierUnlocked.xpRequired} XP required — you did it!`,
        color: '#8B5CF6',
      });
    }

    // Item 4: Next recommendations
    if (nextRecommendations.length > 0) {
      items.push({
        id: 'recommend',
        type: 'recommendation',
        icon: '✨',
        title: 'Tomorrow\'s Theme',
        subtitle: nextRecommendations[0].theme,
        detail: nextRecommendations[0].reason,
        color: '#EC4899',
      });
    }

    setReflectionItems(items);
  };

  const handleDriftAction = (driftData) => {
    // Trigger drift modal via store
    useStore.getState().setDriftAlert({
      drifted: true,
      type: 'new_interest',
      to: driftData.to,
      from: driftData.from,
      visitCount: driftData.visitCount,
      confidence: driftData.confidence,
    });
    // User will handle via modal
  };

  const handleContinue = () => {
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.surface }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerEmoji]}>🎊</Text>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Great Session!
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Here's what happened during your exploration
        </Text>
      </View>

      {/* Reflection Items */}
      <View style={styles.itemsContainer}>
        {reflectionItems.map((item) => (
          <ReflectionItemCard
            key={item.id}
            item={item}
            theme={theme}
            onDriftAction={handleDriftAction}
          />
        ))}
      </View>

      {/* Stats Footer */}
      <View style={[styles.statsFooter, { backgroundColor: `${theme.primary}10` }]}>
        <StatsRow
          emoji="⏱️"
          label="Time Explored"
          value={formatDuration(sessionDuration)}
          theme={theme}
        />
        <StatsRow
          emoji="📍"
          label="Landmarks Visited"
          value={String(landmarksVisited.length)}
          theme={theme}
        />
        <StatsRow
          emoji="⭐"
          label="XP Earned"
          value={String(xpEarned)}
          theme={theme}
        />
      </View>

      {/* Continue Button */}
      <Pressable
        style={[styles.continueBtn, { backgroundColor: theme.primary }]}
        onPress={handleContinue}
      >
        <Text style={styles.continueBtnText}>Back to Home</Text>
        <ArrowRight size={20} color="#fff" />
      </Pressable>

      {/* Reflection Tip */}
      <View style={[styles.tipCard, { borderColor: theme.border }]}>
        <Text style={styles.tipEmoji}>💭</Text>
        <Text style={[styles.tipTitle, { color: theme.textPrimary }]}>
          Reflection
        </Text>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          Your preferences are evolving! Each visit teaches us more about what you love. Keep exploring to unlock even more personalized routes.
        </Text>
      </View>
    </ScrollView>
  );
}

function ReflectionItemCard({ item, theme, onDriftAction }) {
  return (
    <View style={[styles.itemCard, { borderColor: theme.border }]}>
      {/* Header with Icon and Title */}
      <View style={styles.itemHeader}>
        <Text style={[styles.itemIcon, { color: item.color }]}>
          {item.icon}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: item.color }]}>
            {item.title}
          </Text>
          <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
            {item.subtitle}
          </Text>
        </View>
      </View>

      {/* Detail line */}
      <Text style={[styles.itemDetail, { color: theme.textSecondary }]}>
        {item.detail}
      </Text>

      {/* Action button if drift */}
      {item.type === 'drift' && (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: `${item.color}20` }]}
          onPress={() => onDriftAction(item.driftData)}
        >
          <Text style={[styles.actionBtnText, { color: item.color }]}>
            💭 Update My Interests
          </Text>
        </Pressable>
      )}

      {/* Action button if milestone */}
      {item.type === 'milestone' && (
        <View style={[styles.milestoneTag, { backgroundColor: `${item.color}20` }]}>
          <Text style={[styles.milestoneTagText, { color: item.color }]}>
            🎖️ New Achievement
          </Text>
        </View>
      )}

      {/* Action button if recommendation */}
      {item.type === 'recommendation' && (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: `${item.color}20` }]}
        >
          <Text style={[styles.actionBtnText, { color: item.color }]}>
            📅 Plan for tomorrow
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function StatsRow({ emoji, label, value, theme }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: theme.primary }]}>
        {value}
      </Text>
    </View>
  );
}

function formatDuration(ms) {
  if (!ms) return '0 min';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  headerEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  itemsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemIcon: {
    fontSize: 32,
    marginRight: 12,
    marginTop: 2,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemDetail: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  milestoneTag: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  milestoneTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsFooter: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  statLabel: {
    fontSize: 13,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  continueBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  tipCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 32,
  },
  tipEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
