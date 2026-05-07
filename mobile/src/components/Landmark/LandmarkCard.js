import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * LandmarkCard component - displays a landmark in a card format.
 * @param {object} props - Component props
 * @param {object} props.landmark - Landmark data
 * @param {function} props.onPress - Press handler
 * @returns {React.Component} LandmarkCard component
 */
export default function LandmarkCard({ landmark, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{landmark.name}</Text>
        <Text style={styles.points}>{landmark.points} pts</Text>
      </View>
      <Text style={styles.category}>{landmark.category}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {landmark.description}
      </Text>
      {landmark.reasons && landmark.reasons.length > 0 && (
        <View style={styles.reasonsContainer}>
          {landmark.reasons.map((reason, idx) => (
            <View key={idx} style={styles.reasonTag}>
              <Text style={styles.reasonText}>✨ {reason}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.accessibility}>
          ♿ {landmark.accessibility_level}/5
        </Text>
        <Text style={styles.duration}>
          ⏱️ {landmark.avg_visit_duration_min} min
        </Text>
        <Text style={styles.indoor}>
          {landmark.is_indoor ? '🏠 Indoor' : '🌳 Outdoor'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  points: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F18F01',
  },
  category: {
    fontSize: 12,
    color: '#2E86AB',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  accessibility: {
    fontSize: 12,
    color: '#666',
  },
  duration: {
    fontSize: 12,
    color: '#666',
  },
  indoor: {
    fontSize: 12,
    color: '#666',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  reasonTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
});
