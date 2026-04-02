import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Map,
  Route,
  Briefcase,
  Target,
  User,
  Users,
  Compass,
  Trophy,
  Flame,
  CloudRain,
  Sun,
  Wind,
  Zap,
  Home,
} from 'lucide-react-native';
import useStore from '../store/useStore';
import useWeather from '../hooks/useWeather';
import useLocation from '../hooks/useLocation';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// ─── User Header ─────────────────────────────────────────────────────────────

function UserHeader({ name, level, currentXP, totalXP }) {
  const { theme } = useTheme();
  const progress = (currentXP / 500) * 100; // Assuming 500 XP per level

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.greetingText}>{greeting},</Text>
        <Text style={styles.nameText}>{name}</Text>
      </View>
      <View style={styles.levelBadge}>
        <LinearGradient
          colors={[theme.primary, theme.secondary || '#F97316']}
          style={styles.levelGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={styles.levelLabel}>LVL</Text>
          <Text style={styles.levelValue}>{level}</Text>
        </LinearGradient>
        <View style={styles.xpTrack}>
          <View style={[styles.xpProgress, { width: `${progress}%`, backgroundColor: theme.primary }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Weather Widget ─────────────────────────────────────────────────────────

function WeatherWidget({ weather }) {
  if (!weather) return null;

  let Icon = Sun;
  let recommendation = "Perfect day to explore!";
  let bgColor = '#FEF3C7';
  let iconColor = '#92400E';

  if (weather.isRaining) {
    Icon = CloudRain;
    recommendation = "Rainy day? Discover indoor landmarks!";
    bgColor = '#DBEAFE';
    iconColor = '#1E40AF';
  } else if (weather.isWindy) {
    Icon = Wind;
    recommendation = "It's breezy out. Stay sheltered!";
    bgColor = '#F3F4F6';
    iconColor = '#374151';
  }

  return (
    <LinearGradient
      colors={[bgColor, '#FFFFFF']}
      style={styles.weatherCard}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <View style={styles.weatherInfo}>
        <Icon size={24} color={iconColor} strokeWidth={2.5} />
        <View style={styles.weatherTextContainer}>
          <Text style={styles.tempText}>{Math.round(weather.temp)}°C in Dublin</Text>
          <Text style={styles.weatherRecText}>{recommendation}</Text>
        </View>
      </View>
      <Zap size={16} color={iconColor} opacity={0.3} />
    </LinearGradient>
  );
}

// ─── Quick Stats ─────────────────────────────────────────────────────────────

function QuickStats({ stats }) {
  return (
    <View style={styles.statsContainer}>
      <StatBox icon={Compass} value={stats.landmarks} label="Visited" color="#2E86AB" />
      <StatBox icon={Trophy} value={stats.quests} label="Quests" color="#7C3AED" />
      <StatBox icon={Flame} value={stats.streak} label="Streak" color="#EF4444" />
    </View>
  );
}

function StatBox({ icon: Icon, value, label, color }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={18} color={color} strokeWidth={2.5} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Action Card ─────────────────────────────────────────────────────────────

function ActionCard({ title, subtitle, icon: Icon, color, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
        <Icon size={24} color="white" strokeWidth={2} />
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main HomeScreen ─────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const userName = useStore((s) => s.userName);
  const level = useStore((s) => s.getLevel());
  const currentXP = useStore((s) => s.getCurrentXP());
  const totalXP = useStore((s) => s.getTotalXP());
  const stats = useStore((s) => s.getStats());
  
  const { location } = useLocation();
  const { weather } = useWeather(location?.latitude, location?.longitude);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <UserHeader name={userName} level={level} currentXP={currentXP} totalXP={totalXP} />
      
      <WeatherWidget weather={weather} />

      <QuickStats stats={stats} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Continue Exploring</Text>
      </View>

      <View style={styles.actionGrid}>
        <ActionCard 
          title="Map View" 
          subtitle="Explore 3D Dublin" 
          icon={Map} 
          color="#2E86AB" 
          onPress={() => navigation.navigate('Map')} 
        />
        <ActionCard 
          title="Build Route" 
          subtitle="Adaptive paths" 
          icon={Route} 
          color="#F97316" 
          onPress={() => navigation.navigate('Route')} 
        />
        <ActionCard 
          title="Collections" 
          subtitle="Found treasures" 
          icon={Briefcase} 
          color="#10B981" 
          onPress={() => navigation.navigate('Collection')} 
        />
        <ActionCard 
          title="Active Quests" 
          subtitle="New challenges" 
          icon={Target} 
          color="#7C3AED" 
          onPress={() => navigation.navigate('Quests')} 
        />
      </View>

      <TouchableOpacity
        style={styles.communityCard}
        onPress={() => navigation.navigate('Group')}
      >
        <LinearGradient
          colors={['#7C3AED', '#4F46E5']}
          style={styles.communityInner}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.communityHeader}>
            <View style={styles.communityTitleRow}>
              <Users size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.communityTitle}>Expeditions</Text>
            </View>
            <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <Text style={styles.communitySub}>Join fellow explorers in real-time group expeditions across Dublin.</Text>
          <View style={styles.joinBtn}>
            <Text style={styles.joinBtnText}>Browse Groups</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: -2,
  },
  levelBadge: {
    alignItems: 'flex-end',
  },
  levelGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  levelLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '900',
  },
  levelValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    marginTop: -2,
  },
  xpTrack: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpProgress: {
    height: '100%',
    borderRadius: 2,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherTextContainer: {
    marginLeft: 12,
  },
  tempText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  weatherRecText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statBox: {
    width: (width - 60) / 3,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  communityCard: {
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  communityInner: {
    padding: 24,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  communityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },
  liveBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  communitySub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  joinBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  joinBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});
