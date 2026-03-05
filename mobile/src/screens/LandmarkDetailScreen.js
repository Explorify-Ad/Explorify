import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Landmark detail screen - shows detailed info about a landmark.
 * @param {object} props - Component props
 * @param {object} props.navigation - React Navigation object
 * @param {object} props.route - Route params containing landmark data
 * @returns {React.Component} Landmark detail screen component
 */
export default function LandmarkDetailScreen({ navigation, route }) {
  // TODO: Display landmark details (name, description, category)
  // TODO: Show landmark on mini-map
  // TODO: Add "I visited this!" button
  // TODO: Show accessibility information
  // TODO: Add rating and notes input
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Landmark Details</Text>
      <Text style={styles.hint}>Detailed landmark information and actions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E86AB',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
