import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHUD } from '../components/explorify/TopHUD';
import TomTomMap from '../components/explorify/TomTomMap';
import { useTheme } from '../context/ThemeContext';
import { getCurrentLocation } from '../services/location';
import { nearbySearch } from '../services/tomtom';

const { height: H } = Dimensions.get('window');

export default function MapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, setMode } = useTheme();
  const [showSheet, setShowSheet] = useState(false);
  const [landmarks, setLandmarks] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const sheetAnim = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const questY = useRef(new Animated.Value(60)).current;
  const questOpacity = useRef(new Animated.Value(0)).current;

  const loadNearby = useCallback(async () => {
    try {
      setLoading(true);
      const loc = await getCurrentLocation();
      setUserLocation(loc);
      const results = await nearbySearch(loc.latitude, loc.longitude, 1000, 20);
      setLandmarks(results);
    } catch (e) {
      console.warn('MapScreen load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNearby();
    Animated.parallel([
      Animated.timing(questY, { toValue: 0, delay: 800, duration: 400, useNativeDriver: true }),
      Animated.timing(questOpacity, { toValue: 1, delay: 800, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const openSheet = () => {
    setShowSheet(true);
    Animated.parallel([
      Animated.spring(sheetAnim, { toValue: 0, damping: 28, stiffness: 280, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setShowSheet(false));
  };

  const goToLandmark = (landmarkId) => {
    const landmark = landmarks.find((l) => String(l.id) === String(landmarkId));
    if (!landmark) return;
    setMode('discovery');
    navigation.navigate('LandmarkDetail', { landmark });
  };

  const TAB_BOTTOM = insets.bottom + 80;

  return (
    <View style={styles.container}>
      {/* TomTom real map */}
      {userLocation ? (
        <TomTomMap
          ref={mapRef}
          lat={userLocation.latitude}
          lon={userLocation.longitude}
          landmarks={landmarks}
          primaryColor={theme.primary}
          style={StyleSheet.absoluteFill}
          onMarkerPress={goToLandmark}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Getting your location…
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Top HUD — sits above map */}
      <TopHUD level={12} currentXP={2340} maxXP={3000} streak={7} />

      {/* Active Quest Strip */}
      <Animated.View
        style={[
          styles.questStrip,
          {
            bottom: TAB_BOTTOM + 12,
            borderLeftColor: theme.primary,
            transform: [{ translateY: questY }],
            opacity: questOpacity,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.questTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            Downtown Heritage Trail
          </Text>
          <Text style={[styles.questSub, { color: theme.textSecondary }]}>In progress</Text>
        </View>
        <View style={[styles.questBadge, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.questBadgeText, { color: theme.primary }]}>2 / 3</Text>
        </View>
      </Animated.View>

      {/* Nearby FAB */}
      <Pressable
        onPress={() => navigation.navigate('Nearby', { userLocation })}
        style={[styles.fab, { bottom: TAB_BOTTOM + 80, right: 16, backgroundColor: theme.primary }]}
      >
        <Text style={styles.fabEmoji}>📡</Text>
        {landmarks.length > 0 && (
          <View style={[styles.fabBadge, { backgroundColor: theme.secondary }]}>
            <Text style={styles.fabBadgeText}>{landmarks.length}</Text>
          </View>
        )}
      </Pressable>

      {/* Create Expedition FAB */}
      <Pressable
        onPress={openSheet}
        style={[styles.fab, { bottom: TAB_BOTTOM + 80, left: 16, backgroundColor: '#FF6B6B' }]}
      >
        <Text style={styles.fabEmoji}>＋</Text>
      </Pressable>

      {/* Action Sheet */}
      {showSheet && (
        <>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
              What do you want to share?
            </Text>
            <Pressable
              style={[styles.sheetOption, { backgroundColor: '#FFF5F5' }]}
              onPress={closeSheet}
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
            <Pressable onPress={closeSheet} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapPlaceholder: {
    backgroundColor: '#F2E8C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: { alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  questStrip: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.93)',
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
  },
  questTitle: { fontSize: 14, fontWeight: '600' },
  questSub: { fontSize: 12, marginTop: 1 },
  questBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  questBadgeText: { fontSize: 13, fontWeight: '600' },
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
  },
  fabEmoji: { fontSize: 22, color: 'white' },
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
  fabBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  overlay: { backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 40 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
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
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
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
  sheetOptTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  sheetOptSub: { fontSize: 12 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: 14, fontWeight: '500' },
});
