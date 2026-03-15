import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LevelBadge } from './Badges';
import { useTheme } from '../../context/ThemeContext';
import useStore from '../../store/useStore';

const XP_PER_LEVEL = 500;

export function TopHUD() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const getLevel    = useStore((s) => s.getLevel);
  const getCurrentXP = useStore((s) => s.getCurrentXP);
  const getStreak   = useStore((s) => s.getStreak);
  const userName    = useStore((s) => s.userName);

  const level     = getLevel();
  const currentXP = getCurrentXP();
  const streak    = getStreak();
  const avatar    = (userName || 'E')[0].toUpperCase();

  const xpAnim    = useRef(new Animated.Value(0)).current;
  const flameScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(xpAnim, {
      toValue: (currentXP / XP_PER_LEVEL) * 100,
      duration: 600,
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flameScale, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(flameScale, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [currentXP]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {/* Avatar + Level */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { borderColor: theme.primary }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{avatar}</Text>
          </View>
          <View style={styles.levelWrap}>
            <LevelBadge level={level} />
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpWrap}>
          <View style={styles.xpTrack}>
            <Animated.View
              style={[
                styles.xpFill,
                {
                  backgroundColor: theme.primary,
                  width: xpAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
          <Text style={[styles.xpLabel, { color: theme.textSecondary }]}>
            {currentXP} / {XP_PER_LEVEL} XP
          </Text>
        </View>

        {/* Streak */}
        <View style={styles.streakRow}>
          <Animated.Text style={{ fontSize: 20, transform: [{ scale: flameScale }] }}>🔥</Animated.Text>
          <Text style={[styles.streakNum, { color: theme.textPrimary }]}>{streak}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', fontSize: 16 },
  levelWrap: { position: 'absolute', bottom: -4, right: -6 },
  xpWrap: { flex: 1 },
  xpTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 3,
  },
  xpLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNum: { fontWeight: '700', fontSize: 14 },
});
