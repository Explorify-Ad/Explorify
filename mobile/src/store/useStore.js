import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';

const STORAGE_KEY = '@explorify_v1';
const XP_PER_LEVEL = 500;

export const TIER_XP = { public: 150, discovered: 320, hidden: 600 };

export const QUESTS = [
  { id: 'q_arch',    title: 'Heritage Trail',    category: 'Architecture', emoji: '🏛️', baseXp: 600, difficulty: 3, bg: '#64748b' },
  { id: 'q_food',    title: 'Street Food Safari', category: 'Food',         emoji: '🍽️', baseXp: 400, difficulty: 1, bg: '#f97316' },
  { id: 'q_history', title: 'Through the Ages',   category: 'History',      emoji: '⚔️', baseXp: 550, difficulty: 2, bg: '#d97706' },
  { id: 'q_art',     title: 'Art Discovery',      category: 'Art',          emoji: '🎨', baseXp: 500, difficulty: 2, bg: '#ec4899' },
  { id: 'q_nature',  title: 'Into the Wild',      category: 'Nature',       emoji: '🌿', baseXp: 450, difficulty: 2, bg: '#22c55e' },
  { id: 'q_night',   title: 'After Dark',         category: 'Nightlife',    emoji: '🌃', baseXp: 700, difficulty: 3, bg: '#7c3aed' },
  { id: 'q_viking',  title: 'The Viking Trail',   category: 'History',      emoji: '🛡️', baseXp: 900, difficulty: 4, bg: '#0f172a', isNarrative: true },
];

const EXPLORER_TYPES = {
  Architecture: { type: 'Heritage Seeker',   desc: 'You go deep into history, one stone at a time.' },
  Food:         { type: 'Culinary Explorer', desc: 'You find the best gems through flavour.' },
  Nature:       { type: 'Wilderness Scout',  desc: 'You find peace where the city goes quiet.' },
  Art:          { type: 'Gallery Wanderer',  desc: 'Beauty and expression guide your path.' },
  History:      { type: 'Time Traveller',    desc: 'Every street corner is a chapter waiting to be read.' },
  Nightlife:    { type: 'Night Owl',         desc: 'The city only truly wakes up after dark for you.' },
};

const DAILY_CATEGORY_EMOJIS = {
  Architecture: '🏛️', Food: '🍽️', Nature: '🌿',
  History: '⚔️', Art: '🎨', Nightlife: '🌃',
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

function getQuestTarget(level) {
  return Math.min(3 + Math.floor(level / 3), 8);
}

function getQuestXP(quest, target) {
  return Math.round(quest.baseXp * (target / 3));
}

const useStore = create((set, get) => ({
  interests: [],          
  collection: [],         
  activeQuestId: null,    
  landmarks: [],          
  preferences: {
    walking_speed_kmh: 4.5,
    category_dwell_multipliers: {},
    visitor_type: 'tourist',
    accessibility_min: 0,
    group_context: 'solo',
    abandonment_streak: 0,
  },
  quests: [],             
  communities: [],        
  userBadges: [],         
  completedQuests: [],    
  questBonusXP: 0,        
  dailyClaimed: {},
  dailyChallenge: null,
  refinementMessage: null,       
  walkPaceSamples: [],     // last 10 samples
  lastCheckIn: null,       // for walk segment calculation
  hydrated: false,
  authUser: null,          
  isAuthenticated: false,
  driftAlert: null,
  refinementMessage: null,

  // ─── Actions ──────────────────────────────────────────────────────────────

  fetchQuests: async () => {
    // Compute quest progress locally from the check-in collection
    const { collection } = get();
    const questsWithProgress = QUESTS.map((quest) => {
      const progress_count = collection.filter(
        (c) => c.category?.toLowerCase() === quest.category.toLowerCase()
      ).length;
      return { ...quest, progress_count, required_count: 3, quest_type: 'personal' };
    });
    set({ quests: questsWithProgress });
  },

  fetchCommunities: async () => {
    try {
      const { fetchCommunities } = await import('../services/supabase');
      const { authUser } = get();
      const data = await fetchCommunities(authUser?.id);
      set({ communities: data });
    } catch (err) {
      console.warn('fetchCommunities error:', err);
    }
  },

  fetchRecommendations: async () => {
    // Landmark recommendations are handled by the Supabase service + MapScreen directly
    return [];
  },

  joinCommunity: async (communityId) => {
    try {
      const { joinCommunity } = await import('../services/supabase');
      const { authUser } = get();
      if (!authUser?.id) throw new Error('Auth required');
      
      await joinCommunity(communityId, authUser.id);
      await get().fetchCommunities();
      await get().fetchQuests();
    } catch (err) {
      console.warn('joinCommunity error:', err);
      throw err;
    }
  },

  setPreferences: (prefs) => {
    set({ preferences: { ...get().preferences, ...prefs } });
    get()._persist();
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

  completeOnboarding: async (interests, userName = 'Explorer', visitorType = 'tourist', onboardingPrefs = {}) => {
    const catMap = {
      architecture: 'q_arch', food: 'q_food', history: 'q_history',
      art: 'q_art', nature: 'q_nature', nightlife: 'q_night',
    };
    const defaultQuest = catMap[interests[0]] || 'q_arch';
    set({ 
      hasOnboarded: true, 
      interests, 
      userName, 
      activeQuestId: defaultQuest,
      preferences: { ...get().preferences, visitor_type: visitorType, ...onboardingPrefs }
    });
    await get()._persist();
    const { authUser } = get();
    if (authUser?.id) {
      const { saveUserProfile } = await import('../services/supabase');
      await saveUserProfile(authUser.id, { displayName: userName, interests, visitorType, preferences: onboardingPrefs });
    }
  },

  checkIn: async (landmark, feedback = {}) => {
    const { collection, lastCheckIn, preferences, authUser } = get();

    // Prevent duplicate check-ins
    if (collection.find((c) => String(c.id) === String(landmark.id))) return { xp: 0 };

    const now = Date.now();

    // Record walking pace sample from segment between consecutive check-ins
    if (lastCheckIn) {
      const elapsedSec = (now - lastCheckIn.timestamp) / 1000;
      const elapsedMin = elapsedSec / 60;
      if (elapsedMin >= 2 && elapsedMin <= 90) {
        try {
          const { haversineDistance } = require('../services/tomtom');
          const distM = haversineDistance(
            lastCheckIn.lat, lastCheckIn.lon,
            landmark.lat ?? landmark.latitude,
            landmark.lon ?? landmark.longitude,
          );
          if (distM >= 50 && distM <= 5000) {
            get().recordWalkSegment(distM, elapsedSec);
          }
        } catch (_) {}
      }
    }

    const xp = TIER_XP[landmark.tier] || 150;
    const entry = {
      ...landmark,
      checkedInAt: new Date().toISOString(),
      xpEarned: xp,
      rating: feedback.rating,
      notes: feedback.notes,
    };

    set((state) => ({
      collection: [...state.collection, entry],
      lastCheckIn: {
        lat: landmark.lat ?? landmark.latitude,
        lon: landmark.lon ?? landmark.longitude,
        timestamp: now,
      },
    }));

    // Fire-and-forget save to Supabase (won't block or error the UI)
    if (authUser?.id) {
      import('../services/supabase').then(({ saveCheckIn }) => {
        saveCheckIn(authUser.id, landmark, xp, feedback).catch(() => {});
      });
    }

    // Update quest progress from the now-updated collection
    await get().fetchQuests();
    await get()._persist();
    return { xp };
  },

  recordWalkSegment: async (distanceM, durationSec) => {
    const paceKmh = (distanceM / 1000) / (durationSec / 3600);
    // Sanity check: only accept realistic walking speeds (1–10 km/h)
    if (paceKmh < 1 || paceKmh > 10) return;
    set((state) => ({
      walkPaceSamples: [
        ...state.walkPaceSamples.slice(-9),
        { distanceM, durationSec, paceKmh, timestamp: Date.now() },
      ],
    }));
    await get()._persist();
  },

  setActiveQuest: async (questId) => {
    set({ activeQuestId: questId });
    await get()._persist();
  },

  // ─── Computed Getters ─────────────────────────────────────────────────────
  
  getFormattedQuests: () => {
    const bgMap = { Architecture: '#64748b', Food: '#f97316', History: '#d97706', Art: '#ec4899', Nature: '#22c55e', Nightlife: '#7c3aed' };
    const emojiMap = { Architecture: '🏛️', Food: '🍽️', History: '⚔️', Art: '🎨', Nature: '🌿', Nightlife: '🌃' };
    const apiQuests = get().quests;
    const items = apiQuests.length > 0 ? apiQuests : QUESTS; // Fallback to mock if API hasn't loaded
    return items.map(q => ({
      ...q,
      xp: q.reward_xp || q.baseXp || 500,
      target: q.required_count || 3,
      progress: q.progress_count || 0,
      emoji: q.emoji || emojiMap[q.category] || '🗺️',
      bg: q.bg || bgMap[q.category] || '#64748b',
    }));
  },

  getActiveQuest: () => {
    const fq = get().getFormattedQuests();
    const activeId = get().activeQuestId;
    return fq.find(q => q.id === activeId) || fq[0] || { target: 1, progress: 0, title: 'No Quest', xp: 0 };
  },

  getSuggestedQuests: () => {
    const fq = get().getFormattedQuests();
    const active = get().activeQuestId;
    const completed = get().completedQuests;
    return fq.filter(q => q.id !== active && !completed.includes(q.id));
  },

  completeQuest: async (questId) => {
    const level = computeLevel(get().getTotalXP());
    const questDef = QUESTS.find((q) => q.id === questId);
    const xp = questDef ? getQuestXP(questDef, getQuestTarget(level)) : 500;
    set((state) => ({
      questBonusXP: state.questBonusXP + xp,
      completedQuests: [...state.completedQuests, questId],
      activeQuestId: null,
    }));
    await get()._persist();
  },

  fetchDailyChallenge: async () => {
    const { interests, collection, dailyClaimed } = get();
    const today = new Date().toDateString();
    const claimed = !!dailyClaimed[today];

    const catMap = {
      architecture: 'Architecture', food: 'Food', history: 'History',
      art: 'Art', nature: 'Nature', nightlife: 'Nightlife',
    };
    const cats = interests.length > 0
      ? interests.map((i) => catMap[i]).filter(Boolean)
      : ['Architecture'];

    // Deterministic category selection: rotate by day-of-year
    const dayOfYear = Math.floor(
      (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
    );
    const category = cats[dayOfYear % cats.length];
    const emoji = DAILY_CATEGORY_EMOJIS[category] || '🌍';
    const target = 2;
    const progress = collection.filter(
      (c) =>
        c.category?.toLowerCase() === category.toLowerCase() &&
        new Date(c.checkedInAt).toDateString() === today
    ).length;

    set({
      dailyChallenge: {
        category,
        emoji,
        target,
        progress,
        title: `Daily ${category} Challenge`,
        description: `Visit ${target} ${category} spot${target > 1 ? 's' : ''} today`,
        xpBonus: 100,
        achieved: progress >= target,
        claimed,
      },
    });
  },

  fetchRefinement: async () => {
    // Refinement messages require the backend LLM service.
    // When the backend is running, this will work automatically.
    // No-op if backend is unavailable.
    try {
      const { authUser, collection } = get();
      if (!authUser?.id) return;
      const api = (await import('../services/api')).default;
      const recent = collection.slice(-5);
      const response = await api.post('/profile/refinement', {
        user_id: authUser.id, recentVisits: recent,
      });
      set({ refinementMessage: response.data.message });
    } catch (_) {}
  },

  getDailyChallenge: () => {
    return get().dailyChallenge || {
      target: 3, progress: 0, category: 'Exploring', emoji: '🌍', xpBonus: 100, title: 'Loading...', description: 'Loading your daily challenge...', achieved: false, claimed: false
    };
  },

  claimDailyChallenge: () => {
    const today = new Date().toDateString();
    set(state => ({
      questBonusXP: state.questBonusXP + 100,
      dailyClaimed: { ...state.dailyClaimed, [today]: true }
    }));
  },

  /** Returns learned walk pace in km/h. Falls back to 4.5 until 2+ samples exist. */
  getWalkPaceKmh: () => {
    const { walkPaceSamples } = get();
    if (walkPaceSamples.length < 2) return 4.5;
    const avg = walkPaceSamples.reduce((s, p) => s + p.paceKmh, 0) / walkPaceSamples.length;
    return Math.max(1.5, Math.min(8, avg)); // clamp to realistic range
  },
  getTotalXP: () =>
    get().collection.reduce((s, c) => s + (c.xpEarned || 150), 0) + get().questBonusXP,
  getLevel: () => computeLevel(get().getTotalXP()),
  getCurrentXP: () => get().getTotalXP() % XP_PER_LEVEL,
  getStreak: () => computeStreak(get().collection),

  /**
   * Returns categories sorted by affinity score (0–100).
   * Recent check-ins are weighted more heavily (exponential decay over 90 days).
   */
  getCategoryAffinities: () => {
    const { collection } = get();
    if (!collection.length) return [];
    const now = Date.now();
    const weights = {};
    collection.forEach((c) => {
      if (!c.category) return;
      const daysAgo = (now - new Date(c.checkedInAt).getTime()) / 86400000;
      const weight = Math.exp(-daysAgo / 45); // half-life ≈ 45 days
      weights[c.category] = (weights[c.category] || 0) + weight;
    });
    const maxW = Math.max(...Object.values(weights), 1);
    return Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .map(([category, w]) => ({ category, affinity: Math.round((w / maxW) * 100) }));
  },

  /**
   * Returns which tiers are unlocked based on the user's current XP level.
   * public: always; discovered: Level 2+; hidden: Level 6+.
   * Thresholds:  Level 1 = 0–499 XP, Level 6 = 2,500–2,999 XP.
   * This means Sophie (0 XP) = public only; Alice (~2,180 XP) = discovered;
   * Marco (~2,720 XP) = all tiers; Dev (5,000 XP) = all tiers.
   */
  getUnlockedTiers: () => {
    const level = computeLevel(get().getTotalXP());
    return { public: true, discovered: level >= 2, hidden: level >= 6 };
  },

  getExplorerType: () => {
    const { collection, interests } = get();
    if (!collection.length) {
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
    const { collection, completedQuests } = get();
    const cities = new Set(collection.map((c) => c.city).filter(Boolean)).size || 1;
    return {
      landmarks: collection.length,
      quests: completedQuests.length,
      streak: computeStreak(collection),
      cities,
    };
  },

  // ─── Internal ───

  _persist: async () => {
    const {
      hasOnboarded, userName, interests, collection,
      activeQuestId, preferences, quests, 
      communities, userBadges, completedQuests, 
      questBonusXP, dailyClaimed,
      walkPaceSamples, lastCheckIn,
    } = get();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          hasOnboarded, userName, interests, collection,
          activeQuestId, preferences, quests, 
          communities, userBadges, completedQuests, 
          questBonusXP, dailyClaimed,
          walkPaceSamples, lastCheckIn,
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

  syncFromSupabase: async () => {
    const { authUser } = get();
    if (!authUser?.id) return;
    try {
      const { fetchCollections, fetchUserProfile } = await import('../services/supabase');
      const [serverCollection, profile] = await Promise.all([
        fetchCollections(authUser.id),
        fetchUserProfile(authUser.id),
      ]);

      // Drift detection is computed server-side by the backend drift service.
      // When the backend is running, drift data is stored in users.drift_detected_at
      // and can be read from the profile. No mobile-side API call needed.
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
        get().fetchDailyChallenge();
        get().fetchRefinement();
      }
    } catch (e) {
      console.warn('syncFromSupabase error:', e.message);
    }
  },
}));

export default useStore;
