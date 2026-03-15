import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, Animated, ScrollView,
  TextInput, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MoreVertical, MapPin, Send } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import {
  OwnMessage, OtherMessage, CheckInShare,
  WaypointVote, SystemMessage,
} from '../components/explorify/ChatBubbles';
import { fetchMessages, sendMessage, subscribeToMessages, unsubscribe } from '../services/supabase';
import useStore from '../store/useStore';

const CORAL = '#FF6B6B';

export default function ExpeditionChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();
  const scrollRef = useRef(null);

  const authUser = useStore((s) => s.authUser);

  const expedition = route.params?.expedition ?? {
    title: 'Art Nouveau Walk',
    memberCount: 4,
    landmark: { name: 'Palais Garnier', distance: '120m' },
  };

  const [messages, setMessages]   = useState([]);
  const [message, setMessage]     = useState('');
  const [sending, setSending]     = useState(false);
  const channelRef                = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!expedition.id) return;
    try {
      const data = await fetchMessages(expedition.id);
      setMessages(data);
    } catch (e) {
      console.warn('fetchMessages error:', e.message);
    }
  }, [expedition.id]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending || !expedition.id) return;
    setSending(true);
    setMessage('');
    // Optimistically add message so it appears immediately
    const optimistic = {
      id: `opt-${Date.now()}`,
      expedition_id: expedition.id,
      sender_id: authUser.id,
      sender_name: authUser.name,
      content: text,
      type: 'text',
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const saved = await sendMessage(expedition.id, authUser.id, authUser.name, text);
      // Replace optimistic entry with the persisted one (has real UUID)
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m));
    } catch (e) {
      console.warn('sendMessage error:', e.message);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  // Pulsing member dots in mini-map strip
  const dotAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current;
  // Blinking LIVE badge
  const liveOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setMode('expedition');

    dotAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
      ).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(liveOpacity, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(liveOpacity, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ]),
    ).start();

    // Load initial messages and subscribe to new ones
    loadMessages();
    if (expedition.id) {
      channelRef.current = subscribeToMessages(expedition.id, (newMsg) => {
        // Deduplicate: skip if we already have this message (e.g. own optimistic send)
        setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      });
    }

    return () => {
      setMode('exploration');
      if (channelRef.current) unsubscribe(channelRef.current);
    };
  }, [loadMessages]);

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (msg) => {
    const time = formatTime(msg.created_at);
    if (msg.type === 'system') {
      return <SystemMessage key={msg.id} text={msg.content} />;
    }
    if (msg.type === 'check_in') {
      return <CheckInShare key={msg.id} sender={msg.sender_name} landmark={msg.metadata?.landmark ?? { name: msg.content, xp: 0, category: '', color: '#64748b' }} time={time} />;
    }
    if (msg.type === 'vote') {
      return <WaypointVote key={msg.id} options={msg.metadata?.options ?? []} totalVotes={msg.metadata?.totalVotes ?? 0} onVote={() => {}} />;
    }
    if (msg.sender_id === authUser?.id) {
      return <OwnMessage key={msg.id} text={msg.content} time={time} />;
    }
    return <OtherMessage key={msg.id} sender={msg.sender_name} text={msg.content} time={time} />;
  };

  const DOT_POSITIONS = [
    { left: '20%', top: '30%' }, { left: '35%', top: '55%' },
    { left: '52%', top: '40%' }, { left: '45%', top: '65%' },
  ];

  const HUD_TOP = insets.top + 56;   // header height
  const STRIP_H = 88;                // mini-map strip height
  const PINNED_BOTTOM = 80 + insets.bottom + 64; // above input bar

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={20} color={theme.textPrimary} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {expedition.title}
        </Text>
        <View style={styles.headerRight}>
          <View style={styles.memberPill}>
            <Text style={styles.memberPillText}>{expedition.memberCount} explorers</Text>
          </View>
          <Pressable style={styles.headerBtn}>
            <MoreVertical size={20} color={theme.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* Mini-map strip */}
      <View style={[styles.strip, { top: HUD_TOP }]}>
        {/* Grid lines */}
        <View style={styles.stripGrid} />
        {/* Animated member dots */}
        {DOT_POSITIONS.map((pos, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, {
              left: pos.left, top: pos.top,
              transform: [{ scale: dotAnims[i] }],
            }]}
          />
        ))}
        {/* LIVE badge */}
        <Animated.View style={[styles.liveBadge, { opacity: liveOpacity }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </Animated.View>
      </View>

      {/* Chat area */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.chat, {
          paddingTop: HUD_TOP + STRIP_H + 8,
          paddingBottom: PINNED_BOTTOM + 20,
        }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && expedition.id && (
          <SystemMessage text="Expedition started — say hello!" />
        )}
        {messages.map(renderMessage)}
      </ScrollView>

      {/* Pinned landmark bar */}
      <View style={[styles.pinnedBar, { bottom: 80 + insets.bottom + 8 }]}>
        <View style={styles.pinnedLeft}>
          <MapPin size={16} color={CORAL} strokeWidth={2} />
          <Text style={styles.pinnedName}>{expedition.landmark?.name}</Text>
        </View>
        <View style={styles.pinnedDist}>
          <Text style={styles.pinnedDistText}>{expedition.landmark?.distance}</Text>
        </View>
      </View>

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.inputIconBtn}>
          <MapPin size={20} color={theme.textSecondary} strokeWidth={2} />
        </Pressable>
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder="Say something or share a spot..."
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
        />
        <Pressable
          onPress={handleSend}
          disabled={!message.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: message.trim() ? CORAL : 'rgba(0,0,0,0.06)' }]}
        >
          <Send size={18} color={message.trim() ? 'white' : theme.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDFAF5' },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  headerBtn: { padding: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  memberPill: {
    backgroundColor: CORAL, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  memberPillText: { color: 'white', fontSize: 11, fontWeight: '600' },

  strip: {
    position: 'absolute', left: 16, right: 16, height: 80, zIndex: 20,
    backgroundColor: 'rgba(255,240,240,0.9)', borderRadius: 20, overflow: 'hidden',
  },
  stripGrid: {
    ...StyleSheet.absoluteFillObject,
    // Simulated grid using opacity pattern
    opacity: 0.4,
  },
  dot: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    backgroundColor: CORAL, shadowColor: CORAL,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 4,
  },
  liveBadge: {
    position: 'absolute', top: 8, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: CORAL, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' },
  liveText: { color: 'white', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  chat: { paddingHorizontal: 16 },

  pinnedBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,107,107,0.14)', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10, zIndex: 20,
  },
  pinnedLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinnedName: { fontSize: 14, fontWeight: '600', color: CORAL },
  pinnedDist: {
    backgroundColor: 'rgba(255,107,107,0.2)', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pinnedDistText: { fontSize: 12, fontWeight: '500', color: CORAL },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)',
  },
  inputIconBtn: { padding: 6 },
  input: {
    flex: 1, fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
