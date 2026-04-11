import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHUD } from '../components/explorify/TopHUD';
import TomTomMap from '../components/explorify/TomTomMap';
import { useTheme } from '../context/ThemeContext';
import { getCurrentLocation } from '../services/location';
import { fetchAllLandmarks, fetchActiveExpeditions } from '../services/supabase';
import useStore from '../store/useStore';
import useBattery from '../hooks/useBattery';
import { buildPreferences } from '../utils/recommendations';

export default function MapScreen() {
  const navigation = useNavigation();

  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();

  const getActiveQuest = useStore((s) => s.getActiveQuest);
  const authUser    = useStore((s) => s.authUser);
  const interests   = useStore((s) => s.interests);
  const visitorType = useStore((s) => s.visitorType);
  const collection  = useStore((s) => s.collection);
  const activeQuest = getActiveQuest();
  const { tier: batteryTier, batteryLevel, isCharging } = useBattery();

  const [showSheet, setShowSheet] = useState(false);
  const [landmarks, setLandmarks] = useState([]);
  const [expeditions, setExpeditions] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);


  const mapRef = useRef(null);

  const sheetAnim = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const questY = useRef(new Animated.Value(40)).current;
  const questOpacity = useRef(new Animated.Value(0)).current;

  // Fallback to TCD Dublin if location is unavailable
  const FALLBACK_LOC = { latitude: 53.3438, longitude: -6.2546 };

  const loadNearby = useCallback(async () => {
    setLoading(true);
    let loc = FALLBACK_LOC;
    try {
      loc = await getCurrentLocation();
    } catch (e) {
      console.warn('Location unavailable, using fallback:', e?.message);
    }
    setUserLocation(loc);
    try {
      const [results, exps] = await Promise.all([
        fetchAllLandmarks(loc.latitude, loc.longitude),
        fetchActiveExpeditions(loc.latitude, loc.longitude),
      ]);
      setLandmarks(results || []);

      // Compute DNA match scores using store state at call time
      const { interests: ints, preferences: prefs, collection: col } = useStore.getState();
      const visitorType = prefs.visitor_type || 'tourist';
      const userPreferences = buildPreferences({ interests: ints, visitorType, collection: col });
      const userCats = new Set(userPreferences.preferred_categories);
      const categoryCounts = userPreferences.category_counts || {};

      const withMatch = (exps || []).map((exp) => {
        const expCats = exp.categories || [];
        if (!expCats.length) return { ...exp, dnaMatch: 50 };
        let score = 0;
        expCats.forEach((cat) => {
          if (userCats.has(cat)) score += 40;
          if ((categoryCounts[cat] || 0) >= 3) score += 20;
          else if ((categoryCounts[cat] || 0) >= 1) score += 8;
        });
        const raw = Math.round(score / expCats.length);
        return { ...exp, dnaMatch: Math.max(28, Math.min(97, raw + 30)) };
      });

      setExpeditions(withMatch);
    } catch (e) {
      console.warn('MapScreen data load error:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNearby();
    }, [loadNearby]),
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(questY, {
        toValue: 0,
        delay: 500,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(questOpacity, {
        toValue: 1,
        delay: 500,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [questOpacity, questY]);

  const openSheet = () => {
    setShowSheet(true);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSheet(false));
  };

  const goToLandmark = (landmarkId) => {
    const landmark = landmarks.find((l) => String(l.id) === String(landmarkId));
    if (!landmark) return;
    setMode('discovery');
    navigation.navigate('LandmarkDetail', { landmark });
  };

  const goToExpedition = (expeditionId) => {
    const exp = expeditions.find((e) => String(e.id) === String(expeditionId));
    if (!exp) return;

    navigation.navigate('ExpeditionPreview', {
      expedition: {
        id: exp.id,
        title: exp.title,
        description: exp.description || 'Join this exciting expedition!',
        companyType: exp.company_type || 'friends',
        created_by: exp.created_by,
        memberCount: exp.members?.length || 0,
        categories: exp.categories || [],
        dnaMatch: exp.dnaMatch || 85,
        members: (exp.members || []).map((m) => m.user_name?.[0] || '?'),
        memberIds: (exp.members || []).map((m) => m.user_id),
        spotsLeft: Math.max(0, (exp.group_size || 4) - (exp.members?.length || 0)),
        meetingPoint: exp.landmark_name || 'Meeting point TBD',
        startsIn: 'Now',
        landmark: exp.landmark_name ? { name: exp.landmark_name } : null,
        leader: { name: exp.creator_name, type: 'Explorer', level: 1, avatar: exp.creator_name?.[0] || 'E' },
        reasons: exp.categories?.slice(0, 2).map(c => `${c} Expert Match`) || ['Local Discovery']
      },
    });
  };


  // Expedition (if any) that the current user has joined
  const myExpedition = expeditions.find((e) =>
    e.members?.some((m) => m.user_id === authUser?.id),
  );

  useEffect(() => {
    if (!mapRef.current) return;

    if (myExpedition && userLocation) {
      const waypoints = [
        { lat: userLocation.latitude, lon: userLocation.longitude },
        { lat: myExpedition.landmark_lat, lon: myExpedition.landmark_lon }
      ];
      mapRef.current.drawRoute(waypoints);
    } else if (route.params?.generatedRoute) {
      const landmarks = route.params.generatedRoute;
      const waypoints = [
        ...(userLocation ? [{ lat: userLocation.latitude, lon: userLocation.longitude }] : []),
        ...landmarks.map(l => ({ lat: parseFloat(l.latitude), lon: parseFloat(l.longitude) }))
      ];
      mapRef.current.drawRoute(waypoints);
    } else {
      mapRef.current.clearRoute();
    }
  }, [myExpedition, userLocation, route.params?.generatedRoute]);



  const progress = activeQuest?.progress ?? 0;
  const target = activeQuest?.target ?? 0;
  const questTitle = activeQuest?.title || 'No active quest';
  const questStatus =
    target > 0 && progress >= target ? 'Complete! 🎉' : 'In progress';

  const QUEST_BOTTOM = 10;
  const FAB_BOTTOM = QUEST_BOTTOM + 72;

  // Narrative Quest Locking (Phase 7.3)
  const isNarrative = activeQuest?.isNarrative;
  const filteredLandmarks = isNarrative 
    ? [landmarks[progress % landmarks.length]] // Only show the next one in sequence
    : landmarks;

  const refinedLandmarks = (filteredLandmarks || []).filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface || '#fff' }]}>
      {userLocation ? (
        <TomTomMap
          ref={mapRef}
          lat={userLocation.latitude}
          lon={userLocation.longitude}
          landmarks={refinedLandmarks}
          expeditions={expeditions}
          primaryColor={theme.primary}
          style={StyleSheet.absoluteFill}
          onMarkerPress={goToLandmark}
          onExpeditionPress={goToExpedition}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Getting your location…
              </Text>
            </View>
          ) : (
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Unable to load map
            </Text>
          )}
        </View>
      )}

      <TopHUD />

      {context && (
        <View style={[styles.contextHUD, { top: insets.top + 80 }]}>
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
                {context.timeSlot === 'Evening' ? 'Lighting & Vibes score+' : 'Activity match+'}
              </Text>
            </View>
          </View>
        </View>
      )}


      {/* Battery warning banner — only shown when not charging and tier is low/critical */}
      {!isCharging && (batteryTier === 'low' || batteryTier === 'critical') && (
        <View style={[
          styles.batteryBanner,
          { backgroundColor: batteryTier === 'critical' ? '#DC2626' : '#D97706' },
        ]}>
          <Text style={styles.batteryText}>
            {batteryTier === 'critical'
              ? `Battery critically low (${Math.round(batteryLevel * 100)}%) — routes limited to 30 min`
              : `Battery low (${Math.round(batteryLevel * 100)}%) — routes capped at 1 hour`}
          </Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.questStrip,
          {
            bottom: QUEST_BOTTOM,
            borderLeftColor: theme.primary,
            transform: [{ translateY: questY }],
            opacity: questOpacity,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.questTitle, { color: theme.textPrimary }]}
            numberOfLines={1}
          >
            {questTitle}
          </Text>
          <Text style={[styles.questSub, { color: theme.textSecondary }]}>
            {questStatus}
          </Text>
        </View>

        <View style={[styles.questBadge, { backgroundColor: `${theme.primary}20` }]}>
          <Text style={[styles.questBadgeText, { color: theme.primary }]}>
            {progress} / {target}
          </Text>
        </View>
      </Animated.View>

      <Pressable
        onPress={() => navigation.navigate('Nearby', { userLocation })}
        style={[
          styles.fab,
          {
            bottom: FAB_BOTTOM,
            right: 16,
            backgroundColor: theme.primary,
          },
        ]}
      >
        <Text style={styles.fabEmoji}>📡</Text>
        {landmarks.length > 0 && (
          <View style={[styles.fabBadge, { backgroundColor: theme.secondary }]}>
            <Text style={styles.fabBadgeText}>{landmarks.length}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={openSheet}
        style={[
          styles.fab,
          {
            bottom: FAB_BOTTOM + 80, // Moved up to leave space for Next Best
            left: 16,
            backgroundColor: '#FF6B6B',
          },
        ]}
      >
        <Text style={styles.fabEmoji}>＋</Text>
      </Pressable>

      {/* Next Best Local Guidance */}
      {refinedLandmarks.length > 0 && !showSheet && (
        <View style={[styles.nextBestCard, { bottom: FAB_BOTTOM - 20 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextBestLabel}>
              {isNarrative ? 'Next Quest Step 🛡️' : 'Next Best 🚀'}
            </Text>
            <Text style={styles.nextBestTitle} numberOfLines={1}>{refinedLandmarks[0].name}</Text>
            <Text style={styles.nextBestReason} numberOfLines={1}>
              {isNarrative 
                ? `Story progress: Step ${progress + 1}` 
                : (refinedLandmarks[0].ai_reasons ? refinedLandmarks[0].ai_reasons[0] : (refinedLandmarks[0].reasons ? refinedLandmarks[0].reasons[0] : 'Matches your profile'))}
            </Text>
          </View>
          <Pressable style={styles.nextBestGoBtn} onPress={() => goToLandmark(refinedLandmarks[0].id)}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Go</Text>
          </Pressable>
        </View>
      )}

      {showSheet && (
        <>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom + 24,
                transform: [{ translateY: sheetAnim }],
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
              What do you want to share?
            </Text>

            {myExpedition && (
              <Pressable
                style={[styles.sheetOption, { backgroundColor: '#FFF0F0', borderWidth: 1.5, borderColor: '#FF6B6B' }]}
                onPress={() => {
                  closeSheet();
                  navigation.navigate('ExpeditionChat', {
                    expedition: { id: myExpedition.id, title: myExpedition.title, memberCount: myExpedition.members?.length || 0, landmark: myExpedition.landmark_name ? { name: myExpedition.landmark_name } : null },
                  });
                }}
              >
                <View style={styles.sheetOptIcon}>
                  <Text style={{ fontSize: 24 }}>⚡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetOptTitle, { color: '#FF6B6B' }]}>
                    Continue Expedition
                  </Text>
                  <Text style={[styles.sheetOptSub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {myExpedition.title}
                  </Text>
                </View>
              </Pressable>
            )}

            <Pressable
              style={[styles.sheetOption, { backgroundColor: '#FFF5F5' }]}
              onPress={() => { closeSheet(); navigation.navigate('CreateExpedition', { userLocation, landmarks }); }}
            >
              <View style={styles.sheetOptIcon}>
                <Text style={{ fontSize: 24 }}>🗺️</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetOptTitle, { color: theme.textPrimary }]}>
                  Start an Expedition
                </Text>
                <Text style={[styles.sheetOptSub, { color: theme.textSecondary }]}>
                  Invite others to explore with you
                </Text>
              </View>
            </Pressable>

            <Pressable style={[styles.sheetOption, { backgroundColor: '#FFF8EC' }]}>
              <View style={styles.sheetOptIcon}>
                <Text style={{ fontSize: 24 }}>📍</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetOptTitle, { color: theme.textPrimary }]}>
                  Share a Spot
                </Text>
                <Text style={[styles.sheetOptSub, { color: theme.textSecondary }]}>
                  Post a landmark you discovered
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.sheetOption, { backgroundColor: '#F0F4FF' }]}
              onPress={() => { closeSheet(); navigation.navigate('MyExpeditions'); }}
            >
              <View style={styles.sheetOptIcon}>
                <Text style={{ fontSize: 24 }}>🗂️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetOptTitle, { color: theme.textPrimary }]}>
                  My Expeditions
                </Text>
                <Text style={[styles.sheetOptSub, { color: theme.textSecondary }]}>
                  Manage active and past expeditions
                </Text>
              </View>
            </Pressable>

            <Pressable onPress={closeSheet} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapPlaceholder: {
    backgroundColor: '#F2E8C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  batteryBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 88,           // below TopHUD
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 20,
  },
  batteryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  questStrip: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 20,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  questSub: {
    fontSize: 12,
    marginTop: 1,
  },
  questBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  questBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 21,
  },
  fabEmoji: {
    fontSize: 22,
    color: 'white',
  },
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 40,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
  },
  sheetOptIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sheetOptSub: {
    fontSize: 12,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contextHUD: {
    position: 'absolute',
    left: 14, right: 14,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 10,
  },
  contextItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextEmoji: { fontSize: 20 },
  contextTitle: { fontSize: 12, fontWeight: '700', color: '#374151' },
  contextSub: { fontSize: 9, color: '#9CA3AF', marginTop: 1 },
  contextDivider: {
    width: 1, height: '70%',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 10,
    alignSelf: 'center',
  },
  nextBestCard: {
    position: 'absolute',
    left: 88, right: 88,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 15,
  },
  nextBestLabel: { color: '#F59E0B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  nextBestTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginVertical: 2 },
  nextBestReason: { fontSize: 11, color: '#6B7280' },
  nextBestGoBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 10,
  }
});
