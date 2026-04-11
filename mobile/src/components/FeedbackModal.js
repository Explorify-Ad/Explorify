import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
// import { BlurView } from 'expo-blur'; // Removing to fix bundling error
import { LinearGradient } from 'expo-linear-gradient';

export default function FeedbackModal({ visible, landmark, onValue, onCancel }) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  const stars = [1, 2, 3, 4, 5];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        
        <LinearGradient
          colors={['#7E22CE', '#3B82F6']}
          style={styles.container}
        >
          <Text style={[styles.title, { color: '#fff' }]}>How was {landmark?.name}?</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>Your feedback helps us refine your future routes!</Text>

          <View style={styles.starsContainer}>
            {stars.map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Text style={[styles.star, rating >= s && styles.starActive]}>
                  {rating >= s ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Any specific thoughts? (Optional)"
            placeholderTextColor="#cbd5e1"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: 'rgba(255,255,255,0.6)' }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitBtn, !rating && styles.submitBtnDisabled, { backgroundColor: '#fff' }]} 
              onPress={() => onValue({ rating, notes })}
              disabled={!rating}
            >
              <Text style={[styles.submitText, { color: '#7E22CE' }]}>Earn +20 XP</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', borderRadius: 24, padding: 24, elevation: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 24, textAlign: 'center', lineHeight: 18 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  star: { fontSize: 32, color: '#cbd5e1' },
  starActive: { color: '#f59e0b' },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    height: 100, 
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    color: '#1e293b'
  },
  buttonRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  submitBtn: { 
    flex: 2, 
    backgroundColor: '#2E86AB', 
    paddingVertical: 14, 
    borderRadius: 14, 
    alignItems: 'center' 
  },
  submitBtnDisabled: { backgroundColor: '#cbd5e1' },
  submitText: { color: '#fff', fontWeight: '700' },
});
