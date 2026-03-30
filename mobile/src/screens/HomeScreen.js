import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * Home screen - main landing page of the app.
 * Displays navigation options and quick stats.
 * @param {object} props - Component props
 * @param {object} props.navigation - React Navigation object
 * @returns {React.Component} Home screen component
 */
export default function HomeScreen({ navigation }) {
  // TODO: Add user greeting with display name
  // TODO: Add quick stats (points, landmarks visited)
  // TODO: Add weather widget
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Explorify!</Text>
      <Text style={styles.subtitle}>Discover Dublin's best landmarks</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Map')}
        >
          <Text style={styles.buttonText}>🗺️ Explore Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('RouteBuilder')}
        >
          <Text style={styles.buttonText}>🚶 Build Route</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Collection')}
        >
          <Text style={styles.buttonText}>⭐ My Collection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Group')}
        >
          <Text style={styles.buttonText}>👥 Travel Together</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.buttonText}>👤 Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#2E86AB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
