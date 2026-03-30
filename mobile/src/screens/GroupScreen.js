import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import api from '../services/api';

export default function GroupScreen({ navigation }) {
  const [inviteCode, setInviteCode] = useState('');
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    setLoading(true);
    try {
      const response = await api.post('/groups');
      setGroup(response.data.data);
      Alert.alert('Group Created', `Invite Code: ${response.data.data.invite_code}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode) return;
    setLoading(true);
    try {
      const response = await api.post('/groups/join', { invite_code: inviteCode });
      setGroup({ id: response.data.data.group_id, invite_code: inviteCode });
      Alert.alert('Joined', 'You have joined the group!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Invalid invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Travel Together</Text>
      <Text style={styles.subtitle}>Merge your preferences with your friends for a collective experience.</Text>

      {!group ? (
        <View style={styles.actionCard}>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup} disabled={loading}>
            <Text style={styles.buttonText}>➕ Create New Group</Text>
          </TouchableOpacity>
          
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.line} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter Invite Code (e.g. AB1234)"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.joinButton} onPress={handleJoinGroup} disabled={loading}>
            <Text style={styles.buttonText}>🤝 Join Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>Active Group Session</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>INVITE CODE</Text>
            <Text style={styles.codeText}>{group.invite_code}</Text>
          </View>
          <Text style={styles.statusText}>
            The system is now combining the preferences and behavioral data of all members.
          </Text>
          
          <TouchableOpacity 
            style={styles.startRouteButton} 
            onPress={() => navigation.navigate('RouteBuilder', { group_id: group.id })}
          >
            <Text style={styles.buttonText}>🚶 Build Group Route</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.leaveButton} onPress={() => setGroup(null)}>
            <Text style={styles.leaveText}>Leave Group</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E86AB',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  createButton: {
    backgroundColor: '#2E86AB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#E76F51',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  codeBox: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#2E86AB',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  codeLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2E86AB',
    letterSpacing: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  startRouteButton: {
    backgroundColor: '#2E86AB',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  leaveButton: {
    padding: 10,
  },
  leaveText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
});
