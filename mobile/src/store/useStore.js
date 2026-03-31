import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';

const STORAGE_KEY = '@explorify_v1';
const XP_PER_LEVEL = 500;

export const TIER_XP = { public: 150, discovered: 320, hidden: 600 };

export const QUESTS = [
  { id: 'q_arch',     title: 'Heritage Trail',     category: 'Architecture', emoji: '🏛️', target: 3, xp: 600, difficulty: 3, bg: '#64748b' },
  { id: 'q_food',     title: 'Street Food Safari',  category: 'Food',         emoji: '🍽️', target: 3, xp: 400, difficulty: 1, bg: '#f97316' },
  { id: 'q_history',  title: 'Through the Ages',    category: 'History',      emoji: '⚔️', target: 3, xp: 550, difficulty: 2, bg: '#d97706' },
  { id: 'q_art',      title: 'Art Discovery',       category: 'Art',          emoji: '🎨', target: 3, xp: 500, difficulty: 2, bg: '#ec4899' },
  { id: 'q_nature',   title: 'Into the Wild',       category: 'Nature',       emoji: '🌿', target: 3, xp: 450, difficulty: 2, bg: '#22c55e' },
  { id: 'q_night',    title: 'After Dark',          category: 'Nightlife',    emoji: '🌃', target: 3, xp: 700, difficulty: 3, bg: '#7c3aed' },
];

const EXPLORER_TYPES = {
  Architecture: { type: 'Heritage Seeker',    desc: 'You go deep into history, one stone at a time.' },
  Food:         { type: 'Culinary Explorer',  desc: 'You find the best gems through flavour.' },
  Nature:       { type: 'Wilderness Scout',   desc: 'You find peace where the city goes quiet.' },
  Art:          { type: 'Gallery Wanderer',   desc: 'Beauty and expression guide your path.' },
  History:      { type: 'Time Traveller',     desc: 'Every street corner is a chapter waiting to be read.' },
  Nightlife:    { type: 'Night Owl',          desc: 'The city only truly wakes up after dark for you.' },
};

function computeLevel(totalXP) {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

function computeStreak(collection) {
  if (!collection.length) return 0;
  const byDay = {};
  collection.forEach((item) => {
    const day = new Date(item.checkedInAt).toDateString();
    byDay[day] = true;
  });
  let streak = 0;
  const cur = new Date();
  while (byDay[cur.toDateString()]) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

const useStore = create((set, get) => ({
  // ─── Persisted state ──────────────────────────────────────────────────────
  hasOnboarded: false,
  userName: 'Explorer',
  interests: [],          // array of category ids from onboarding
  collection: [],         // checked-in landmarks with metadata
  activeQuestId: null,    // id from QUESTS
  preferences: {          // Adaptive preferences from backend
    walking_speed_kmh: 4.5,
    category_dwell_multipliers: {},
    visitor_type: 'tourist',
    abandonment_streak: 0,
  },
  quests: [],             // User quests from backend
  communities: [],        // All available communities
  userBadges: [],         // Awarded badges
  hydrated: false,

  // ─── Auth state (not persisted — Supabase session handles it) ─────────────
  authUser: null,         // { id, email, name }
  isAuthenticated: false,

  // ─── Actions ──────────────────────────────────────────────────────────────

  fetchQuests: async () => {
    try {
      const api = (await import('../services/api')).default;
      const response = await api.get('/quests');
      set({ quests: response.data.data });
    } catch (err) {
      console.warn('fetchQuests error:', err);
    }
  },

  fetchCommunities: async () => {
    try {
      const api = (await import('../services/api')).default;
      const response = await api.get('/quests/communities');
      set({ communities: response.data.data });
    } catch (err) {
      console.warn('fetchCommunities error:', err);
    }
  },

  joinCommunity: async (communityId) => {
    try {
      const api = (await import('../services/api')).default;
      await api.post('/quests/join-community', { communityId });
      await get().fetchCommunities();
      await get().fetchQuests();
    } catch (err) {
      console.warn('joinCommunity error:', err);
    }
  },

  setPreferences: (prefs) => {
    set({ preferences: { ...get().preferences, ...prefs } });
  },

  setAuthUser: (user, token) => {
    set({
      authUser: user,
      isAuthenticated: !!user,
      userName: user?.name || get().userName,
    });
    setAuthToken(token);
  },

  signOut: async () => {
    const supabase = (await import('../services/supabase')).default;
    await supabase.auth.signOut();
    set({ authUser: null, isAuthenticated: false });
    setAuthToken(null);
  },

  completeOnboarding: async (interests, userName = 'Explorer') => {
    const catMap = {
      architecture: 'q_arch', food: 'q_food', history: 'q_history',
      art: 'q_art', nature: 'q_nature', nightlife: 'q_night',
    };
    const defaultQuest = catMap[interests[0]] || 'q_arch';
    set({ hasOnboarded: true, interests, userName, activeQuestId: defaultQuest });
    await get()._persist();
    // Save profile to Supabase if logged in
    const { authUser } = get();
    if (authUser?.id) {
      const { saveUserProfile } = await import('../services/supabase');
      await saveUserProfile(authUser.id, { displayName: userName, interests });
    }
  },

  checkIn: async (landmark, feedback = {}) => {
    try {
      const api = (await import('../services/api')).default;
      const response = await api.post('/collections', {
        landmark_id: landmark.id,
        dwell_time_min: feedback.dwellTime || 0,
        rating: feedback.rating || 0,
        notes: feedback.notes || '',
      });

      const { data, outcomes } = response.data;
      
      const xp = data.points || 150;
      const entry = { 
        ...landmark, 
        checkedInAt: new Date().toISOString(), 
        xpEarned: xp,
        rating: feedback.rating,
        notes: feedback.notes
      };

      set((state) => ({ 
        collection: [...state.collection, entry],
        // Refresh quests after check-in to get new progress
      }));

      if (outcomes && outcomes.length > 0) {
        // We can handle specific outcomes here or just re-fetch
        await get().fetchQuests();
      }

      await get()._persist();
      return { xp, outcomes };
    } catch (err) {
      console.warn('checkIn error:', err);
      // Fallback for offline or error (optional)
      return { xp: 0, error: err.message };
    }
  },

  setActiveQuest: async (questId) => {
    set({ activeQuestId: questId });
    await get()._persist();
  },

  // ─── Computed getters ─────────────────────────────────────────────────────

  getTotalXP: () => get().collection.reduce((s, c) => s + (c.xpEarned || 150), 0),
  getLevel: () => computeLevel(get().getTotalXP()),
  getCurrentXP: () => get().getTotalXP() % XP_PER_LEVEL,
  getStreak: () => computeStreak(get().collection),

  getActiveQuest: () => {
    const { activeQuestId, collection, interests } = get();
    // If no quest set, derive from first interest
    const catMap = {
      architecture: 'q_arch', food: 'q_food', history: 'q_history',
      art: 'q_art', nature: 'q_nature', nightlife: 'q_night',
    };
    const id = activeQuestId || catMap[interests[0]] || 'q_arch';
    const quest = QUESTS.find((q) => q.id === id) || QUESTS[0];
    const progress = collection.filter((c) => c.category === quest.category).length;
    return { ...quest, progress: Math.min(progress, quest.target) };
  },

  getSuggestedQuests: () => {
    const { activeQuestId, interests, collection } = get();
    const catMap = {
      architecture: 'q_arch', food: 'q_food', history: 'q_history',
      art: 'q_art', nature: 'q_nature', nightlife: 'q_night',
    };
    // Prefer quests matching interests, exclude active
    const preferred = interests.map((i) => catMap[i]).filter(Boolean);
    const sorted = [...QUESTS].sort((a, b) => {
      const aP = preferred.indexOf(a.id);
      const bP = preferred.indexOf(b.id);
      return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP);
    });
    return sorted.filter((q) => q.id !== activeQuestId).slice(0, 3).map((q) => ({
      ...q,
      progress: collection.filter((c) => c.category === q.category).length,
    }));
  },

  getExplorerType: () => {
    const { collection, interests } = get();
    if (!collection.length) {
      // Fall back to first interest
      const catMap = {
        architecture: 'Architecture', food: 'Food', history: 'History',
        art: 'Art', nature: 'Nature', nightlife: 'Nightlife',
      };
      const cat = catMap[interests[0]];
      return EXPLORER_TYPES[cat] || { type: 'Newcomer', desc: 'Just getting started.' };
    }
    const counts = {};
    collection.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return EXPLORER_TYPES[top?.[0]] || { type: 'Urban Explorer', desc: 'No corner goes unchecked.' };
  },

  getDNAStats: () => {
    const { collection } = get();
    const categories = ['Architecture', 'Food', 'History', 'Art', 'Nature', 'Hidden', 'Nightlife', 'Culture'];
    const counts = {};
    collection.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
    const max = Math.max(...Object.values(counts), 1);
    return categories.map((label) => ({
      label,
      value: Math.round(((counts[label] || 0) / max) * 100),
    }));
  },

  getStats: () => {
    const { collection } = get();
    const cities = new Set(collection.map((c) => c.city).filter(Boolean)).size || 1;
    const completedQuests = QUESTS.filter((q) => {
      const count = collection.filter((c) => c.category === q.category).length;
      return count >= q.target;
    }).length;
    return {
      landmarks: collection.length,
      quests: completedQuests,
      streak: computeStreak(collection),
      cities,
    };
  },

  // ─── Persistence ──────────────────────────────────────────────────────────

  _persist: async () => {
    const { 
      hasOnboarded, userName, interests, collection, 
      activeQuestId, preferences, quests, communities, userBadges 
    } = get();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ 
          hasOnboarded, userName, interests, collection, 
          activeQuestId, preferences, quests, communities, userBadges 
        }),
      );
    } catch {}
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ ...data, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  // Called after login to pull server-side collection into local state
  syncFromSupabase: async () => {
    const { authUser } = get();
    if (!authUser?.id) return;
    try {
      const { fetchCollections, fetchUserProfile } = await import('../services/supabase');
      const [serverCollection, profile] = await Promise.all([
        fetchCollections(authUser.id),
        fetchUserProfile(authUser.id),
      ]);
      const updates = {};
      if (serverCollection?.length) updates.collection = serverCollection;
      if (profile) {
        if (profile.display_name) updates.userName = profile.display_name;
        if (profile.preferences) updates.preferences = profile.preferences;
        if (profile.interests?.length) {
          updates.interests = profile.interests;
          updates.hasOnboarded = true;
        }
      }
      if (Object.keys(updates).length) {
        set(updates);
        await get()._persist();
      }
    } catch (e) {
      console.warn('syncFromSupabase error:', e.message);
    }
  },
}));

export default useStore;
