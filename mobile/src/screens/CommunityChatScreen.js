import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import api from '../services/api';
import useStore from '../store/useStore';
import { ArrowLeft, Send } from 'lucide-react-native';
import { fetchChannelMessages, sendChannelMessage, subscribeToChannelMessages, unsubscribe } from '../services/supabase';

/**
 * CommunityChatScreen - Replaces GroupChatScreen.
 * Supports multiple channels (#General, #Meetups) and Expedition discovery.
 */
export default function CommunityChatScreen({ route, navigation }) {
  const { community_id, community_name } = route.params;
  const user = useStore(state => state.authUser);
  
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const channelSubscription = useRef(null);

  // 1. Load community details (channels)
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await api.get(`/communities/${community_id}`);
        const communityData = response.data.data;
        setChannels(communityData.channels || []);
        if (communityData.channels && communityData.channels.length > 0) {
          setActiveChannel(communityData.channels[0]);
        }
      } catch (err) {
        console.warn('Fetch community details error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [community_id]);

  // 2. Load messages and subscribe when active channel changes
  useEffect(() => {
    if (!activeChannel) return;

    // Fetch initial messages
    const fetchMsgs = async () => {
      try {
        const msgs = await fetchChannelMessages(activeChannel.id);
        const normalised = (msgs || []).map(m => ({
          ...m,
          sender: m.sender_id === user?.id ? 'You' : m.sender_name || 'Member'
        }));
        setMessages(normalised);
      } catch (err) {
        console.warn('Fetch messages error:', err);
      }
    };
    fetchMsgs();

    // Subscribe to real-time updates
    if (channelSubscription.current) {
      unsubscribe(channelSubscription.current);
    }

    channelSubscription.current = subscribeToChannelMessages(activeChannel.id, (newMsg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        const msg = { ...newMsg, sender: newMsg.sender_id === user?.id ? 'You' : newMsg.sender_name || 'Member' };
        return [...prev, msg].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
    });

    return () => {
      if (channelSubscription.current) {
        unsubscribe(channelSubscription.current);
      }
    };
  }, [activeChannel, user?.id]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChannel || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await sendChannelMessage(activeChannel.id, user.id, user.name || 'Explorer', text);
    } catch (err) {
      console.warn('Send message error:', err);
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender === 'You';
    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
        {!isMe && <Text style={styles.senderName}>{item.sender}</Text>}
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>{item.content}</Text>
          <Text style={styles.msgTime}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E86AB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* Header with Community Name */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{community_name}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Channel Switcher */}
      <View style={styles.channelBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.channelScroll}>
          {channels.map(channel => (
            <TouchableOpacity 
              key={channel.id} 
              style={[styles.channelBtn, activeChannel?.id === channel.id && styles.activeChannelBtn]}
              onPress={() => setActiveChannel(channel)}
            >
              <Text style={[styles.channelBtnText, activeChannel?.id === channel.id && styles.activeChannelBtnText]}>
                # {channel.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Message List */}
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.msgList}
      />

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder={`Message #${activeChannel?.name || 'channel'}`}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  channelBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  channelScroll: { paddingHorizontal: 16, paddingVertical: 10 },
  channelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  activeChannelBtn: { backgroundColor: '#2E86AB' },
  channelBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  activeChannelBtnText: { color: '#fff' },
  msgList: { padding: 16, paddingBottom: 32 },
  msgWrapper: { marginBottom: 16, maxWidth: '85%' },
  myMsgWrapper: { alignSelf: 'flex-end' },
  theirMsgWrapper: { alignSelf: 'flex-start' },
  senderName: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4, marginLeft: 4 },
  bubble: { borderRadius: 18, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  myBubble: { backgroundColor: '#2E86AB', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#1E293B' },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end', opacity: 0.7 },
  inputArea: {
    padding: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E86AB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
});
