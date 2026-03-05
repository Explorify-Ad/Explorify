import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Map screen - displays landmarks on an interactive map.
 * @param {object} props - Component props
 * @param {object} props.navigation - React Navigation object
 * @returns {React.Component} Map screen component
 */
export default function MapScreen({ navigation }) {
  // TODO: Integrate React Native Maps
  // TODO: Display landmark markers
  // TODO: Show user location
  // TODO: Add landmark filtering
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Map View</Text>
      <Text style={styles.hint}>React Native Maps integration coming soon</Text>
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
