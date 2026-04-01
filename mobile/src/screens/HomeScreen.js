import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';


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
          onPress={() => navigation.navigate('Quest')}
        >
          <Text style={styles.buttonText}>🏆 Quests & Rewards</Text>
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

        {/* Community Highlight */}
        <TouchableOpacity
          style={styles.communityCard}
          onPress={() => navigation.navigate('Quests')}
        >
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            style={styles.communityInner}
          >
            <View style={styles.communityHeader}>
              <Text style={styles.communityTitle}>Community Hub</Text>
              <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
            </View>
            <Text style={styles.communitySub}>Join 1.2k explorers in the "Dublin Foodies" challenge.</Text>
            <View style={styles.joinBtn}><Text style={styles.joinBtnText}>Discover Communities</Text></View>
          </LinearGradient>
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
  communityCard: { marginTop: 12, borderRadius: 20, overflow: 'hidden' },
  communityInner: { padding: 20 },
  communityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  communityTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  liveBadge: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  liveText: { color: 'white', fontSize: 10, fontWeight: '900' },
  communitySub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 16, lineHeight: 18 },
  joinBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  joinBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
});

