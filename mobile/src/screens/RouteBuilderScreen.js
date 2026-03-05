import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Route builder screen - allows users to generate walking routes.
 * @param {object} props - Component props
 * @param {object} props.navigation - React Navigation object
 * @returns {React.Component} Route builder screen component
 */
export default function RouteBuilderScreen({ navigation }) {
  // TODO: Add time budget selector
  // TODO: Add category filter chips
  // TODO: Add accessibility preference toggle
  // TODO: Implement route generation
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Route Builder</Text>
      <Text style={styles.hint}>Configure your walking route preferences</Text>
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
