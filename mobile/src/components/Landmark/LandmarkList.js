import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import LandmarkCard from './LandmarkCard';

/**
 * LandmarkList component - displays a scrollable list of landmarks.
 * @param {object} props - Component props
 * @param {Array} props.landmarks - Array of landmark objects
 * @param {function} props.onLandmarkPress - Handler when a landmark is tapped
 * @returns {React.Component} LandmarkList component
 */
export default function LandmarkList({ landmarks = [], onLandmarkPress }) {
  if (landmarks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No landmarks found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={landmarks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <LandmarkCard
          landmark={item}
          onPress={() => onLandmarkPress?.(item)}
        />
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
