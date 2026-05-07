import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import useStore from '../store/useStore';
import { TopHUD } from '../components/explorify/TopHUD';

const TAB_PERSONAL = 'personal';
const TAB_COMMUNITY = 'community';

export default function QuestScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();
  const [activeTab, setActiveTab] = useState(TAB_PERSONAL);
  const [loading, setLoading] = useState(true);

  const quests = useStore((s) => s.quests);
  const communities = useStore((s) => s.communities);
  const fetchQuests = useStore((s) => s.fetchQuests);
  const fetchCommunities = useStore((s) => s.fetchCommunities);
  const joinCommunity = useStore((s) => s.joinCommunity);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    setMode('quest');
    async function load() {
      setLoading(true);
      await Promise.all([fetchQuests(), fetchCommunities()]);
      setLoading(false);
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
    load();
    return () => setMode('exploration');
  }, []);

  const renderPersonalQuests = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {quests.filter(q => q.quest_type === 'personal').map((quest) => (
        <View key={quest.id} style={styles.questCardContainer}>
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.questCardHeader}
          >
            <View style={styles.questInfo}>
              <Text style={styles.questTitle}>{quest.title}</Text>
              <View style={styles.xpPill}>
                <Text style={styles.xpPillText}>{quest.reward_xp} XP</Text>
              </View>
            </View>
            <Text style={styles.questDescWhite}>{quest.description}</Text>
          </LinearGradient>

          <View style={styles.questCardBody}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${(quest.progress_count / quest.required_count) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {quest.progress_count} / {quest.required_count} themes collected
              </Text>
            </View>

            <View style={styles.themesRow}>
              {quest.required_themes?.map((theme) => {
                const isCollected = quest.collected_themes?.includes(theme);
                return (
                  <View 
                    key={theme} 
                    style={[styles.themePill, isCollected && styles.themePillActive]}
                  >
                    <Text style={[styles.themePillText, isCollected && styles.themePillTextActive]}>
                      {isCollected ? '✅' : '🔒'} {theme}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );

  const renderCommunityHub = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {communities.map((community) => (
        <TouchableOpacity 
          key={community.id} 
          style={styles.communityCard}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              `Join ${community.name}?`,
              `Tackle shared challenges with ${community.theme} enthusiasts.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Join Hub', onPress: () => joinCommunity(community.id) }
              ]
            );
          }}
        >
          <View style={styles.communityHeader}>
            <View style={[styles.communityIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Text style={{ fontSize: 24 }}>
                {community.theme === 'Food' ? '🍔' : community.theme === 'Art' ? '🎨' : '🏛️'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.communityName}>{community.name}</Text>
              <Text style={styles.communityTheme}>{community.theme} Community</Text>
            </View>
            <View style={[styles.joinStatus, { borderColor: theme.primary }]}>
              <Text style={[styles.joinStatusText, { color: theme.primary }]}>Join</Text>
            </View>
          </View>
          <Text style={styles.communityDesc} numberOfLines={2}>
            {community.description || 'Exploring the best of high-culture and heritage together.'}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <TopHUD />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 70, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Discovery Quests</Text>
        
        <View style={styles.tabBar}>
          <Pressable 
            style={[styles.tabItem, activeTab === TAB_PERSONAL && styles.tabItemActive]}
            onPress={() => setActiveTab(TAB_PERSONAL)}
          >
            <Text style={[styles.tabItemText, activeTab === TAB_PERSONAL && styles.tabItemTextActive]}>Personal</Text>
          </Pressable>
          <Pressable 
            style={[styles.tabItem, activeTab === TAB_COMMUNITY && styles.tabItemActive]}
            onPress={() => setActiveTab(TAB_COMMUNITY)}
          >
            <Text style={[styles.tabItemText, activeTab === TAB_COMMUNITY && styles.tabItemTextActive]}>Community</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          activeTab === TAB_PERSONAL ? renderPersonalQuests() : renderCommunityHub()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginBottom: 24, letterSpacing: -0.5 },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 16, 
    padding: 6, 
    marginBottom: 28 
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabItemActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  tabItemText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  tabItemTextActive: { color: '#0F172A' },
  tabContent: { gap: 20 },
  
  // Quest Card
  questCardContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  questCardHeader: { padding: 20 },
  questInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  questTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  xpPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  xpPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  questDescWhite: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 18 },
  
  questCardBody: { padding: 20 },
  progressContainer: { marginBottom: 16 },
  progressBarBg: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 5 },
  progressText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  
  themesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themePill: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12, 
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  themePillActive: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  themePillText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  themePillTextActive: { color: '#166534' },

  // Community Card
  communityCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  communityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  communityIcon: { 
    width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 16 
  },
  communityName: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  communityTheme: { fontSize: 11, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5 },
  joinStatus: { borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  joinStatusText: { fontSize: 13, fontWeight: '700' },
  communityDesc: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  
  loader: { marginTop: 60, alignItems: 'center' }
});
