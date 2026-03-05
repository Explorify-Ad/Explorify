import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Profile screen - displays user info and settings.
 * @param {object} props - Component props
 * @param {object} props.navigation - React Navigation object
 * @returns {React.Component} Profile screen component
 */
export default function ProfileScreen({ navigation }) {
  // TODO: Display user profile data
  // TODO: Add preferences editor
  // TODO: Add accessibility settings
  // TODO: Add logout functionality
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>User Profile</Text>
      <Text style={styles.hint}>Manage your preferences and settings</Text>
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
