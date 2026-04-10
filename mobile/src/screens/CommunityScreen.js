import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import useStore from '../store/useStore';
import { Users, Map, MessageSquare, ChevronRight, PlusCircle } from 'lucide-react-native';

/**
 * CommunityScreen - Replaces the old GroupScreen.
 * Users browse persistent communities based on themes (History, Food, etc.)
 */
export default function CommunityScreen({ navigation }) {
  const { communities, fetchCommunities, joinCommunity, authUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await fetchCommunities();
    setLoading(false);
  };

  const handleJoin = async (communityId, name) => {
    setJoiningId(communityId);
    try {
      await joinCommunity(communityId);
      Alert.alert('Welcome!', `You are now a member of ${name}.`);
      await fetchCommunities(); // Refresh to update is_member
    } catch (err) {
      Alert.alert('Error', 'Failed to join community.');
    } finally {
      setJoiningId(null);
    }
  };

  const enterCommunity = (item) => {
    if (!item.is_member) {
      Alert.alert('Join First', 'You need to join this community to access the chat channels.');
      return;
    }
    navigation.navigate('CommunityChat', { 
      community_id: item.id, 
      community_name: item.name 
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E86AB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorify Communities</Text>
        <Text style={styles.headerSubtitle}>Find your tribe and discover the city together.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {communities.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No Communities Found</Text>
            <Text style={styles.emptySub}>We couldn't load any communities. Please check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : communities.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.card}
            onPress={() => enterCommunity(item)}
          >
            <View style={styles.cardContent}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>
                  {item.theme === 'History' ? '🏛️' : item.theme === 'Food' ? '🍽️' : '✨'}
                </Text>
              </View>
              
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.theme}</Text>
                  </View>
                </View>
              </View>

              {item.is_member ? (
                <View style={[styles.joinBtn, styles.memberBadge]}>
                   <Users size={20} color="#fff" />
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.joinBtn} 
                  onPress={() => handleJoin(item.id, item.name)}
                  disabled={joiningId === item.id}
                >
                  {joiningId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <PlusCircle size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.footerInfo}>
                <MessageSquare size={16} color="#94A3B8" />
                <Text style={styles.footerText}>Open Chat Channels</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 16,
  },
  tagRow: {
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
    textTransform: 'uppercase',
  },
  joinBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E86AB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  memberBadge: {
    backgroundColor: '#10B981',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#2E86AB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
