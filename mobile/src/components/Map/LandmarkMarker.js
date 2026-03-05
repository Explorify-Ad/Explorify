import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * LandmarkMarker component - custom marker for map landmarks.
 * @param {object} props - Component props
 * @param {object} props.landmark - Landmark data
 * @param {boolean} props.isVisited - Whether the user has visited this landmark
 * @returns {React.Component} LandmarkMarker component
 */
export default function LandmarkMarker({ landmark, isVisited = false }) {
  // TODO: Integrate with MapView.Marker
  // TODO: Add category-specific icons
  return (
    <View style={[styles.marker, isVisited && styles.visited]}>
      <Text style={styles.emoji}>📍</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    backgroundColor: '#2E86AB',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  visited: {
    backgroundColor: '#2ECC71',
  },
  emoji: {
    fontSize: 16,
  },
});
