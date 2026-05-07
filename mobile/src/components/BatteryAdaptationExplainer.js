import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Zap, AlertCircle, MapPin, Clock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import useBattery from '../hooks/useBattery';

/**
 * BatteryAdaptationExplainer
 * Shows user how battery level affects route recommendations
 * Explains: why certain landmarks chosen, why others skipped
 */
export function BatteryAdaptationExplainer() {
  const { theme } = useTheme();
  const battery = useBattery();

  const batteryTier = useMemo(() => {
    if (battery.level === null) return 'unknown';
    if (battery.level >= 50) return 'ok';
    if (battery.level >= 20) return 'medium';
    if (battery.level >= 10) return 'low';
    return 'critical';
  }, [battery.level]);

  const getBatteryInfo = () => {
    switch (batteryTier) {
      case 'ok':
        return {
          icon: '🔋',
          title: 'Full Battery',
          subtitle: `Battery: ${battery.level}% — All routes available`,
          description: 'You have plenty of battery. We'll recommend a full range of landmarks.',
          details: [
            { label: 'Distance', value: 'No limit', emoji: '📍' },
            { label: 'Visit Duration', value: 'Standard (20–60 min)', emoji: '⏱️' },
            { label: 'Categories', value: 'All available', emoji: '✨' },
          ],
          bgColor: '#10B98120',
          borderColor: '#10B981',
          color: '#059669',
        };
      case 'medium':
        return {
          icon: '⚠️',
          title: 'Medium Battery',
          subtitle: `Battery: ${battery.level}% — Balanced recommendations`,
          description: 'Battery is okay, but we\'ll prioritize closer, quicker stops.',
          details: [
            { label: 'Distance', value: '< 500m preferred', emoji: '📍' },
            { label: 'Visit Duration', value: 'Quick stops (15–30 min)', emoji: '⏱️' },
            { label: 'Categories', value: 'All (closer first)', emoji: '✨' },
          ],
          bgColor: '#F5913020',
          borderColor: '#F59130',
          color: '#D97706',
        };
      case 'low':
        return {
          icon: '🪫',
          title: 'Low Battery',
          subtitle: `Battery: ${battery.level}% — Quick stops only`,
          description: 'Battery is running low. We\'re prioritizing very close, fast landmarks.',
          details: [
            { label: 'Distance', value: '< 300m only', emoji: '📍' },
            { label: 'Visit Duration', value: 'Very quick (< 20 min)', emoji: '⏱️' },
            { label: 'Categories', value: 'Nearby categories only', emoji: '✨' },
          ],
          bgColor: '#EF444420',
          borderColor: '#EF4444',
          color: '#DC2626',
        };
      case 'critical':
        return {
          icon: '🚨',
          title: 'Critical Battery',
          subtitle: `Battery: ${battery.level}% — Emergency mode`,
          description: 'Battery is critical. We\'re showing only the nearest landmarks.',
          details: [
            { label: 'Distance', value: '< 200m urgently close', emoji: '📍' },
            { label: 'Visit Duration', value: 'Ultra-quick (< 15 min)', emoji: '⏱️' },
            { label: 'Focus', value: 'Charging station routes', emoji: '⚡' },
          ],
          bgColor: '#7C3AED20',
          borderColor: '#7C3AED',
          color: '#6D28D9',
        };
      default:
        return {
          icon: '❓',
          title: 'Battery Unknown',
          subtitle: 'Unable to detect battery level',
          description: 'Using standard recommendations.',
          details: [],
          bgColor: '#6B728020',
          borderColor: '#6B7280',
          color: '#4B5563',
        };
    }
  };

  const info = getBatteryInfo();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: info.bgColor, borderColor: info.borderColor },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerIcon}>{info.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: info.color }]}>
              {info.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: info.borderColor }]}>
              {info.subtitle}
            </Text>
          </View>
        </View>
        <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
          {info.description}
        </Text>
      </View>

      {/* How It Affects Routes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          How This Affects Your Route
        </Text>

        {info.details.map((detail, idx) => (
          <View
            key={idx}
            style={[styles.detailRow, { borderBottomColor: theme.border }]}
          >
            <View style={styles.detailLabel}>
              <Text style={styles.detailEmoji}>{detail.emoji}</Text>
              <Text style={[styles.detailName, { color: theme.textSecondary }]}>
                {detail.label}
              </Text>
            </View>
            <Text style={[styles.detailValue, { color: info.color }]}>
              {detail.value}
            </Text>
          </View>
        ))}
      </View>

      {/* What This Means */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          What This Means
        </Text>

        {batteryTier === 'ok' && (
          <>
            <BulletPoint
              emoji="✅"
              text="Landmarks far away are available"
              color={theme.textSecondary}
            />
            <BulletPoint
              emoji="✅"
              text="Long visits (museums, galleries) included"
              color={theme.textSecondary}
            />
            <BulletPoint
              emoji="✅"
              text="All categories equally recommended"
              color={theme.textSecondary}
            />
          </>
        )}

        {batteryTier === 'medium' && (
          <>
            <BulletPoint
              emoji="⚠️"
              text="Slightly prefer nearby landmarks (< 500m)"
              color={theme.textSecondary}
            />
            <BulletPoint
              emoji="⚠️"
              text="Quick stops prioritized over long visits"
              color={theme.textSecondary}
            />
            <BulletPoint
              emoji="💡"
              text="This keeps you exploring while saving battery"
              color={theme.textSecondary}
            />
          </>
        )}

        {batteryTier === 'low' && (
          <>
            <BulletPoint
              emoji="🚨"
              text="Only very close landmarks shown (< 300m)"
              color={theme.textSecondary}
            />
            <BulletPoint
              emoji="🚨"
              text="Very quick visits (< 20 min each)"
              color={theme.textSecondary}
            />
            <BulletPoint
              emoji="💡"
              text="Goal: Keep you exploring until you can charge"
              color={theme.textSecondary}
            />
          </>
        )}

        {batteryTier === 'critical' && (
          <>
            <BulletPoint
              emoji="🚨"
              text="ONLY nearest landmarks (< 200m)"
              color={theme.textSecondary}
            />
            <BulletPoint
              emoji="🚨"
              text="Ultra-quick visits or charging stations"
              color={theme.textSecondary}
            />
            <BulletPoint
              emoji="💡"
              text="Get to a charger safely before exploring more"
              color={theme.textSecondary}
            />
          </>
        )}
      </View>

      {/* Smart Examples */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Smart Examples
        </Text>

        {batteryTier === 'ok' && (
          <ExampleCard
            emoji="📍"
            title="Museum (1km away, 2-hour visit)"
            status="✅ Recommended"
            statusColor="#10B981"
            reason="Plenty of battery, you can take your time"
          />
        )}

        {batteryTier === 'medium' && (
          <ExampleCard
            emoji="📍"
            title="Café (300m away, 20-min visit)"
            status="✅ Recommended"
            statusColor="#F59130"
            reason="Close + quick = perfect for medium battery"
          />
        )}

        {batteryTier === 'medium' && (
          <ExampleCard
            emoji="📍"
            title="Gallery (800m away, 1-hour visit)"
            status="⚠️ Lower priority"
            statusColor="#F59130"
            reason="Too far + too long given your battery"
          />
        )}

        {batteryTier === 'low' && (
          <ExampleCard
            emoji="📍"
            title="Park bench nearby (100m, 10 min)"
            status="✅ Recommended"
            statusColor="#EF4444"
            reason="Very close + super quick = saves battery"
          />
        )}

        {batteryTier === 'critical' && (
          <ExampleCard
            emoji="⚡"
            title="Nearest charging station"
            status="🚨 Priority 1"
            statusColor="#7C3AED"
            reason="Find a charger first. Explore after."
          />
        )}
      </View>

      {/* Pro Tip */}
      <View
        style={[
          styles.proTipCard,
          { backgroundColor: `${theme.primary}15`, borderColor: theme.primary },
        ]}
      >
        <Text style={{ fontSize: 20, marginBottom: 8 }}>💡 Pro Tip</Text>
        <Text style={[styles.proTipText, { color: theme.textSecondary }]}>
          {batteryTier === 'critical'
            ? 'Head to a charging station, grab a coffee, and continue exploring when you're recharged!'
            : batteryTier === 'low'
            ? 'Consider heading to a café with power outlets to charge while you explore!'
            : batteryTier === 'medium'
            ? 'Mix quick stops nearby with occasional longer visits to stretch your battery!'
            : 'You're in great shape! Take your time and explore anything that interests you.'}
        </Text>
      </View>
    </ScrollView>
  );
}

function BulletPoint({ emoji, text, color }) {
  return (
    <View style={styles.bulletPoint}>
      <Text style={styles.bulletEmoji}>{emoji}</Text>
      <Text style={[styles.bulletText, { color }]}>{text}</Text>
    </View>
  );
}

function ExampleCard({ emoji, title, status, statusColor, reason }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.exampleCard, { borderColor: theme.border }]}>
      <View style={styles.exampleHeader}>
        <Text style={styles.exampleEmoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.exampleTitle, { color: theme.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.exampleStatus, { color: statusColor }]}>
            {status}
          </Text>
        </View>
      </View>
      <Text style={[styles.exampleReason, { color: theme.textSecondary }]}>
        {reason}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFDF8',
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  detailName: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  bulletEmoji: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  proTipCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 40,
  },
  proTipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  exampleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  exampleEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  exampleStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  exampleReason: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 30,
  },
});
