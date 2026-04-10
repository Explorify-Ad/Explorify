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
  // ─── State ────────────────────────────────────────────────────────────────
  hasOnboarded: false,
  userName: 'Explorer',
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
  hydrated: false,
  authUser: null,          
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
      const { fetchCommunities } = await import('../services/supabase');
      const { authUser } = get();
      const data = await fetchCommunities(authUser?.id);
      set({ communities: data });
    } catch (err) {
      console.warn('fetchCommunities error:', err);
    }
  },

  fetchRecommendations: async (lat, lng, groupId = null) => {
    try {
      const api = (await import('../services/api')).default;
      const { preferences } = get();
      const response = await api.get('/landmarks/recommendations', {
        params: {
          lat,
          lng,
          group_id: groupId,
          preferences: JSON.stringify(preferences)
        }
      });
      set({ landmarks: response.data.data });
      return response.data.data;
    } catch (err) {
      console.warn('fetchRecommendations error:', err);
      return [];
    }
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
    try {
      const api = (await import('../services/api')).default;
      const { preferences } = get();
      const response = await api.post('/collections', {
        landmark_id: landmark.id,
        dwell_time_min: feedback.dwellTime || 0,
        rating: feedback.rating || 0,
        notes: feedback.notes || '',
        context: {
          weather: preferences.weather || 'unknown',
          group_context: preferences.group_context || 'solo',
          pace: preferences.walking_speed_kmh
        }
      });

      const { data, outcomes } = response.data;
      const xp = data.points || TIER_XP[landmark.tier] || 150;
      const entry = {
        ...landmark,
        checkedInAt: new Date().toISOString(),
        xpEarned: xp,
        rating: feedback.rating,
        notes: feedback.notes
      };

      set((state) => ({
        collection: [...state.collection, entry]
      }));

      if (outcomes && outcomes.length > 0) {
        await get().fetchQuests();
      }

      await get()._persist();
      return { xp, outcomes };
    } catch (err) {
      console.warn('checkIn error:', err);
      // Local fallback if offline
      const xp = TIER_XP[landmark.tier] || 150;
      const entry = { ...landmark, checkedInAt: new Date().toISOString(), xpEarned: xp };
      set((state) => ({ collection: [...state.collection, entry] }));
      await get()._persist();
      return { xp, error: err.message };
    }
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
    try {
      const api = (await import('../services/api')).default;
      const response = await api.post(`/quests/${questId}/claim`);
      
      if (response.data.xp_awarded) {
        set(state => ({ 
          questBonusXP: state.questBonusXP + response.data.xp_awarded,
          completedQuests: [...state.completedQuests, questId],
          activeQuestId: null
        }));
        await get().fetchQuests();
      }
    } catch (err) {
      console.warn('completeQuest error:', err);
    }
    await get()._persist();
  },

  fetchDailyChallenge: async () => {
    try {
      const api = (await import('../services/api')).default;
      const { preferences, interests } = get();
      const response = await api.post('/profile/daily-challenge', { preferences: { interests, ...preferences }, weather: null, timeOfDay: 'day' });
      set({ dailyChallenge: { ...response.data, progress: get().getStreak() > 0 ? 1 : 0, achieved: false, claimed: !!get().dailyClaimed[new Date().toDateString()] } });
    } catch (e) { console.error('fetchDailyChallenge error', e); }
  },

  fetchRefinement: async () => {
    try {
      const api = (await import('../services/api')).default;
      const { authUser, collection } = get();
      if(!authUser) return;
      const recent = collection.slice(-5);
      const response = await api.post('/profile/refinement', { user_id: authUser.id, recentVisits: recent });
      set({ refinementMessage: response.data.message });
    } catch(e) { }
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

  getTotalXP: () =>
    get().collection.reduce((s, c) => s + (c.xpEarned || 150), 0) + get().questBonusXP,
  getLevel: () => computeLevel(get().getTotalXP()),
  getCurrentXP: () => get().getTotalXP() % XP_PER_LEVEL,
  getStreak: () => computeStreak(get().collection),

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

  getExplorerType: () => {
    const { collection, interests } = get();
    if (!collection.length) {
      const catMap = {
        architecture: 'Architecture', food: 'Food', history: 'History',
        art: 'Art', nature: 'Nature', nightlife: 'Nightlife',
      };
      const cat = catMap[interests[0]] || 'Architecture';
      return EXPLORER_TYPES[cat] || { type: 'Newcomer', desc: 'Just getting started.' };
    }
    const counts = {};
    collection.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return EXPLORER_TYPES[top?.[0]] || { type: 'Urban Explorer', desc: 'No corner goes unchecked.' };
  },

  // ─── Internal ─────────────────────────────────────────────────────────────

  _persist: async () => {
    const {
      hasOnboarded, userName, interests, collection,
      activeQuestId, preferences, quests, 
      communities, userBadges, completedQuests, 
      questBonusXP, dailyClaimed,
    } = get();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          hasOnboarded, userName, interests, collection,
          activeQuestId, preferences, quests, 
          communities, userBadges, completedQuests, 
          questBonusXP, dailyClaimed,
        })
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

      // Phase 5.2 Returning User Detection
      const lastActive = profile?.last_active_at ? new Date(profile.last_active_at) : new Date();
      const daysSince = (new Date() - lastActive) / (1000 * 60 * 60 * 24);
      if (daysSince > 14 || !profile?.last_active_at) {
        // Trigger drift check since it has been 14+ days or first sync
        const api = (await import('../services/api')).default;
        api.post('/profile/drift-check', { user_id: authUser.id })
          .then(res => {
            if (res.data.drifted) {
              set({ driftAlert: { from: res.data.from, to: res.data.to, score: res.data.score } });
            }
          })
          .catch(() => {});
      }
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
