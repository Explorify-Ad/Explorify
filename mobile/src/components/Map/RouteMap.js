import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * RouteMap component - displays a route on the map.
 * @param {object} props - Component props
 * @param {Array} props.landmarks - Landmarks in the route
 * @param {object} props.userLocation - User's current location
 * @returns {React.Component} RouteMap component
 */
export default function RouteMap({ landmarks = [], userLocation }) {
  // TODO: Integrate React Native Maps
  // TODO: Draw route polylines between landmarks
  // TODO: Add user location marker
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Route Map Component</Text>
      <Text style={styles.info}>{landmarks.length} landmarks in route</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f4f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    margin: 8,
  },
  placeholder: {
    fontSize: 16,
    color: '#2E86AB',
    fontWeight: '600',
  },
  info: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
