import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

export function OwnMessage({ text, time }) {
  return (
    <View style={styles.ownRow}>
      <View style={styles.ownBubble}>
        <Text style={styles.ownText}>{text}</Text>
      </View>
      <Text style={styles.ownTime}>{time}</Text>
    </View>
  );
}

export function OtherMessage({ sender, text, time }) {
  return (
    <View style={styles.otherRow}>
      <Text style={styles.senderName}>{sender}</Text>
      <View style={styles.otherBubble}>
        <Text style={styles.otherText}>{text}</Text>
      </View>
      <Text style={styles.otherTime}>{time}</Text>
    </View>
  );
}

export function CheckInShare({ sender, landmark, time }) {
  return (
    <View style={styles.otherRow}>
      <Text style={styles.senderName}>{sender}</Text>
      <View style={styles.checkInCard}>
        <View style={[styles.checkInImage, { backgroundColor: landmark.color }]}>
          <Text style={styles.checkInEmoji}>📍</Text>
        </View>
        <View style={styles.checkInBody}>
          <Text style={styles.checkInName}>{landmark.name}</Text>
          <View style={styles.checkInMeta}>
            <Text style={styles.checkInXP}>+{landmark.xp} XP</Text>
            <Text style={styles.checkInCat}>{landmark.category}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.otherTime}>{time}</Text>
    </View>
  );
}

export function WaypointVote({ options, totalVotes, onVote }) {
  const maxVotes = Math.max(...options.map((o) => o.votes));
  return (
    <View style={styles.voteCard}>
      <Text style={styles.voteTitle}>Where next? 🗺️</Text>
      {options.map((option) => {
        const pct = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
        const isWinning = option.votes === maxVotes && option.votes > 0;
        return (
          <Pressable key={option.id} onPress={() => onVote(option.id)} style={styles.voteOption}>
            <View style={[styles.voteImageArea, { backgroundColor: option.color },
              isWinning && styles.voteWinningBorder]}>
              <Text style={styles.voteImageText}>{option.name.split(' ')[0]}</Text>
              <View style={styles.voteBarBg}>
                <View style={[styles.voteBarFill,
                  { width: `${pct}%`, backgroundColor: isWinning ? '#FF6B6B' : '#0D9488' }]} />
              </View>
            </View>
            <View style={styles.voteFooter}>
              <Text style={styles.voteOptionName}>{option.name}</Text>
              <Text style={[styles.voteCount, { color: isWinning ? '#FF6B6B' : '#888' }]}>
                {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HiddenUnlockAlert({ landmarkName, xp, onPress }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
    ).start();
  }, []);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 400] });

  return (
    <Pressable onPress={onPress} style={styles.unlockCard}>
      <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]} />
      <Text style={styles.unlockEmoji}>🔓</Text>
      <Text style={styles.unlockTitle}>The group just unlocked a Hidden Landmark!</Text>
      <Text style={styles.unlockSub}>Tap to reveal — {landmarkName}, +{xp} XP each</Text>
    </Pressable>
  );
}

export function SystemMessage({ text }) {
  return (
    <View style={styles.systemRow}>
      <Text style={styles.systemText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // OwnMessage
  ownRow: { alignItems: 'flex-end', marginBottom: 12 },
  ownBubble: {
    backgroundColor: '#FF6B6B', borderRadius: 18, borderTopRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '75%',
  },
  ownText: { color: 'white', fontSize: 14 },
  ownTime: { fontSize: 10, color: '#999', marginTop: 3 },

  // OtherMessage
  otherRow: { alignItems: 'flex-start', marginBottom: 12 },
  senderName: { fontSize: 11, fontWeight: '600', color: '#0D9488', marginBottom: 3 },
  otherBubble: {
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 18, borderTopLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '75%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  otherText: { color: '#1A1A2E', fontSize: 14 },
  otherTime: { fontSize: 10, color: '#999', marginTop: 3 },

  // CheckInShare
  checkInCard: {
    backgroundColor: 'white', borderRadius: 16, overflow: 'hidden',
    borderLeftWidth: 4, borderLeftColor: '#0D9488', maxWidth: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  checkInImage: { height: 80, alignItems: 'center', justifyContent: 'center' },
  checkInEmoji: { fontSize: 28, opacity: 0.6 },
  checkInBody: { padding: 10 },
  checkInName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 },
  checkInMeta: { flexDirection: 'row', gap: 8 },
  checkInXP: { fontSize: 12, fontWeight: '600', color: '#F5A623' },
  checkInCat: { fontSize: 12, color: '#888' },

  // WaypointVote
  voteCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 14,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  voteTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 10 },
  voteOption: { marginBottom: 8, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  voteWinningBorder: { borderWidth: 2, borderColor: '#FF6B6B' },
  voteImageArea: { height: 56, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  voteImageText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700' },
  voteBarBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.15)' },
  voteBarFill: { height: 4, borderRadius: 2 },
  voteFooter: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voteOptionName: { fontSize: 12, fontWeight: '500', color: '#1A1A2E' },
  voteCount: { fontSize: 12, fontWeight: '500' },

  // HiddenUnlockAlert
  unlockCard: {
    borderRadius: 20, padding: 16, marginBottom: 12, overflow: 'hidden',
    backgroundColor: '#3D2B8E',
  },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 80,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ skewX: '-20deg' }],
  },
  unlockEmoji: { fontSize: 24, marginBottom: 6 },
  unlockTitle: { fontSize: 14, fontWeight: '700', color: 'white', marginBottom: 4 },
  unlockSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // SystemMessage
  systemRow: { alignItems: 'center', marginVertical: 10 },
  systemText: { fontSize: 12, color: '#999' },
});
