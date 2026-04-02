import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Battery from 'expo-battery';
import api from '../services/api';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Route,
  Clock,
  Zap,
  MapPin,
  ChevronRight,
  Battery,
  CloudRain,
  Sun,
  Wind,
  Plus,
  Minus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useStore from '../store/useStore';
import useBattery from '../hooks/useBattery';
import useWeather from '../hooks/useWeather';
import useLocation from '../hooks/useLocation';
import { getCurrentLocation } from '../services/location';
import { fetchAllLandmarks, fetchUserDwellTimes } from '../services/supabase';
import { getRecommendations, buildContext, buildPreferences } from '../utils/recommendations';
import { buildRoute } from '../utils/routing';
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

const WALK_SPEED_KMH = 4.5;

function walkMinutes(distanceMeters) {
  return Math.round((distanceMeters / 1000 / WALK_SPEED_KMH) * 60);
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

// ─── Waypoint card ────────────────────────────────────────────────────────────

function WaypointCard({ index, landmark, walkMin, isFirst }) {
  const color = CATEGORY_COLORS[landmark.category] || '#64748b';
  const Icon = CATEGORY_ICONS[landmark.category];
  const visitMin = landmark.avg_visit_duration_min || 30;

  return (
    <View style={styles.waypointRow}>
      {/* Step number */}
      <View style={[styles.stepBubble, { backgroundColor: color }]}>
        <Text style={styles.stepNum}>{index + 1}</Text>
      </View>

      {/* Connector line */}
      {!isFirst && <View style={[styles.connectorLine, { backgroundColor: color + '40' }]} />}

      <View style={styles.waypointCard}>
        {/* Category strip */}
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
            <View style={styles.metaChip}>
              <Zap size={11} color="#F5A623" strokeWidth={2} />
              <Text style={[styles.metaText, { color: '#F5A623', fontWeight: '600' }]}>
                +{landmark.xpEarned || landmark.points * 15 || 150} XP
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function RouteBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const { tier: batteryTier, getAdjustedBudget } = useBattery();
  const { weather } = useWeather(location?.latitude, location?.longitude);

  const interests     = useStore((s) => s.interests);
  const visitorType   = useStore((s) => s.visitorType);
  const collection    = useStore((s) => s.collection);
  const authUser      = useStore((s) => s.authUser);

  const [timeBudget,       setTimeBudget]       = useState(60);
  const [selectedCats,     setSelectedCats]     = useState([]);
  const [route,            setRoute]            = useState(null);
  const [routeStats,       setRouteStats]       = useState(null);
  const [building,         setBuilding]         = useState(false);
  const [originalBudget,   setOriginalBudget]   = useState(60);
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [isCustom,         setIsCustom]         = useState(false);
  const [customHours,      setCustomHours]      = useState(0);
  const [customMins,       setCustomMins]       = useState(30);

  // Pre-select user's top interests
  useEffect(() => {
    const catMap = {
      architecture: 'Architecture', food: 'Food', history: 'History',
      art: 'Art', nature: 'Nature', nightlife: 'Nightlife',
    };
    const preferred = interests.map((i) => catMap[i]).filter(Boolean);
    setSelectedCats(preferred.length ? preferred : CATEGORIES.slice(0, 3));
  }, [interests]);

  const toggleCategory = (cat) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? (prev.length > 1 ? prev.filter((c) => c !== cat) : prev) : [...prev, cat]
    );
    setRoute(null);
  };

  // Sync custom time → timeBudget whenever hours/mins change while custom is active
  useEffect(() => {
    if (!isCustom) return;
    const total = customHours * 60 + customMins;
    if (total >= 15) { setTimeBudget(total); setRoute(null); }
  }, [isCustom, customHours, customMins]);

  const adjustCustom = (unit, delta) => {
    if (unit === 'h') {
      setCustomHours((h) => Math.max(0, Math.min(12, h + delta)));
    } else {
      setCustomMins((m) => {
        const next = m + delta;
        // don't go below 0; if hours > 0, mins can be 0
        return Math.max(customHours > 0 ? 0 : 15, Math.min(55, next));
      });
    }
  };

  const activateCustom = () => {
    setIsCustom(true);
    const total = customHours * 60 + customMins;
    if (total >= 15) setTimeBudget(total);
    setRoute(null);
  };

  const customLabel = (() => {
    const h = customHours > 0 ? `${customHours}h ` : '';
    const m = customMins > 0 ? `${customMins}m` : '';
    return (h + m).trim() || '—';
  })();

  const buildUserRoute = useCallback(async () => {
    setBuilding(true);
    setRoute(null);

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
  const [context, setContext] = useState(null);

  useEffect(() => {
    async function getInitialData() {
      try {
        const [bat, ctxResponse] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          api.get('/landmarks/context')
        ]);
        setBatteryLevel(bat);
        setContext(ctxResponse.data.data);
      } catch (err) {
        console.warn('Failed to fetch context', err);
      }
    }
    getInitialData();

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

  const preferences = useStore((s) => s.preferences);

  const handleGenerateRoute = async () => {
    setLoading(true);
    try {
      const response = await api.post('/routes/generate', {
        start_lat: 53.3498, // Dublin placeholder
        start_lng: -6.2603,
        time_budget_min: 120,
        group_id: group_id,
        preferences: {
          ...preferences,
          group_context: groupContext,
          visitor_type: visitorType,
          current_hour: new Date().getHours(),
          battery_level: Math.round(batteryLevel * 100),
        }
      });

      const generatedRoute = response.data.data || response.data;
      const landmarks = generatedRoute.landmarks || [];
      const totalTime = generatedRoute.total_time_min || 120;

      if (landmarks.length > 0) {
        navigation.navigate('Map', {
          generatedRoute: landmarks,
          context: `${visitorType} Route (${totalTime} min)`
        });
      } else {
        Alert.alert('No Route Found', 'Try adjusting your preferences or time budget.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to generate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };


    let coords = location;
    if (!coords) {
      try {
        coords = await getCurrentLocation();
      } catch {
        Alert.alert('Location needed', 'Please enable location in Settings to build a route.');
        setBuilding(false);
        return;
      }
    }
    setResolvedLocation(coords);

    try {
      // 1. Apply battery cap
      const { budget: adjusted } = getAdjustedBudget(timeBudget);
      setOriginalBudget(timeBudget);

      // 2. Fetch landmarks and dwell-time personalisation
      const [allLandmarks, dwellTimes] = await Promise.all([
        fetchAllLandmarks(coords.latitude, coords.longitude),
        authUser?.id ? fetchUserDwellTimes(authUser.id) : Promise.resolve(null),
      ]);

      // 3. Filter by selected categories
      const pool = allLandmarks.filter((lm) => selectedCats.includes(lm.category));
      if (!pool.length) {
        Alert.alert('No landmarks', 'No landmarks found for the selected categories.');
        setBuilding(false);
        return;
      }

      // 4. Score + rank with full recommendation engine
      const context     = buildContext({ weather, batteryTier });
      const preferences = buildPreferences({ interests, visitorType, collection });
      const scored      = getRecommendations(pool, preferences, context);

      // 5. Augment with personalised dwell times
      const augmented = scored.map((lm) => ({
        ...lm,
        avg_visit_duration_min: dwellTimes?.[lm.category] ?? lm.avg_visit_duration_min ?? 30,
      }));

      // 6. Build route (nearest-neighbor within time budget)
      const built = buildRoute(coords, augmented, adjusted);

      if (!built.length) {
        Alert.alert('Not enough time', 'Try a longer time budget or more categories.');
        setBuilding(false);
        return;
      }

      // 7. Compute per-waypoint walk times and totals
      let totalWalk = 0;
      let totalVisit = 0;
      let totalXP = 0;
      let prev = coords;

      const enriched = built.map((lm, i) => {
        const { haversineDistance } = require('../services/tomtom');
        const distM = haversineDistance(prev.latitude, prev.longitude, lm.lat ?? lm.latitude, lm.lon ?? lm.longitude);
        const wMin = i === 0 ? 0 : walkMinutes(distM);
        const vMin = lm.avg_visit_duration_min || 30;
        totalWalk  += wMin;
        totalVisit += vMin;
        totalXP    += lm.xpEarned || lm.points * 15 || 150;
        prev = { latitude: lm.lat ?? lm.latitude, longitude: lm.lon ?? lm.longitude };
        return { ...lm, walkMin: wMin };
      });

      setRoute(enriched);
      setRouteStats({ totalMin: totalWalk + totalVisit, totalXP, stops: enriched.length });
    } catch (e) {
      console.warn('Route build error:', e.message);
      Alert.alert('Error', 'Could not build route. Please try again.');
    }
    setBuilding(false);
  }, [location, timeBudget, selectedCats, weather, batteryTier, interests, visitorType, collection, authUser, getAdjustedBudget]);

  const openInMaps = () => {
    if (!route?.length) return;
    const waypoints = route
      .map((lm) => `${lm.lat ?? lm.latitude},${lm.lon ?? lm.longitude}`)
      .join('/');
    const src = resolvedLocation || location;
    const url = `http://maps.apple.com/?saddr=${src.latitude},${src.longitude}&daddr=${waypoints}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Cannot open Maps', 'Make sure Apple Maps is installed.')
    );
  };

  const { budget: adjustedBudget } = getAdjustedBudget(timeBudget);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Route Builder</Text>

      {context && (
        <View style={styles.contextHUD}>
          <View style={styles.contextItem}>
            <Text style={styles.contextEmoji}>
              {context.weather?.isRaining ? '🌧️' : context.weather?.isClear ? '☀️' : '🌥️'}
            </Text>
            <View>
              <Text style={styles.contextTitle}>{context.weather?.description || 'Loading...'}</Text>
              <Text style={styles.contextSub}>
                {context.weather?.isRaining ? 'Indoor venues boosted' : 'Scenic spots prioritized'}
              </Text>
            </View>
          </View>
          <View style={styles.contextDivider} />
          <View style={styles.contextItem}>
            <Text style={styles.contextEmoji}>
              {context.timeSlot === 'Morning' ? '🌅' : context.timeSlot === 'Evening' ? '🌇' : '🏙️'}
            </Text>
            <View>
              <Text style={styles.contextTitle}>{context.timeSlot} Slot</Text>
              <Text style={styles.contextSub}>
                {context.timeSlot === 'Evening' ? 'Lighting & Vibes scored' : 'Activity focused'}
              </Text>
            </View>
          </View>
        </View>
      )}

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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
        {/* Context banners */}
        <WeatherBanner weather={weather} />
        <BatteryBanner
          tier={batteryTier}
          originalBudget={timeBudget}
          adjustedBudget={adjustedBudget}
        />

        {/* Time budget */}
        <Text style={styles.sectionLabel}>Time budget</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeRow}
        >
          {TIME_OPTIONS.map((opt) => {
            const active = !isCustom && timeBudget === opt.value;
            const capped = getAdjustedBudget(opt.value).budget < opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.timeChip,
                  active && styles.timeChipActive,
                  capped && styles.timeChipDisabled,
                ]}
                onPress={() => {
                  if (!capped) { setIsCustom(false); setTimeBudget(opt.value); setRoute(null); }
                }}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    active && styles.timeChipTextActive,
                    capped && styles.timeChipTextDisabled,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
          {/* Custom chip */}
          <Pressable
            style={[styles.timeChip, styles.timeChipCustom, isCustom && styles.timeChipActive]}
            onPress={activateCustom}
          >
            <Clock size={12} color={isCustom ? '#92400E' : '#6B7280'} strokeWidth={2} />
            <Text style={[styles.timeChipText, isCustom && styles.timeChipTextActive]}>
              {isCustom ? customLabel : 'Custom'}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Custom time picker */}
        {isCustom && (
          <View style={styles.customPicker}>
            <View style={styles.customUnit}>
              <Pressable style={styles.adjBtn} onPress={() => adjustCustom('h', 1)}>
                <Plus size={15} color="#F5A623" strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.adjVal}>{customHours}</Text>
              <Pressable style={styles.adjBtn} onPress={() => adjustCustom('h', -1)}>
                <Minus size={15} color="#F5A623" strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.adjLabel}>hrs</Text>
            </View>
            <View style={styles.customDivider} />
            <View style={styles.customUnit}>
              <Pressable style={styles.adjBtn} onPress={() => adjustCustom('m', 5)}>
                <Plus size={15} color="#F5A623" strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.adjVal}>{customMins}</Text>
              <Pressable style={styles.adjBtn} onPress={() => adjustCustom('m', -5)}>
                <Minus size={15} color="#F5A623" strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.adjLabel}>min</Text>
            </View>
            {(customHours * 60 + customMins) > 90 && (
              <View style={styles.farAwayNote}>
                <MapPin size={11} color="#7C3AED" strokeWidth={2} />
                <Text style={styles.farAwayText}>Includes spots further afield</Text>
              </View>
            )}
          </View>
        )}

        {/* Category filter */}
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.catRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCats.includes(cat);
            const color = CATEGORY_COLORS[cat] || '#64748b';
            const Icon = CATEGORY_ICONS[cat];
            return (
              <Pressable
                key={cat}
                style={[
                  styles.catChip,
                  { borderColor: color },
                  active && { backgroundColor: color },
                ]}
                onPress={() => toggleCategory(cat)}
              >
                {Icon && (
                  <Icon
                    size={13}
                    color={active ? 'white' : color}
                    strokeWidth={2}
                  />
                )}
                <Text style={[styles.catChipText, { color: active ? 'white' : color }]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Build button */}
        <Pressable
          style={[styles.buildBtn, building && { opacity: 0.7 }]}
          onPress={buildUserRoute}
          disabled={building}
        >
          <LinearGradient
            colors={['#F5A623', '#F97316']}
            style={styles.buildBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {building ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Route size={18} color="white" strokeWidth={2} />
                <Text style={styles.buildBtnText}>
                  {route ? 'Rebuild Route' : 'Build My Route'}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        {/* Route result */}
        {route && routeStats && (
          <>
            {/* Stats header */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{routeStats.stops}</Text>
                <Text style={styles.statLbl}>stops</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{routeStats.totalMin}</Text>
                <Text style={styles.statLbl}>min total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#F5A623' }]}>+{routeStats.totalXP}</Text>
                <Text style={styles.statLbl}>XP</Text>
              </View>
            </View>

            {/* Waypoints */}
            <View style={styles.waypointList}>
              {route.map((lm, i) => (
                <WaypointCard
                  key={String(lm.id)}
                  index={i}
                  landmark={lm}
                  walkMin={lm.walkMin}
                  isFirst={i === 0}
                />
              ))}
            </View>

            {/* Open in Maps */}
            <Pressable style={styles.mapsBtn} onPress={openInMaps}>
              <MapPin size={16} color="white" strokeWidth={2} />
              <Text style={styles.mapsBtnText}>Open in Maps</Text>
              <ChevronRight size={16} color="white" strokeWidth={2} />
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
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
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Banners
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, marginBottom: 10,
  },
  bannerText: { fontSize: 13, color: '#374151', flex: 1 },

  // Time budget
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 4, paddingRight: 4 },
  timeChip: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white',
  },
  timeChipCustom: { flexDirection: 'row', gap: 5, paddingHorizontal: 14 },
  timeChipActive: { borderColor: '#F5A623', backgroundColor: '#FEF3C7' },
  timeChipDisabled: { opacity: 0.38 },
  timeChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  timeChipTextActive: { color: '#92400E' },
  timeChipTextDisabled: { color: '#9CA3AF' },

  // Custom time picker
  customPicker: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 4,
    borderWidth: 1.5, borderColor: '#F5A623',
    shadowColor: '#F5A623', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 2,
    gap: 0,
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
  contextHUD: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  contextItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  contextTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  contextSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  contextDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
    alignSelf: 'center',
  customUnit: { flex: 1, alignItems: 'center', gap: 4 },
  adjBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
  },
  adjVal: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', lineHeight: 30 },
  adjLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  customDivider: { width: 1, height: 70, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 8 },
  farAwayNote: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    position: 'absolute', bottom: 8, right: 12,
  },
  farAwayText: { fontSize: 10, color: '#7C3AED', fontWeight: '600' },

  // Categories
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5, backgroundColor: 'white',
  },
  catChipText: { fontSize: 12, fontWeight: '600' },

  // Build button
  buildBtn: { marginTop: 24, marginBottom: 4, borderRadius: 16, overflow: 'hidden' },
  buildBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  buildBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 16, marginTop: 20, marginBottom: 4,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  statLbl: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Waypoints
  waypointList: { marginTop: 16, gap: 0 },
  waypointRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
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

  // Open in Maps
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1A1A2E',
    paddingVertical: 14, borderRadius: 14, marginTop: 16,
  },
  mapsBtnText: { color: 'white', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
});
