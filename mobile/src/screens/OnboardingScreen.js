import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { PrimaryAction } from '../components/explorify/Buttons';

const CATEGORIES = [
  { id: 'architecture', label: 'Architecture', icon: '🏛️', bg: '#64748b' },
  { id: 'food', label: 'Food', icon: '🍜', bg: '#f97316' },
  { id: 'nature', label: 'Nature', icon: '🌿', bg: '#22c55e' },
  { id: 'history', label: 'History', icon: '⚔️', bg: '#d97706' },
  { id: 'art', label: 'Art', icon: '🎨', bg: '#ec4899' },
  { id: 'nightlife', label: 'Nightlife', icon: '🎵', bg: '#7c3aed' },
];

export default function OnboardingScreen() {
  const [selected, setSelected] = useState(new Set());
  const navigation = useNavigation();
  const { theme } = useTheme();

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.surface }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* Card */}
        <View style={styles.card}>
          {/* Step dots */}
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i === 0 ? theme.primary : 'rgba(0,0,0,0.1)' }]}
              />
            ))}
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>What pulls you in?</Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            We'll build your city from this.
          </Text>

          {/* Grid */}
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
            onPress={() => selected.size > 0 && navigation.navigate('Main')}
            disabled={selected.size === 0}
            style={{ width: '100%' }}
          >
            Continue
          </PrimaryAction>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  catBtn: {
    width: '47%',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  catIcon: { fontSize: 30 },
  catLabel: { fontSize: 14, fontWeight: '500', color: 'white' },
});
