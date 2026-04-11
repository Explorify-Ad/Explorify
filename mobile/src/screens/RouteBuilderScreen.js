import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Route,
  Clock,
  Zap,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Battery,
  CloudRain,
  Sun,
  Wind,
  Plus,
  Minus,
  Info,
  Eye,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useStore from '../store/useStore';
import useBattery from '../hooks/useBattery';
import useWeather from '../hooks/useWeather';
import useLocation from '../hooks/useLocation';
import { getCurrentLocation } from '../services/location';
import { fetchAllLandmarks } from '../services/supabase';
import { haversineDistance } from '../services/tomtom';
import { CATEGORY_COLORS } from '../utils/theme';
import { CATEGORY_ICONS } from '../components/explorify/PinDetailModal';

const TIME_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr',   value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hr',   value: 120 },
  { label: '3 hr',   value: 180 },
];

const CATEGORIES = ['Architecture', 'Food', 'Nature', 'History', 'Art', 'Nightlife'];

const COMPANY_TYPES = [
  { id: 'solo', label: 'Solo', icon: '🧍' },
  { id: 'date', label: 'Date', icon: '👫' },
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'kids', label: 'With Kids', icon: '🧸' },
  { id: 'elderly', label: 'Elderly', icon: '🧓' },
];

function walkMinutes(distanceMeters, walkSpeedKmh) {
  return Math.round((distanceMeters / 1000 / walkSpeedKmh) * 60);
}

// ─── Weather banner ───────────────────────────────────────────────────────────

function WeatherBanner({ weather }) {
  if (!weather) return null;
  let icon, text, bg;
  if (weather.isRaining) {
    icon = <CloudRain size={14} color="#1e40af" strokeWidth={2} />;
    text = `${Math.round(weather.temp)}° · Rainy — indoor spots prioritised`;
    bg = '#dbeafe';
  } else if (weather.isClear) {
    icon = <Sun size={14} color="#92400e" strokeWidth={2} />;
    text = `${Math.round(weather.temp)}° · Great day to explore`;
    bg = '#fef3c7';
  } else if (weather.isWindy) {
    icon = <Wind size={14} color="#374151" strokeWidth={2} />;
    text = `${Math.round(weather.temp)}° · Windy — sheltered spots first`;
    bg = '#f3f4f6';
  } else {
    icon = <Sun size={14} color="#374151" strokeWidth={2} />;
    text = `${Math.round(weather.temp)}° · ${weather.description}`;
    bg = '#f9fafb';
  }
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      {icon}
      <Text style={styles.bannerText}>{text}</Text>
    </View>
  );
}

// ─── Battery warning ──────────────────────────────────────────────────────────

function BatteryBanner({ tier, originalBudget, adjustedBudget }) {
  if (tier === 'ok' || originalBudget === adjustedBudget) return null;
  const bg = tier === 'critical' ? '#fee2e2' : '#fef3c7';
  const color = tier === 'critical' ? '#991b1b' : '#92400e';
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Battery size={14} color={color} strokeWidth={2} />
      <Text style={[styles.bannerText, { color }]}>
        {tier === 'critical'
          ? `Battery critical — route capped to ${adjustedBudget} min`
          : `Battery low — route shortened to ${adjustedBudget} min`}
      </Text>
    </View>
  );
}

// ─── Active Adaptations Panel (Scrutability) ─────────────────────────────────

function AdaptationsPanel({ adaptations, isColdStart }) {
  const [expanded, setExpanded] = useState(false);

  if (!adaptations || adaptations.length === 0) return null;

  return (
    <View style={styles.adaptationsContainer}>
      <Pressable
        style={styles.adaptationsHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.adaptationsHeaderLeft}>
          <Eye size={14} color="#7C3AED" strokeWidth={2} />
          <Text style={styles.adaptationsTitle}>Why this route?</Text>
          {isColdStart && (
            <View style={styles.coldStartBadge}>
              <Text style={styles.coldStartBadgeText}>New Explorer</Text>
            </View>
          )}
        </View>
        {expanded ? (
          <ChevronUp size={16} color="#6B7280" strokeWidth={2} />
        ) : (
          <ChevronDown size={16} color="#6B7280" strokeWidth={2} />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.adaptationsList}>
          {adaptations.map((a, i) => (
            <View key={i} style={styles.adaptationItem}>
              <Text style={styles.adaptationLabel}>{a.label}</Text>
              <Text style={styles.adaptationDetail}>{a.detail}</Text>
            </View>
          ))}
          <View style={styles.adaptationFooter}>
            <Info size={12} color="#9CA3AF" strokeWidth={2} />
            <Text style={styles.adaptationFooterText}>
              These factors automatically shape your route. Change them in Profile → Adaptive Persona.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Waypoint card with reasons ───────────────────────────────────────────────

function WaypointCard({ index, landmark, walkMin, isFirst }) {
  const color = CATEGORY_COLORS[landmark.category] || '#64748b';
  const Icon = CATEGORY_ICONS[landmark.category];
  const visitMin = landmark.visit_duration_min || landmark.avg_visit_duration_min || 30;
  const reasons = landmark.reasons || [];

  return (
    <View style={styles.waypointRow}>
      <View style={[styles.stepBubble, { backgroundColor: color }]}>
        <Text style={styles.stepNum}>{index + 1}</Text>
      </View>

      {!isFirst && <View style={[styles.connectorLine, { backgroundColor: color + '40' }]} />}

      <View style={styles.waypointCard}>
        <LinearGradient
          colors={[color, color + 'bb']}
          style={styles.waypointStrip}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          {Icon && <Icon size={20} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />}
        </LinearGradient>

        <View style={styles.waypointBody}>
          <Text style={styles.waypointName} numberOfLines={1}>{landmark.name}</Text>
          <Text style={styles.waypointCategory}>{landmark.category}</Text>
          <View style={styles.waypointMeta}>
            {!isFirst && (
              <View style={styles.metaChip}>
                <Clock size={11} color="#6B7280" strokeWidth={2} />
                <Text style={styles.metaText}>{walkMin} min walk</Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <MapPin size={11} color="#6B7280" strokeWidth={2} />
              <Text style={styles.metaText}>{visitMin} min visit</Text>
            </View>
          </View>
          {/* Scrutability: show adaptation reasons */}
          {reasons.length > 0 && (
            <View style={styles.reasonsRow}>
              {reasons.map((reason, i) => (
                <View key={i} style={styles.reasonChip}>
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function RouteBuilderScreen({ route: navigationRoute, navigation }) {
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const { tier: batteryTier, getAdjustedBudget, batteryLevel } = useBattery();
  const { weather } = useWeather(location?.latitude, location?.longitude);

  const preferences      = useStore((s) => s.preferences);
  const interests        = useStore((s) => s.interests);
  const setPreferences   = useStore((s) => s.setPreferences);
  const authUser         = useStore((s) => s.authUser);
  const getWalkPaceKmh   = useStore((s) => s.getWalkPaceKmh);
  const walkPaceSamples  = useStore((s) => s.walkPaceSamples);

  const [timeBudget, setTimeBudget] = useState(60);
  const [selectedCats, setSelectedCats] = useState(CATEGORIES);
  const [generatedRoute, setGeneratedRoute] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [activeAdaptations, setActiveAdaptations] = useState([]);
  const [isColdStart, setIsColdStart] = useState(false);
  const [building, setBuilding] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customHours, setCustomHours] = useState(1);
  const [customMins, setCustomMins] = useState(0);
  const [companyType, setCompanyType] = useState('solo');

  const group_id = navigationRoute?.params?.group_id;

  const toggleCategory = (cat) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? (prev.length > 1 ? prev.filter((c) => c !== cat) : prev) : [...prev, cat]
    );
    setGeneratedRoute(null);
  };

  const handleGenerateRoute = async () => {
    setBuilding(true);
    setGeneratedRoute(null);
    setActiveAdaptations([]);

    let coords = location;
    if (!coords) {
      try {
        coords = await getCurrentLocation();
      } catch {
        Alert.alert('Location needed', 'Please enable location to build a route.');
        setBuilding(false);
        return;
      }
    }

    try {
      const { budget: adjusted } = getAdjustedBudget(timeBudget);
      const walkSpeed = getWalkPaceKmh();
      const unlockedTiers = useStore.getState().getUnlockedTiers();
      const isRaining = weather?.isRaining || false;

      // 1. Fetch all landmarks from Supabase
      const allLandmarks = await fetchAllLandmarks(coords.latitude, coords.longitude);

      // 2. Filter: category, tier access, weather (rainy → prefer indoor)
      const filtered = allLandmarks.filter(lm => {
        if (!unlockedTiers[lm.tier]) return false;
        if (selectedCats.length > 0) {
          const lmCat = (lm.category || '').toLowerCase();
          if (!selectedCats.some(c => c.toLowerCase() === lmCat)) return false;
        }
        if (isRaining && !lm.is_indoor && lm.tier === 'public') return false;
        return true;
      });

      if (!filtered.length) {
        Alert.alert('No Route Found', 'Try increasing your time budget or adding more categories.');
        setBuilding(false);
        return;
      }

      // 3. Score each landmark: proximity + collection history
      const { collection } = useStore.getState();
      const visitedIds = new Set(collection.map(c => String(c.id)));

      const scored = filtered.map(lm => {
        const distM = haversineDistance(
          coords.latitude, coords.longitude,
          parseFloat(lm.latitude), parseFloat(lm.longitude)
        );
        const walkMin = walkMinutes(distM, walkSpeed);
        const visitMin = lm.avg_visit_duration_min || 30;
        const totalMin = walkMin + visitMin;

        // Score: penalise distance, reward unvisited, reward indoor when raining
        let score = 1000 - distM * 0.1;
        if (!visitedIds.has(String(lm.id))) score += 200;
        if (isRaining && lm.is_indoor) score += 150;
        if (companyType === 'family' && lm.accessibility_level >= 4) score += 100;

        return { ...lm, _distM: distM, _walkMin: walkMin, _visitMin: visitMin, _totalMin: totalMin, _score: score };
      });

      // 4. Greedy pick: add highest-scoring landmark that fits remaining budget
      scored.sort((a, b) => b._score - a._score);
      const route = [];
      let usedMin = 0;

      for (const lm of scored) {
        if (usedMin + lm._totalMin > adjusted + 10) continue; // 10 min grace
        route.push(lm);
        usedMin += lm._totalMin;
        if (usedMin >= adjusted * 0.85) break; // stop when 85% full
      }

      if (!route.length) {
        Alert.alert('No Route Found', 'Try increasing your time budget or adding more categories.');
        setBuilding(false);
        return;
      }

      // 5. Recompute sequential walk times (origin → stop0, stop0 → stop1, …)
      route[0]._walkMin = walkMinutes(
        haversineDistance(coords.latitude, coords.longitude, route[0].lat, route[0].lon),
        walkSpeed
      );
      for (let i = 1; i < route.length; i++) {
        const prev = route[i - 1];
        const curr = route[i];
        route[i]._walkMin = walkMinutes(
          haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon),
          walkSpeed
        );
      }
      const totalMin = route.reduce((sum, lm) => sum + lm._walkMin + lm._visitMin, 0);

      // 6. Build adaptations list for the UI badges
      const adaptations = [];
      if (isRaining) adaptations.push('indoor_priority');
      if (getAdjustedBudget(timeBudget).budget < timeBudget) adaptations.push('battery_cap');
      if (companyType === 'family') adaptations.push('accessibility_boost');

      setGeneratedRoute(route);
      setActiveAdaptations(adaptations);
      setIsColdStart(collection.length === 0);

      let totalXP = 0;
      route.forEach(l => totalXP += (l.points || 10) * 15);
      setRouteStats({ stops: route.length, totalMin, totalXP });

    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to generate route. Please try again.');
    } finally {
      setBuilding(false);
    }
  };

  const openInMaps = () => {
    if (!generatedRoute?.length) return;
    const waypoints = generatedRoute
      .map((lm) => `${lm.latitude},${lm.longitude}`)
      .join('/');
    const src = location || { latitude: 53.3498, longitude: -6.2603 };
    const url = `http://maps.apple.com/?saddr=${src.latitude},${src.longitude}&daddr=${waypoints}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Cannot open Maps', 'Make sure Apple Maps is installed.')
    );
  };

  const { budget: adjustedBudget } = getAdjustedBudget(timeBudget);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Route size={18} color="#F5A623" strokeWidth={2} />
          <Text style={styles.headerText}>Route Builder</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <WeatherBanner weather={weather} />
        {walkPaceSamples.length >= 2 && (
          <View style={[styles.banner, { backgroundColor: '#F0FDF4' }]}>
            <Route size={14} color="#166534" strokeWidth={2} />
            <Text style={[styles.bannerText, { color: '#166534' }]}>
              Using your pace · {getWalkPaceKmh().toFixed(1)} km/h ({walkPaceSamples.length} trips recorded)
            </Text>
          </View>
        )}
        <BatteryBanner
          tier={batteryTier}
          originalBudget={timeBudget}
          adjustedBudget={adjustedBudget}
        />

        <Text style={styles.sectionLabel}>Time budget</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeRow}
        >
          {TIME_OPTIONS.map((opt) => {
            const active = !isCustom && timeBudget === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.timeChip, active && styles.timeChipActive]}
                onPress={() => { setIsCustom(false); setTimeBudget(opt.value); setGeneratedRoute(null); }}
              >
                <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.timeChip, isCustom && styles.timeChipActive]}
            onPress={() => setIsCustom(true)}
          >
            <Text style={[styles.timeChipText, isCustom && styles.timeChipTextActive]}>Custom</Text>
          </Pressable>
        </ScrollView>

        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.catRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCats.includes(cat);
            const color = CATEGORY_COLORS[cat] || '#64748b';
            const Icon = CATEGORY_ICONS[cat];
            return (
              <Pressable
                key={cat}
                style={[styles.catChip, { borderColor: color }, active && { backgroundColor: color }]}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={[styles.catChipText, { color: active ? 'white' : color }]}>{cat}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Company Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {COMPANY_TYPES.map((ct) => {
            const active = companyType === ct.id;
            return (
              <Pressable
                key={ct.id}
                style={[styles.catChip, { borderColor: '#F5A623', paddingHorizontal: 16 }, active && { backgroundColor: '#F5A623' }]}
                onPress={() => { setCompanyType(ct.id); setGeneratedRoute(null); }}
              >
                <Text style={{ fontSize: 16, marginRight: 6 }}>{ct.icon}</Text>
                <Text style={[styles.catChipText, { color: active ? 'white' : '#F5A623' }]}>{ct.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={[styles.buildBtn, building && { opacity: 0.7 }]}
          onPress={handleGenerateRoute}
          disabled={building}
        >
          <LinearGradient
            colors={['#F5A623', '#F97316']}
            style={styles.buildBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {building ? <ActivityIndicator color="white" /> : <Text style={styles.buildBtnText}>Generate Route</Text>}
          </LinearGradient>
        </Pressable>

        {generatedRoute && routeStats && (
          <>
            {/* Scrutability: Active Adaptations Panel */}
            <AdaptationsPanel
              adaptations={activeAdaptations}
              isColdStart={isColdStart}
            />

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{routeStats.stops}</Text>
                <Text style={styles.statLbl}>stops</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{routeStats.totalMin}</Text>
                <Text style={styles.statLbl}>min</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#F5A623' }]}>+{routeStats.totalXP}</Text>
                <Text style={styles.statLbl}>XP</Text>
              </View>
            </View>

            <View style={styles.waypointList}>
              {generatedRoute.map((lm, i) => (
                <WaypointCard
                  key={lm.id}
                  index={i}
                  landmark={lm}
                  walkMin={lm._walkMin || 0}
                  isFirst={i === 0}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable style={styles.startBtn} onPress={() => navigation.navigate('Map', { generatedRoute })}>
                <Text style={styles.mapsBtnText}>Start Native Route</Text>
              </Pressable>
              <Pressable style={[styles.mapsBtn, { flex: 1, marginTop: 0 }]} onPress={openInMaps}>
                <Text style={styles.mapsBtnText}>Open in Apple Maps</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, marginBottom: 10,
  },
  bannerText: { fontSize: 13, color: '#374151', flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  timeChip: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white',
  },
  timeChipActive: { borderColor: '#F5A623', backgroundColor: '#FEF3C7' },
  timeChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  timeChipTextActive: { color: '#92400E' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5, backgroundColor: 'white',
  },
  catChipText: { fontSize: 12, fontWeight: '600' },
  buildBtn: { marginTop: 24, marginBottom: 4, borderRadius: 16, overflow: 'hidden' },
  buildBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  buildBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Scrutability: Adaptations Panel
  adaptationsContainer: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    overflow: 'hidden',
  },
  adaptationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  adaptationsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adaptationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5B21B6',
  },
  coldStartBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  coldStartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  adaptationsList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  adaptationItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  adaptationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 3,
  },
  adaptationDetail: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  adaptationFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 6,
  },
  adaptationFooterText: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
    lineHeight: 15,
  },

  // Waypoint reasons
  reasonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  reasonChip: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  reasonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5B21B6',
  },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 16, marginTop: 12, marginBottom: 4,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  statLbl: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(0,0,0,0.08)' },
  waypointList: { marginTop: 16, gap: 12 },
  waypointRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepBubble: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: 12, zIndex: 1,
  },
  stepNum: { color: 'white', fontSize: 12, fontWeight: '700' },
  connectorLine: {
    position: 'absolute', left: 13, top: -6,
    width: 2, height: 16, zIndex: 0,
  },
  waypointCard: {
    flex: 1, flexDirection: 'row',
    backgroundColor: 'white', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  waypointStrip: { width: 44, alignItems: 'center', justifyContent: 'center' },
  waypointBody: { flex: 1, padding: 12 },
  waypointName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 2 },
  waypointCategory: { fontSize: 11, color: '#6B7280', marginBottom: 8 },
  waypointMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#6B7280' },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1A1A2E',
    paddingVertical: 14, borderRadius: 14, marginTop: 16,
  },
  startBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5A623', paddingVertical: 14, borderRadius: 14,
  },
  mapsBtnText: { color: 'white', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
});
