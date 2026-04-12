import React, { useMemo, useCallback } from 'react';
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
  Settings,
  Eye,
  Sparkles,
  MessageCircle,
} from 'lucide-react-native';
import useStore from '../store/useStore';
import useWeather from '../hooks/useWeather';
import useLocation from '../hooks/useLocation';
import useBattery from '../hooks/useBattery';
import { useTheme } from '../context/ThemeContext';
import { DriftAlertModal } from '../components/DriftAlertModal';

const { width } = Dimensions.get('window');

// ─── User Header ─────────────────────────────────────────────────────────────

function UserHeader({ name, level, currentXP, totalXP }) {
  const { theme } = useTheme();
  const progress = (currentXP / 500) * 100;

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        <TouchableOpacity onPress={() => navigation.navigate('DirectMessages')}>
          <MessageCircle size={26} color="#1A1A2E" strokeWidth={2} />
        </TouchableOpacity>
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

// ─── Stale Interest Nudge ────────────────────────────────────────────────────

const CAT_MAP_NUDGE = {
  architecture: 'Architecture', food: 'Food', history: 'History',
  art: 'Art', nature: 'Nature', nightlife: 'Nightlife',
};

function StaleInterestNudge({ interests, collection, navigation }) {
  const { theme } = useTheme();
  const stale = useMemo(() => {
    if (!collection.length) return [];
    const now = Date.now();
    return interests
      .map(i => {
        const cat = CAT_MAP_NUDGE[i];
        if (!cat) return null;
        const visits = collection.filter(c => c.category === cat);
        if (!visits.length) return { cat, daysSince: null };
        const last = Math.max(...visits.map(c => new Date(c.checkedInAt).getTime()));
        const days = Math.floor((now - last) / 86400000);
        return days >= 14 ? { cat, daysSince: days } : null;
      })
      .filter(Boolean)
      .slice(0, 2);
  }, [interests, collection]);

  if (!stale.length) return null;

  return (
    <TouchableOpacity
      style={[styles.adaptiveCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1 }]}
      onPress={() => navigation.navigate('Nearby')}
      activeOpacity={0.8}
    >
      <View style={styles.adaptiveInner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Compass size={16} color="#166534" strokeWidth={2} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>Time to revisit your interests</Text>
        </View>
        {stale.map(({ cat, daysSince }) => (
          <Text key={cat} style={{ fontSize: 12, color: '#15803D' }}>
            • {cat}: {daysSince ? `${daysSince} days since last visit` : 'never explored yet'}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );
}

// ─── Weekly Recap ─────────────────────────────────────────────────────────────

function WeeklyRecap({ collection }) {
  const { theme } = useTheme();
  const recap = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600000;
    const recent = collection.filter(c => new Date(c.checkedInAt).getTime() > cutoff);
    if (!recent.length) return null;
    const xp = recent.reduce((s, c) => s + (c.xpEarned || 150), 0);
    const cats = [...new Set(recent.map(c => c.category).filter(Boolean))];
    const avgDwell = recent.filter(c => c.dwell_time_min > 0).reduce((s, c, _, a) => s + c.dwell_time_min / a.length, 0);
    return { count: recent.length, xp, cats, avgDwell: Math.round(avgDwell) };
  }, [collection]);

  if (!recap) return null;

  return (
    <View style={[styles.adaptiveCard, { backgroundColor: '#EFF6FF', marginBottom: 16 }]}>
      <View style={styles.adaptiveInner}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF', marginBottom: 6 }}>
          📊 This week
        </Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1E40AF' }}>{recap.count}</Text>
            <Text style={{ fontSize: 10, color: '#3B82F6' }}>check-ins</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1E40AF' }}>+{recap.xp}</Text>
            <Text style={{ fontSize: 10, color: '#3B82F6' }}>XP earned</Text>
          </View>
          {recap.avgDwell > 0 && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1E40AF' }}>{recap.avgDwell}m</Text>
              <Text style={{ fontSize: 10, color: '#3B82F6' }}>avg dwell</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: '#1D4ED8' }}>{recap.cats.join(' · ')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Drift Notification banner (Phase 8.3) ───────────────────────────────────

function DriftNotification() {
  const driftAlert = useStore(s => s.driftAlert);
  const clearDriftAlert = useStore(s => s.clearDriftAlert);
  if (!driftAlert) return null;

  const handlePress = () => {
    Alert.alert(
      'Your Tastes Are Evolving',
      `You've been exploring more ${driftAlert.to} lately instead of ${driftAlert.from}.\n\nUpdate your interests in Profile to keep recommendations accurate.`,
      [
        { text: 'Dismiss', style: 'cancel', onPress: clearDriftAlert },
        { text: 'Update Interests', onPress: clearDriftAlert },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.adaptiveCard, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74', borderWidth: 1 }]}
      onPress={handlePress}
    >
      <View style={styles.adaptiveInner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#EA580C" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#9A3412' }}>Your tastes are evolving!</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#C2410C', marginTop: 4 }}>
          More {driftAlert.to} than {driftAlert.from} lately. Tap to update interests.
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Adaptive Profile Card (Scrutability) ───────────────────────────────────

function AdaptiveProfileCard({ preferences, interests, collection, weather, navigation }) {
  const { theme } = useTheme();
  const { tier: batteryTier, batteryLevel } = useBattery();
  const isColdStart = collection.length === 0;
  const hour = new Date().getHours();

  let timeSlot = 'Day';
  if (hour >= 6 && hour < 11) timeSlot = 'Morning';
  else if (hour >= 11 && hour < 17) timeSlot = 'Midday';
  else if (hour >= 17 && hour < 22) timeSlot = 'Evening';
  else timeSlot = 'Night';

  const visitorType = preferences.visitor_type || 'tourist';
  const chips = [];

  // Time chip
  const timeEmoji = timeSlot === 'Morning' ? '🌅' : timeSlot === 'Midday' ? '☀️' : timeSlot === 'Evening' ? '🌇' : '🌃';
  chips.push({ label: `${timeEmoji} ${timeSlot}`, color: '#F59E0B' });

  // Visitor type chip
  chips.push({
    label: visitorType === 'tourist' ? '✈️ Tourist' : '🏡 Local',
    color: visitorType === 'tourist' ? '#0D9488' : '#7C3AED',
  });

  // Weather chip
  if (weather) {
    if (weather.isRaining) chips.push({ label: '🌧️ Indoor Mode', color: '#1E40AF' });
    else if (weather.isClear) chips.push({ label: '☀️ Outdoor', color: '#92400E' });
  }

  // Cold start chip
  if (isColdStart) {
    chips.push({ label: '🆕 New Explorer', color: '#7C3AED' });
  }

  // Battery chip
  if (batteryTier === 'low' || batteryTier === 'critical') {
    chips.push({ label: `🔋 ${Math.round((batteryLevel || 0) * 100)}%`, color: '#EF4444' });
  }

  // Interest chips
  if (interests?.length > 0) {
    const interestLabels = {
      architecture: '🏛️', food: '🍜', nature: '🌿',
      history: '⚔️', art: '🎨', nightlife: '🎵'
    };
    const displayInterests = interests.slice(0, 3).map(i => interestLabels[i] || i);
    chips.push({ label: `🎯 ${displayInterests.join(' ')}`, color: '#F5A623' });
  }

  return (
    <TouchableOpacity
      style={styles.adaptiveCard}
      onPress={() => navigation.navigate('Profile')}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#F5F3FF', '#EDE9FE']}
        style={styles.adaptiveInner}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.adaptiveHeader}>
          <View style={styles.adaptiveTitleRow}>
            <Eye size={16} color="#7C3AED" strokeWidth={2.5} />
            <Text style={styles.adaptiveTitle}>Your Adaptive Profile</Text>
          </View>
          <Settings size={14} color="#9CA3AF" strokeWidth={2} />
        </View>

        {isColdStart && (
          <View style={styles.coldStartHint}>
            <Sparkles size={12} color="#7C3AED" strokeWidth={2} />
            <Text style={styles.coldStartHintText}>
              Routes are tuned for first-time {visitorType === 'tourist' ? 'visitors' : 'locals'} based on your onboarding preferences. Check in to personalise further!
            </Text>
          </View>
        )}

        <View style={styles.adaptiveChips}>
          {chips.map((chip, i) => (
            <View key={i} style={[styles.adaptiveChip, { borderColor: chip.color + '40' }]}>
              <Text style={[styles.adaptiveChipText, { color: chip.color }]}>{chip.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.adaptiveSub}>
          {isColdStart
            ? 'These factors shape your first routes. Explore to refine them!'
            : `${collection.length} check-in${collection.length !== 1 ? 's' : ''} shaping your experience.`}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Journey Progress (Phase 3.2) ────────────────────────────────────────────

function JourneyProgressWidget({ collection }) {
  const allCats = ['History', 'Food', 'Nature', 'Architecture', 'Art', 'Nightlife'];
  const exploredCats = new Set();
  
  collection.forEach(c => {
    let cat = c.category;
    if (cat === 'historical') cat = 'History';
    else if (cat === 'cultural') cat = 'Art';
    else if (cat === 'shopping') cat = 'Food';
    else if (cat === 'nature') cat = 'Nature';
    else if (cat === 'landmark') cat = 'Architecture';
    else if (cat === 'nightlife') cat = 'Nightlife';
    else cat = 'Architecture';
    exploredCats.add(cat);
  });

  const exploredCount = Math.min(allCats.filter(c => exploredCats.has(c)).length, 6);
  const nextTarget = allCats.find(c => !exploredCats.has(c)) || 'Hidden Gems';

  return (
    <View style={[styles.adaptiveCard, { backgroundColor: '#F0F9FF', marginBottom: 20 }]}>
      <View style={styles.adaptiveInner}>
        <View style={styles.adaptiveHeader}>
          <Text style={[styles.adaptiveTitle, { color: '#0369A1' }]}>Dublin Explorer Journey</Text>
        </View>
        <Text style={{ fontSize: 13, color: '#0C4A6E', marginBottom: 8, fontWeight: '500' }}>
          You've explored {exploredCount} of 6 city domains.
        </Text>
        <Text style={{ fontSize: 12, color: '#0EA5E9' }}>
          Try investigating {nextTarget} next for a complete picture.
        </Text>
        <View style={{ height: 6, backgroundColor: '#BAE6FD', borderRadius: 3, marginTop: 12 }}>
          <View style={{ height: '100%', width: `${(exploredCount/6)*100}%`, backgroundColor: '#0284C7', borderRadius: 3 }}/>
        </View>
      </View>
    </View>
  );
}

// ─── Progressive Profile Enrichment (Phase 2.2) ───────────────────────────────

function ConversationalRefinement() {
  const message = useStore((s) => s.refinementMessage);
  if (!message) return null;
  return (
    <View style={[styles.adaptiveCard, { backgroundColor: '#F5F3FF', marginBottom: 20 }]}>
      <View style={styles.adaptiveInner}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
          <Text style={{fontSize: 16, marginRight: 6}}>🤖</Text>
          <Text style={{fontWeight: '800', color: '#5B21B6'}}>AI Companion</Text>
        </View>
        <Text style={{fontSize: 13, color: '#4C1D95', lineHeight: 18}}>{message}</Text>
      </View>
    </View>
  );
}

function ProgressiveEnrichment({ collection, navigation }) {
  const len = collection.length;
  if (len !== 5 && len !== 10) return null;
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.adaptiveCard, { backgroundColor: '#FEF3C7', marginBottom: 20 }]} activeOpacity={0.8}>
      <View style={styles.adaptiveInner}>
         <Text style={{fontWeight: '800', color: '#92400E', marginBottom: 4}}>We're learning your style 🧠</Text>
         <Text style={{fontSize: 12, color: '#B45309'}}>You've made {len} check-ins. Review your generated Explorer Type and adjust manually if needed.</Text>
      </View>
    </TouchableOpacity>
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
  const preferences = useStore((s) => s.preferences);
  const interests = useStore((s) => s.interests);
  const collection = useStore((s) => s.collection);

  const { location } = useLocation();
  const { weather } = useWeather(location?.latitude, location?.longitude);

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
      <UserHeader name={userName} level={level} currentXP={currentXP} totalXP={totalXP} />

      <WeatherWidget weather={weather} />

      <WeeklyRecap collection={collection} />

      <DriftNotification />

      <StaleInterestNudge interests={interests} collection={collection} navigation={navigation} />


      {/* Scrutability: Adaptive Profile Summary */}
      <AdaptiveProfileCard
        preferences={preferences}
        interests={interests}
        collection={collection}
        weather={weather}
        navigation={navigation}
      />

      <JourneyProgressWidget collection={collection} />
      <ProgressiveEnrichment collection={collection} navigation={navigation} />

      <ConversationalRefinement />

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
        onPress={() => navigation.navigate('Community')}
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
            <Text style={styles.joinBtnText}>Browse Communities</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>

      {/* Drift Alert Modal — triggered when interests shift */}
      <DriftAlertModal />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFDF8',
  },
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
    marginBottom: 16,
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

  // Adaptive Profile Card (Scrutability)
  adaptiveCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  adaptiveInner: {
    padding: 18,
  },
  adaptiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  adaptiveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adaptiveTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5B21B6',
  },
  coldStartHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  coldStartHintText: {
    fontSize: 12,
    color: '#5B21B6',
    flex: 1,
    lineHeight: 17,
  },
  adaptiveChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  adaptiveChip: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  adaptiveChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  adaptiveSub: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 15,
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
