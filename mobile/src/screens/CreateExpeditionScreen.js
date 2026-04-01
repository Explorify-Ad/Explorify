import React, { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Switch, Modal, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, ChevronDown, Plus, Minus, Building2, Utensils, Trees, Landmark, Palette, Music } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { createExpedition } from '../services/supabase';
import useStore from '../store/useStore';

const CORAL = '#FF6B6B';

const CATEGORIES = [
  { id: 'architecture', label: 'Architecture', Icon: Building2, bg: '#475569' },
  { id: 'food',         label: 'Food',         Icon: Utensils,  bg: '#ea580c' },
  { id: 'nature',       label: 'Nature',       Icon: Trees,     bg: '#16a34a' },
  { id: 'history',      label: 'History',      Icon: Landmark,  bg: '#d97706' },
  { id: 'art',          label: 'Art',          Icon: Palette,   bg: '#e11d48' },
  { id: 'nightlife',    label: 'Nightlife',    Icon: Music,     bg: '#7c3aed' },
];

const DURATIONS = ['30min', '1hr', '2hr', 'Half Day', 'Custom'];

const COMPANY_TYPES = [
  { id: 'solo',      label: 'Solo',      icon: '🧍' },
  { id: 'duo',       label: 'Duo',       icon: '👫' },
  { id: 'family',    label: 'Family',    icon: '👨‍👩‍👧‍👦' },
  { id: 'friends',   label: 'Friends',   icon: '👥' },
  { id: 'community', label: 'Community', icon: '🏛️' },
];


export default function CreateExpeditionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const authUser = useStore((s) => s.authUser);
  const landmarks = route.params?.landmarks ?? [];

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [selected, setSelected]         = useState(new Set());
  const [groupSize, setGroupSize]       = useState(4);
  const [companyType, setCompanyType]   = useState('solo');
  const [duration, setDuration]         = useState('2hr');
  const [dnaOnly, setDnaOnly]           = useState(true);
  const [launching, setLaunching]       = useState(false);
  const [meetingPoint, setMeetingPoint] = useState(null);
  const [pickerOpen, setPickerOpen]     = useState(false);


  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const isValid = title.length > 0 && selected.size > 0;

  const handleLaunch = async () => {
    if (!isValid || launching) return;
    setLaunching(true);
    try {
      const exp = await createExpedition(authUser.id, authUser.name, {
        title,
        description,
        categories: [...selected],
        groupSize,
        companyType,
        duration,
        dnaOnly,
        landmarkId:   meetingPoint?.id   ?? null,
        landmarkName: meetingPoint?.name ?? null,
        landmarkLat:  meetingPoint?.lat  ?? null,
        landmarkLon:  meetingPoint?.lon  ?? null,
      });
      navigation.replace('ExpeditionChat', {
        expedition: {
          id: exp.id,
          title: exp.title,
          memberCount: 1,
          categories: exp.categories,
          landmark: meetingPoint ? { name: meetingPoint.name } : null,
        },
      });
    } catch (e) {
      console.warn('createExpedition error:', e.message);
      setLaunching(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Plan an Expedition</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <TextInput
          style={[styles.titleInput, { color: theme.textPrimary }]}
          placeholder="Give your trip a name..."
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={(t) => setTitle(t.slice(0, 60))}
          maxLength={60}
        />
        <TextInput
          style={[styles.descInput, { color: theme.textPrimary }]}
          placeholder="What's the vibe? (e.g. Chill coffee walk, Art hunting...)"
          placeholderTextColor={theme.textSecondary}
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, 140))}
          maxLength={140}
          multiline
        />
        <Text style={[styles.charCount, { color: theme.textSecondary }]}>{title.length} / 60</Text>


        {/* Theme picker */}
        <Text style={[styles.label, { color: theme.textPrimary }]}>What are you exploring?</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(({ id, label, Icon, bg }) => {
            const isSel = selected.has(id);
            return (
              <Pressable
                key={id}
                onPress={() => toggle(id)}
                style={[styles.catBtn, { backgroundColor: bg, opacity: isSel ? 1 : 0.65,
                  borderWidth: isSel ? 2 : 0, borderColor: CORAL }]}
              >
                <Icon size={24} color="white" strokeWidth={2} />
                <Text style={styles.catLabel}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Meeting point picker */}
        <Text style={[styles.label, { color: theme.textPrimary }]}>Meeting Point</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.pickerBtn, { borderColor: meetingPoint ? CORAL : 'rgba(0,0,0,0.12)' }]}
        >
          <MapPin size={18} color={meetingPoint ? CORAL : theme.textSecondary} strokeWidth={2} />
          <Text style={[styles.pickerText, { color: meetingPoint ? theme.textPrimary : theme.textSecondary, flex: 1 }]}
            numberOfLines={1}>
            {meetingPoint ? meetingPoint.name : 'Select a nearby landmark…'}
          </Text>
          <ChevronDown size={16} color={theme.textSecondary} strokeWidth={2} />
        </Pressable>

        <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)} />
          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.pickerHandle} />
            <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>Choose a meeting spot</Text>
            {landmarks.length === 0 ? (
              <Text style={[styles.pickerEmpty, { color: theme.textSecondary }]}>No landmarks nearby</Text>
            ) : (
              <FlatList
                data={landmarks}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.pickerItem, meetingPoint?.id === item.id && { backgroundColor: `${CORAL}12` }]}
                    onPress={() => { setMeetingPoint(item); setPickerOpen(false); }}
                  >
                    <View style={[styles.pickerDot, { backgroundColor:
                      item.tier === 'hidden' ? '#3D2B8E' : item.tier === 'discovered' ? '#00C9B1' : '#F5A623' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemName, { color: theme.textPrimary }]}>{item.name}</Text>
                      {item.tier && (
                        <Text style={[styles.pickerItemSub, { color: theme.textSecondary }]}>
                          {item.tier.charAt(0).toUpperCase() + item.tier.slice(1)}
                        </Text>
                      )}
                    </View>
                    {meetingPoint?.id === item.id && (
                      <Text style={{ color: CORAL, fontWeight: '700', fontSize: 18 }}>✓</Text>
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>
        </Modal>

        {/* Company Type */}
        <Text style={[styles.label, { color: theme.textPrimary }]}>Who are you with?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.companyRow}>
          {COMPANY_TYPES.map((ct) => (
            <Pressable
              key={ct.id}
              onPress={() => {
                setCompanyType(ct.id);
                // Adjust group size baseline based on company type
                if (ct.id === 'solo') setGroupSize(1);
                else if (ct.id === 'duo') setGroupSize(2);
                else if (ct.id === 'family') setGroupSize(4);
                else if (ct.id === 'community') setGroupSize(8);
              }}
              style={[styles.companyChip,
                companyType === ct.id
                  ? { backgroundColor: CORAL, borderColor: CORAL }
                  : { backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.1)' }]}
            >
              <Text style={{ fontSize: 16, marginRight: 6 }}>{ct.icon}</Text>
              <Text style={[styles.companyText,
                { color: companyType === ct.id ? 'white' : theme.textPrimary }]}>
                {ct.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Group size */}

        <Text style={[styles.label, { color: theme.textPrimary }]}>Group Size</Text>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => setGroupSize(Math.max(2, groupSize - 1))}
            style={[styles.stepBtn, { borderColor: 'rgba(0,0,0,0.1)' }]}
            disabled={groupSize <= 2}
          >
            <Minus size={20} color={theme.textPrimary} />
          </Pressable>
          <View style={styles.stepCount}>
            <Text style={[styles.stepNum, { color: theme.textPrimary }]}>{groupSize}</Text>
            <Text style={[styles.stepSub, { color: theme.textSecondary }]}>spots</Text>
          </View>
          <Pressable
            onPress={() => setGroupSize(Math.min(12, groupSize + 1))}
            style={[styles.stepBtn, { borderColor: 'rgba(0,0,0,0.1)' }]}
            disabled={groupSize >= 12}
          >
            <Plus size={20} color={theme.textPrimary} />
          </Pressable>
        </View>

        {/* Duration */}
        <Text style={[styles.label, { color: theme.textPrimary }]}>Duration</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.durationRow}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDuration(d)}
              style={[styles.durationChip,
                duration === d
                  ? { backgroundColor: CORAL, borderColor: CORAL }
                  : { backgroundColor: 'transparent', borderColor: 'rgba(0,0,0,0.12)' }]}
            >
              <Text style={[styles.durationText,
                { color: duration === d ? 'white' : theme.textSecondary }]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* DNA toggle */}
        <View style={styles.dnaCard}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.dnaTitle, { color: theme.textPrimary }]}>Match by DNA only</Text>
            <Text style={[styles.dnaSub, { color: theme.textSecondary }]}>
              Only show this to explorers whose profile fits your theme. Recommended.
            </Text>
          </View>
          <Switch value={dnaOnly} onValueChange={setDnaOnly} trackColor={{ true: CORAL }} />
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={[styles.previewHint, { color: theme.textSecondary }]}>
            This is how others will see you on the map
          </Text>
          <View style={styles.previewMarker}>
            <View style={styles.previewInner}>
              <Text style={styles.previewAvatar}>E</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Launch button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={handleLaunch}
          disabled={!isValid || launching}
          style={[styles.launchBtn, { opacity: isValid && !launching ? 1 : 0.45 }]}
        >
          {launching
            ? <ActivityIndicator color="white" />
            : <Text style={styles.launchText}>Launch Expedition</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDFAF5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  closeBtn: { padding: 8 },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  titleInput: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  descInput: { fontSize: 16, marginBottom: 8, minHeight: 40 },
  charCount: { fontSize: 11, textAlign: 'right', marginBottom: 24 },


  label: { fontSize: 14, fontWeight: '600', marginBottom: 12 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  catBtn: {
    width: '47%', borderRadius: 18, paddingVertical: 16,
    alignItems: 'center', gap: 8,
  },
  catLabel: { color: 'white', fontSize: 13, fontWeight: '500' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 24,
  },
  pickerText: { fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pickerSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 12, maxHeight: '60%',
  },
  pickerHandle: {
    width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 14,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12,
  },
  pickerDot: { width: 12, height: 12, borderRadius: 6 },
  pickerItemName: { fontSize: 14, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, marginTop: 1 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 28, marginBottom: 24 },
  stepBtn: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'white',
  },
  stepCount: { alignItems: 'center' },
  stepNum: { fontSize: 40, fontWeight: '700' },
  stepSub: { fontSize: 12 },

  companyRow: { marginBottom: 24 },
  companyChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    borderWidth: 1, marginRight: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  companyText: { fontSize: 14, fontWeight: '600' },


  durationRow: { marginBottom: 24 },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100,
    borderWidth: 1, marginRight: 8,
  },
  durationText: { fontSize: 13, fontWeight: '500' },

  dnaCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 20, padding: 16, marginBottom: 20,
  },
  dnaTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  dnaSub: { fontSize: 12 },

  previewCard: {
    backgroundColor: 'rgba(255,107,107,0.06)', borderRadius: 20, padding: 16,
    alignItems: 'center', marginBottom: 8,
  },
  previewHint: { fontSize: 12, marginBottom: 12 },
  previewMarker: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF6B6B',
    borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  previewInner: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F5A623', borderWidth: 1, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },
  previewAvatar: { color: 'white', fontSize: 11, fontWeight: '700' },

  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)',
  },
  launchBtn: {
    height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF6B6B',
  },
  launchText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
