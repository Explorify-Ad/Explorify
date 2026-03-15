import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TIER_COLORS } from '../../utils/theme';

export function TierBadge({ tier }) {
  const color = TIER_COLORS[tier] || TIER_COLORS.public;
  const labels = { public: 'Public', discovered: 'Discovered', hidden: 'Hidden' };
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{labels[tier] || tier}</Text>
    </View>
  );
}

export function XPChip({ amount }) {
  return (
    <View style={[styles.badge, { backgroundColor: TIER_COLORS.public }]}>
      <Text style={styles.badgeText}>{amount} XP</Text>
    </View>
  );
}

export function CategoryPill({ category, color }) {
  const pillColor = color || '#F5A623';
  return (
    <View style={[styles.pill, { borderColor: pillColor }]}>
      <Text style={[styles.pillText, { color: pillColor }]}>{category}</Text>
    </View>
  );
}

export function LevelBadge({ level }) {
  return (
    <View style={[styles.badge, { backgroundColor: TIER_COLORS.public }]}>
      <Text style={styles.badgeText}>Lv.{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.3,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
