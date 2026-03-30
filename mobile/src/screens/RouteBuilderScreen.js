import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Battery from 'expo-battery';
import api from '../services/api';

/**
 * Route builder screen - allows users to generate walking routes.
 * @param {object} props - Component props
 * @param {object} props.navigation - React Navigation object
 * @returns {React.Component} Route builder screen component
 */
export default function RouteBuilderScreen({ route, navigation }) {
  const { group_id } = route.params || {};
  const [groupContext, setGroupContext] = useState('solo');
  const [visitorType, setVisitorType] = useState('tourist');
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function getBattery() {
      const level = await Battery.getBatteryLevelAsync();
      setVisitorType(prev => prev); // dummy to trigger re-render if needed
      setBatteryLevel(level);
    }
    getBattery();

    const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryLevel(batteryLevel);
    });

    return () => subscription.remove();
  }, []);

  const contexts = [
    { id: 'solo', label: '🧍 Solo' },
    { id: 'kids', label: '👨‍👩‍👧‍👦 With Kids' },
    { id: 'elderly', label: '🧓 Elderly' },
    { id: 'large_group', label: '👥 Large Group' },
  ];

  const visitorTypes = [
    { id: 'tourist', label: '✈️ Tourist' },
    { id: 'local', label: '🏠 Local' },
  ];

  const handleGenerateRoute = async () => {
    setLoading(true);
    try {
      const response = await api.post('/routes/generate', {
        start_lat: 53.3498, // Dublin placeholder
        start_lng: -6.2603,
        time_budget_min: 120,
        group_id: group_id,
        preferences: {
          group_context: groupContext,
          visitor_type: visitorType,
          current_hour: new Date().getHours(),
          battery_level: Math.round(batteryLevel * 100),
        }
      });
      console.log('Generated Route:', response.data);
      Alert.alert('Success', `Route generated for ${visitorType} with ${groupContext.replace('_', ' ')} context${group_id ? ' (Group Mode)' : ''}.`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to generate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Route Builder</Text>

      {group_id && (
        <View style={styles.groupModeBanner}>
          <Text style={styles.groupModeText}>👥 Group Sync Active: Merging preferences... </Text>
        </View>
      )}

      {batteryLevel < 0.2 && (
        <View style={styles.batteryWarning}>
          <Text style={styles.batteryWarningTitle}>⚠️ Optimization: Battery Low ({Math.round(batteryLevel * 100)}%)</Text>
          <Text style={styles.batteryWarningText}>
            We've adjusted your route to be shorter and closer to your current location to save power.
          </Text>
        </View>
      )}
      
      <Text style={styles.sectionTitle}>I am a...</Text>
      <View style={styles.chipContainer}>
        {visitorTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.chip,
              visitorType === type.id && styles.chipActive
            ]}
            onPress={() => setVisitorType(type.id)}
          >
            <Text style={[
              styles.chipText,
              visitorType === type.id && styles.chipTextActive
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Who are you exploring with?</Text>
      <View style={styles.chipContainer}>
        {contexts.map((ctx) => (
          <TouchableOpacity
            key={ctx.id}
            style={[
              styles.chip,
              groupContext === ctx.id && styles.chipActive
            ]}
            onPress={() => setGroupContext(ctx.id)}
          >
            <Text style={[
              styles.chipText,
              groupContext === ctx.id && styles.chipTextActive
            ]}>
              {ctx.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.generateButton}
        onPress={handleGenerateRoute}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.generateButtonText}>🚀 Generate Route</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    marginLeft: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#2E86AB',
    borderColor: '#2E86AB',
  },
  chipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  generateButton: {
    backgroundColor: '#E76F51',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  batteryWarning: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEEBA',
    marginBottom: 24,
  },
  batteryWarningTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  batteryWarningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  groupModeBanner: {
    backgroundColor: '#D1ECF1',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BEE5EB',
    marginBottom: 20,
    alignItems: 'center',
  },
  groupModeText: {
    color: '#0C5460',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
