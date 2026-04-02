import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { PrimaryAction } from '../components/explorify/Buttons';
import useStore from '../store/useStore';

const CATEGORIES = [
  { id: 'architecture', label: 'Architecture', icon: '🏛️', bg: '#64748b' },
  { id: 'food',        label: 'Food',          icon: '🍜', bg: '#f97316' },
  { id: 'nature',      label: 'Nature',        icon: '🌿', bg: '#22c55e' },
  { id: 'history',     label: 'History',       icon: '⚔️', bg: '#d97706' },
  { id: 'art',         label: 'Art',           icon: '🎨', bg: '#ec4899' },
  { id: 'nightlife',   label: 'Nightlife',     icon: '🎵', bg: '#7c3aed' },
];

const VISITOR_TYPES = [
  {
    id: 'tourist',
    label: 'Visitor',
    icon: '🗺️',
    desc: "Here for a few days — show me the best this city has to offer.",
    bg: '#0D9488',
  },
  {
    id: 'local',
    label: 'Local',
    icon: '🏡',
    desc: "I live here — skip the tourist traps, surface the hidden gems.",
    bg: '#7c3aed',
  },
];

export default function OnboardingScreen() {
  const [step, setStep]               = useState(0);
  const [selected, setSelected]       = useState(new Set());
  const [visitorType, setVisitorType] = useState(null);

  const navigation        = useNavigation();
  const { theme }         = useTheme();
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleFinish = () => {
    completeOnboarding(Array.from(selected), 'Explorer', visitorType ?? 'tourist');
    navigation.navigate('Main');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.surface }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={styles.card}>

          {/* Step dots */}
          <View style={styles.dots}>
            {[0, 1].map((i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i === step ? theme.primary : 'rgba(0,0,0,0.1)' }]}
              />
            ))}
          </View>

          {/* ── Step 0: Interests ── */}
          {step === 0 && (
            <>
              <Text style={[styles.title, { color: theme.textPrimary }]}>What pulls you in?</Text>
              <Text style={[styles.sub, { color: theme.textSecondary }]}>
                We'll build your city from this.
              </Text>

              <View style={styles.grid}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selected.has(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggle(cat.id)}
                      style={[
                        styles.catBtn,
                        { backgroundColor: cat.bg, opacity: isSelected ? 1 : 0.68 },
                        isSelected && { borderWidth: 2.5, borderColor: 'white' },
                      ]}
                    >
                      <Text style={styles.catIcon}>{cat.icon}</Text>
                      <Text style={styles.catLabel}>{cat.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <PrimaryAction
                onPress={() => setStep(1)}
                disabled={selected.size === 0}
                style={{ width: '100%' }}
              >
                Continue
              </PrimaryAction>
            </>
          )}

          {/* ── Step 1: Visitor type ── */}
          {step === 1 && (
            <>
              <Text style={[styles.title, { color: theme.textPrimary }]}>How do you explore?</Text>
              <Text style={[styles.sub, { color: theme.textSecondary }]}>
                This shapes the routes we build for you.
              </Text>

              <View style={styles.typeList}>
                {VISITOR_TYPES.map((vt) => {
                  const isSel = visitorType === vt.id;
                  return (
                    <Pressable
                      key={vt.id}
                      onPress={() => setVisitorType(vt.id)}
                      style={[
                        styles.typeCard,
                        { borderColor: isSel ? vt.bg : 'rgba(0,0,0,0.08)',
                          backgroundColor: isSel ? `${vt.bg}12` : 'white' },
                      ]}
                    >
                      <View style={[styles.typeIconWrap, { backgroundColor: vt.bg }]}>
                        <Text style={styles.typeIcon}>{vt.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.typeLabel, { color: theme.textPrimary }]}>
                          {vt.label}
                        </Text>
                        <Text style={[styles.typeDesc, { color: theme.textSecondary }]}>
                          {vt.desc}
                        </Text>
                      </View>
                      <View style={[
                        styles.radioOuter,
                        { borderColor: isSel ? vt.bg : 'rgba(0,0,0,0.2)' },
                      ]}>
                        {isSel && <View style={[styles.radioInner, { backgroundColor: vt.bg }]} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.backRow}>
                <Pressable onPress={() => setStep(0)} style={styles.backBtn}>
                  <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
                </Pressable>
                <PrimaryAction
                  onPress={handleFinish}
                  disabled={!visitorType}
                  style={{ flex: 1 }}
                >
                  Let's explore
                </PrimaryAction>
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: '100%' },
  card: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.25)',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, textAlign: 'center', marginBottom: 28 },

  // Step 0
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  catBtn: { width: '47%', borderRadius: 20, padding: 16, alignItems: 'center', gap: 8 },
  catIcon: { fontSize: 30 },
  catLabel: { fontSize: 14, fontWeight: '500', color: 'white' },

  // Step 1
  typeList: { gap: 12, marginBottom: 28 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 18, borderWidth: 2, padding: 16,
  },
  typeIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  typeIcon: { fontSize: 22 },
  typeLabel: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  typeDesc: { fontSize: 12, lineHeight: 17 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 6 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 8 },
  backText: { fontSize: 15, fontWeight: '500' },
});
