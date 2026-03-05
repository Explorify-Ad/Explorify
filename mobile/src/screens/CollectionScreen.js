import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Collection screen - displays landmarks the user has visited.
 * @param {object} props - Component props
 * @param {object} props.navigation - React Navigation object
 * @returns {React.Component} Collection screen component
 */
export default function CollectionScreen({ navigation }) {
  // TODO: Fetch user's visited landmarks
  // TODO: Display collection as a list/grid
  // TODO: Show total points
  // TODO: Add sorting and filtering options
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>My Collection</Text>
      <Text style={styles.hint}>Your visited landmarks will appear here</Text>
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
