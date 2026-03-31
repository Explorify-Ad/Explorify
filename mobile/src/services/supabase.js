import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Maps Supabase category names → app category names
const CATEGORY_MAP = {
  historical: 'History',
  cultural: 'Art',
  nature: 'Nature',
  shopping: 'Food',
  sports: 'Architecture',
  architecture: 'Architecture',
  landmark: 'Architecture',
};

// Normalise a Supabase landmark row into the shape the app expects
function normaliseLandmark(row, userLat, userLon) {
  const { haversineDistance } = require('./tomtom');
  const lat = parseFloat(row.latitude);
  const lon = parseFloat(row.longitude);
  const distance = userLat != null
    ? Math.round(haversineDistance(userLat, userLon, lat, lon))
    : null;
  return {
    id: row.id,
    name: row.name,
    lat,
    lon,
    category: CATEGORY_MAP[row.category] || 'Architecture',
    tier: row.tier || 'public',
    address: '',
    description: row.description || '',
    points: row.points || 10,
    distance,
    collected: false,
  };
}

// ─── Landmarks ────────────────────────────────────────────────────────────────

export async function fetchAllLandmarks(userLat, userLon) {
  const { data, error } = await supabase
    .from('landmarks')
    .select('*')
    .order('name');
  if (error) throw error;
  return data.map((row) => normaliseLandmark(row, userLat, userLon));
}

export async function fetchNearbyLandmarks(userLat, userLon, radiusMeters = 1000) {
  const all = await fetchAllLandmarks(userLat, userLon);
  return all
    .filter((lm) => lm.distance != null && lm.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);
}

// ─── Collections ──────────────────────────────────────────────────────────────

export async function saveCheckIn(userId, landmark, xpEarned) {
  const { error } = await supabase.from('collections').upsert({
    user_id: userId,
    landmark_id: isUUID(landmark.id) ? landmark.id : null,
    landmark_name: landmark.name,
    landmark_lat: landmark.lat,
    landmark_lon: landmark.lon,
    landmark_category: landmark.category,
    landmark_tier: landmark.tier,
    xp_earned: xpEarned,
    visited_at: new Date().toISOString(),
  }, { onConflict: 'user_id,landmark_id', ignoreDuplicates: true });
  if (error) console.warn('saveCheckIn error:', error.message);
}

export async function fetchCollections(userId) {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('visited_at', { ascending: false });
  if (error) throw error;
  // Normalise to the same shape the store uses
  return data.map((row) => ({
    id: row.landmark_id || row.id,
    name: row.landmark_name,
    lat: parseFloat(row.landmark_lat),
    lon: parseFloat(row.landmark_lon),
    category: row.landmark_category,
    tier: row.landmark_tier,
    xpEarned: row.xp_earned,
    checkedInAt: row.visited_at,
  }));
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function saveUserProfile(userId, { displayName, interests, visitorType }) {
  const { error } = await supabase.from('user_profiles').upsert({
    id: userId,
    display_name: displayName,
    interests,
    visitor_type: visitorType ?? 'tourist',
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('saveUserProfile error:', error.message);
}

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

// ─── Adaptive routing helpers ─────────────────────────────────────────────────

/**
 * Returns per-category average dwell times (minutes) for a user, keyed by
 * normalised category name (e.g. { History: 42, Art: 18 }).
 * Used to personalise the route service's visit-time estimates.
 */
export async function fetchUserDwellTimes(userId) {
  const { data, error } = await supabase
    .from('collections')
    .select('landmark_category, dwell_time_min')
    .eq('user_id', userId)
    .not('dwell_time_min', 'is', null)
    .gt('dwell_time_min', 0);
  if (error || !data?.length) return null;

  const totals = {};
  const counts = {};
  data.forEach(({ landmark_category, dwell_time_min }) => {
    if (!landmark_category) return;
    totals[landmark_category] = (totals[landmark_category] || 0) + dwell_time_min;
    counts[landmark_category] = (counts[landmark_category] || 0) + 1;
  });

  const avgs = {};
  Object.keys(totals).forEach((cat) => {
    avgs[cat] = Math.round(totals[cat] / counts[cat]);
  });
  return avgs; // { History: 42, Art: 18, ... }
}

/**
 * Returns how many times a user has visited each category.
 * Passed to the route service as preferences.category_counts so the novelty
 * bonus can boost under-explored categories.
 */
export async function fetchCategoryCounts(userId) {
  const { data, error } = await supabase
    .from('collections')
    .select('landmark_category')
    .eq('user_id', userId);
  if (error || !data?.length) return null;

  const counts = {};
  data.forEach(({ landmark_category }) => {
    if (landmark_category) counts[landmark_category] = (counts[landmark_category] || 0) + 1;
  });
  return counts; // { History: 8, Nature: 1, ... }
}

// ─── Expeditions ──────────────────────────────────────────────────────────────

export async function createExpedition(userId, userName, data) {
  // 1. Insert the expedition row
  const { data: exp, error } = await supabase
    .from('expeditions')
    .insert({
      title:         data.title,
      created_by:    userId,
      creator_name:  userName,
      landmark_id:   data.landmarkId   ?? null,
      landmark_name: data.landmarkName ?? null,
      landmark_lat:  data.landmarkLat  ?? null,
      landmark_lon:  data.landmarkLon  ?? null,
      categories:    data.categories   ?? [],
      group_size:    data.groupSize    ?? 4,
      duration:      data.duration     ?? '2hr',
      dna_only:      data.dnaOnly      ?? true,
    })
    .select()
    .single();
  if (error) throw error;

  // 2. Add the creator as the first member
  await joinExpedition(exp.id, userId, userName);

  return exp;
}

export async function joinExpedition(expeditionId, userId, userName) {
  const { error } = await supabase
    .from('expedition_members')
    .upsert({ expedition_id: expeditionId, user_id: userId, user_name: userName },
             { onConflict: 'expedition_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function leaveExpedition(expeditionId, userId) {
  const { error } = await supabase
    .from('expedition_members')
    .delete()
    .eq('expedition_id', expeditionId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchExpeditionMembers(expeditionId) {
  const { data, error } = await supabase
    .from('expedition_members')
    .select('*')
    .eq('expedition_id', expeditionId)
    .order('joined_at');
  if (error) throw error;
  return data;
}

export async function fetchActiveExpeditions(userLat, userLon, radiusMeters = 2000) {
  const { haversineDistance } = require('./tomtom');
  const { data, error } = await supabase
    .from('expeditions')
    .select(`*, expedition_members(user_id, user_name)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return data
    .map((exp) => ({
      ...exp,
      members: exp.expedition_members ?? [],
      distance: (exp.landmark_lat && userLat)
        ? Math.round(haversineDistance(userLat, userLon, exp.landmark_lat, exp.landmark_lon))
        : null,
    }))
    .filter((exp) => exp.distance === null || exp.distance <= radiusMeters);
}

export async function updateExpeditionStatus(expeditionId, status) {
  const { error } = await supabase
    .from('expeditions')
    .update({ status })
    .eq('id', expeditionId);
  if (error) throw error;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function fetchMessages(expeditionId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('expedition_id', expeditionId)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function sendMessage(expeditionId, senderId, senderName, content, type = 'text', metadata = {}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ expedition_id: expeditionId, sender_id: senderId, sender_name: senderName,
              content, type, metadata })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function sendDirectMessage(senderId, senderName, peerId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ dm_peer_id: peerId, sender_id: senderId, sender_name: senderName,
              content, type: 'text', metadata: {} })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchDirectMessages(userId, peerId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .is('expedition_id', null)
    .or(`and(sender_id.eq.${userId},dm_peer_id.eq.${peerId}),and(sender_id.eq.${peerId},dm_peer_id.eq.${userId})`)
    .order('created_at');
  if (error) throw error;
  return data;
}

export function subscribeToMessages(expeditionId, onMessage) {
  return supabase
    .channel(`expedition_messages:${expeditionId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `expedition_id=eq.${expeditionId}`,
    }, (payload) => onMessage(payload.new))
    .subscribe();
}

export function subscribeToDMs(userId, onMessage) {
  return supabase
    .channel(`dm:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `dm_peer_id=eq.${userId}`,
    }, (payload) => onMessage(payload.new))
    .subscribe();
}

export function unsubscribe(channel) {
  supabase.removeChannel(channel);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str));
}

export default supabase;
