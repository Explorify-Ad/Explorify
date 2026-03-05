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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
});
