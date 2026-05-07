import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, Pressable, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Search, Plus, ArrowLeft, ChevronRight } from 'lucide-react-native';
import useStore from '../store/useStore';
import { fetchDirectMessages } from '../services/supabase';
import { useTheme } from '../context/ThemeContext';

export default function DirectMessagesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const authUser = useStore(s => s.authUser);

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      // Supabase query to get all DMs for the user
      const { data, error } = await (await import('../services/supabase')).default
        .from('messages')
        .select('*')
        .is('expedition_id', null)
        .is('channel_id', null)
        .or(`sender_id.eq.${authUser.id},dm_peer_id.eq.${authUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by peer
      const peers = {};
      data.forEach(msg => {
        const peerId = msg.sender_id === authUser.id ? msg.dm_peer_id : msg.sender_id;
        const peerName = msg.sender_id === authUser.id ? (msg.metadata?.peer_name || 'Explorer') : msg.sender_name;
        
        if (!peers[peerId] || new Date(msg.created_at) > new Date(peers[peerId].last_message_at)) {
          peers[peerId] = {
            peer_id: peerId,
            peer_name: peerName,
            last_message: msg.content,
            last_message_at: msg.created_at,
          };
        }
      });

      setConversations(Object.values(peers));
    } catch (err) {
      console.warn('Load conversations error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.convCard}
      onPress={() => navigation.navigate('DirectChat', { 
        peer_id: item.peer_id, 
        peer_name: item.peer_name 
      })}
    >
      <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>
          {item.peer_name?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.convInfo}>
        <View style={styles.convHeader}>
          <Text style={styles.peerName}>{item.peer_name}</Text>
          <Text style={styles.timeText}>
            {new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>{item.last_message}</Text>
      </View>
      <ChevronRight size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Search size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <MessageCircle size={64} color="#E2E8F0" marginBottom={16} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Start a private conversation with explorers you meet on expeditions.</Text>
          <TouchableOpacity 
            style={[styles.startBtn, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Community')}
          >
            <Text style={styles.startBtnText}>Find Explorers</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.peer_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        />
      )}

      {/* FAB to start new chat */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 20 }]}
        onPress={() => navigation.navigate('Community')}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  backBtn: { padding: 4 },
  searchBtn: { padding: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  startBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  startBtnText: { color: '#fff', fontWeight: '700' },
  list: { padding: 16 },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  convInfo: { flex: 1, marginLeft: 16, marginRight: 8 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  peerName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  timeText: { fontSize: 12, color: '#94A3B8' },
  lastMsg: { fontSize: 14, color: '#64748B' },
  fab: {
    position: 'absolute', right: 20,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  }
});
