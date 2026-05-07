import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, Animated, ScrollView,
  TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MoreVertical, MapPin, Send, Users, LogOut, StopCircle, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import {
  OwnMessage, OtherMessage, CheckInShare,
  WaypointVote, SystemMessage,
} from '../components/explorify/ChatBubbles';
import {
  fetchMessages, sendMessage, subscribeToMessages, unsubscribe,
  leaveExpedition, updateExpeditionStatus, fetchExpeditionMembers,
} from '../services/supabase';
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
  const [menuOpen, setMenuOpen]   = useState(false);
  const [members, setMembers]     = useState([]);
  const menuY                     = useRef(new Animated.Value(300)).current;
  const menuOverlay               = useRef(new Animated.Value(0)).current;
  const channelRef                = useRef(null);

  const isCreator = authUser?.id === expedition.created_by;

  const openMenu = () => {
    setMenuOpen(true);
    fetchExpeditionMembers(expedition.id).then(setMembers).catch(() => {});
    Animated.parallel([
      Animated.spring(menuY, { toValue: 0, damping: 24, stiffness: 260, useNativeDriver: true }),
      Animated.timing(menuOverlay, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuY, { toValue: 300, duration: 220, useNativeDriver: true }),
      Animated.timing(menuOverlay, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setMenuOpen(false));
  };

  const handleLeave = () => {
    closeMenu();
    Alert.alert(
      'Leave Expedition',
      'You will no longer receive messages from this expedition.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive',
          onPress: async () => {
            try {
              await leaveExpedition(expedition.id, authUser.id);
              navigation.goBack();
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ],
    );
  };

  const handleEnd = () => {
    closeMenu();
    Alert.alert(
      'End Expedition',
      'This will close the expedition for all members. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Expedition', style: 'destructive',
          onPress: async () => {
            try {
              await updateExpeditionStatus(expedition.id, 'ended');
              navigation.goBack();
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ],
    );
  };

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
          <Pressable style={styles.headerBtn} onPress={openMenu}>
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
      {/* ── Expedition menu ──────────────────────────────────── */}
      {menuOpen && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, styles.menuOverlay, { opacity: menuOverlay }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          </Animated.View>

          <Animated.View style={[styles.menuSheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: menuY }] }]}>
            <View style={styles.menuHandle} />

            {/* Members list */}
            <Text style={styles.menuSectionTitle}>Members ({members.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {members.map((m, i) => (
                <View key={m.user_id ?? i} style={styles.menuMemberItem}>
                  <View style={[styles.menuMemberAvatar, { backgroundColor: CORAL }]}>
                    <Text style={styles.menuMemberAvatarText}>{m.user_name?.[0] ?? '?'}</Text>
                  </View>
                  <Text style={styles.menuMemberName} numberOfLines={1}>{m.user_name ?? 'Explorer'}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.menuDivider} />

            {/* Actions */}
            {!isCreator && (
              <Pressable style={styles.menuAction} onPress={handleLeave}>
                <View style={[styles.menuActionIcon, { backgroundColor: '#FEF2F2' }]}>
                  <LogOut size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuActionTitle, { color: '#EF4444' }]}>Leave Expedition</Text>
                  <Text style={styles.menuActionSub}>You won't receive further messages</Text>
                </View>
              </Pressable>
            )}

            {isCreator && (
              <Pressable style={styles.menuAction} onPress={handleEnd}>
                <View style={[styles.menuActionIcon, { backgroundColor: '#FEF2F2' }]}>
                  <StopCircle size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuActionTitle, { color: '#EF4444' }]}>End Expedition</Text>
                  <Text style={styles.menuActionSub}>Closes expedition for all members</Text>
                </View>
              </Pressable>
            )}

            <Pressable style={styles.menuCancel} onPress={closeMenu}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </>
      )}
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

  // Expedition menu
  menuOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 },
  menuSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
    backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  menuHandle: {
    width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  menuSectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 10,
  },
  menuMemberItem: { alignItems: 'center', gap: 6, width: 56 },
  menuMemberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  menuMemberAvatarText: { color: 'white', fontWeight: '700', fontSize: 16 },
  menuMemberName: { fontSize: 10, color: '#6B7280', fontWeight: '500', textAlign: 'center' },
  menuDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 20, marginBottom: 8 },
  menuAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  menuActionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  menuActionTitle: { fontSize: 15, fontWeight: '600' },
  menuActionSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  menuCancel: {
    alignItems: 'center', paddingVertical: 16,
    marginHorizontal: 20, marginTop: 4,
    borderRadius: 16, backgroundColor: '#f9fafb',
  },
  menuCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
