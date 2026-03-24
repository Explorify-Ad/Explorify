import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

/**
 * Profile screen - displays user info and settings.
 * @param {object} props - Component props
 * @param {object} props.navigation - React Navigation object
 * @returns {React.Component} Profile screen component
 */
export default function ProfileScreen({ navigation }) {
  const [visitorType, setVisitorType] = useState('tourist');

  const types = [
    { id: 'tourist', label: '✈️ Tourist', desc: 'Prioritizes iconic landmarks and highlights.' },
    { id: 'local', label: '🏠 Local', desc: 'Avoids crowds, surfaces hidden gems and off-the-beaten-path spots.' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>JD</Text>
        </View>
        <Text style={styles.username}>John Doe</Text>
        <Text style={styles.points}>1,240 Points • Explorer Level</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visitor Type</Text>
        <Text style={styles.sectionSubtitle}>Select your persona to adapt your experience</Text>
        
        {types.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.option,
              visitorType === type.id && styles.optionActive
            ]}
            onPress={() => setVisitorType(type.id)}
          >
            <View>
              <Text style={[
                styles.optionLabel,
                visitorType === type.id && styles.optionLabelActive
              ]}>
                {type.label}
              </Text>
              <Text style={[
                styles.optionDesc,
                visitorType === type.id && styles.optionDescActive
              ]}>
                {type.desc}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E86AB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  points: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  option: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  optionActive: {
    borderColor: '#2E86AB',
    backgroundColor: '#EEF6FA',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionLabelActive: {
    color: '#2E86AB',
  },
  optionDesc: {
    fontSize: 13,
    color: '#666',
  },
  optionDescActive: {
    color: '#5B9FBD',
  },
  logoutButton: {
    marginTop: 'auto',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
});
