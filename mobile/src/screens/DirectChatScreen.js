import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MapPin, MoreVertical } from 'lucide-react-native';
import useStore from '../store/useStore';
import { fetchDirectMessages, sendDirectMessage, subscribeToDMs, unsubscribe } from '../services/supabase';
import { useTheme } from '../context/ThemeContext';

export default function DirectChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { peer_id, peer_name } = route.params;
  const authUser = useStore(s => s.authUser);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef(null);
  const flatListRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!authUser?.id || !peer_id) return;
    try {
      const msgs = await fetchDirectMessages(authUser.id, peer_id);
      setMessages(msgs || []);
    } catch (err) {
      console.warn('Load direct messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, peer_id]);

  useEffect(() => {
    loadMessages();

    // Subscribe to new DMs
    subscriptionRef.current = subscribeToDMs(authUser.id, (newMsg) => {
      // Only add if it's from the current peer
      if (newMsg.sender_id === peer_id) {
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    return () => {
      if (subscriptionRef.current) unsubscribe(subscriptionRef.current);
    };
  }, [loadMessages, authUser.id, peer_id]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic update
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: authUser.id,
      dm_peer_id: peer_id,
      content: text,
      sender_name: authUser.name,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const saved = await sendDirectMessage(authUser.id, authUser.name, peer_id, text);
      // Update with real message
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } catch (err) {
      console.warn('Send direct message error:', err);
      // Remove optimistic if failed
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === authUser.id;
    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
        <View style={[styles.bubble, isMe ? [styles.myBubble, { backgroundColor: theme.primary }] : styles.theirBubble]}>
          <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>{item.content}</Text>
          <Text style={[styles.msgTime, isMe ? styles.myMsgTime : styles.theirMsgTime]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{peer_name?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.headerTitle}>{peer_name}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <MoreVertical size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 20 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.inputIconBtn}>
          <MapPin size={22} color="#94A3B8" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !inputText.trim() ? styles.sendBtnDisabled : { backgroundColor: theme.primary }]}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBtn: { padding: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 13, fontWeight: '800' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  msgWrapper: { marginBottom: 12, maxWidth: '80%' },
  myMsgWrapper: { alignSelf: 'flex-end' },
  theirMsgWrapper: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#1E293B' },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myMsgTime: { color: 'rgba(255,255,255,0.7)' },
  theirMsgTime: { color: '#94A3B8' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputIconBtn: { padding: 8 },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    fontSize: 15,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E2E8F0' },
});
