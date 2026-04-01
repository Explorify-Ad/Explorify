import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/** Quest target scales with level: 3 at start, +1 every 3 levels, max 8 */
function getQuestTarget(level) {
  return Math.min(3 + Math.floor(level / 3), 8);
}

/** Quest XP bonus scales with target */
function getQuestXP(quest, target) {
  return Math.round(quest.baseXp * (target / 3));
}

const useStore = create((set, get) => ({
  // ─── Persisted state ──────────────────────────────────────────────────────
  hasOnboarded: false,
  userName: 'Explorer',
  interests: [],           // array of category ids from onboarding
  visitorType: 'tourist',  // 'tourist' | 'local'
  collection: [],          // checked-in landmarks with metadata
  activeQuestId: null,     // id from QUESTS
  completedQuests: [],     // quest ids whose XP has been claimed
  questBonusXP: 0,         // cumulative XP earned from quest + daily completions
  dailyClaimed: {},        // { 'Mon Apr 01 2026': true }
  hydrated: false,

  // ─── Auth state (not persisted — Supabase session handles it) ─────────────
  authUser: null,          // { id, email, name }
  isAuthenticated: false,

  // ─── Actions ──────────────────────────────────────────────────────────────

  setAuthUser: (user) => {
    set({
      authUser: user,
      isAuthenticated: !!user,
      userName: user?.name || get().userName,
    });
  },

  signOut: async () => {
    const supabase = (await import('../services/supabase')).default;
    await supabase.auth.signOut();
    set({ authUser: null, isAuthenticated: false });
  },

  completeOnboarding: async (interests, userName = 'Explorer', visitorType = 'tourist') => {
    const catMap = {
      architecture: 'q_arch', food: 'q_food', history: 'q_history',
      art: 'q_art', nature: 'q_nature', nightlife: 'q_night',
    };
    const defaultQuest = catMap[interests[0]] || 'q_arch';
    set({ hasOnboarded: true, interests, visitorType, userName, activeQuestId: defaultQuest });
    await get()._persist();
    const { authUser } = get();
    if (authUser?.id) {
      const { saveUserProfile } = await import('../services/supabase');
      await saveUserProfile(authUser.id, { displayName: userName, interests, visitorType });
    }
  },

  checkIn: async (landmark) => {
    const { collection, authUser } = get();
    if (collection.find((c) => String(c.id) === String(landmark.id))) return 0;
    const xp = TIER_XP[landmark.tier] || 150;
    const entry = { ...landmark, checkedInAt: new Date().toISOString(), xpEarned: xp };
    set((state) => ({ collection: [...state.collection, entry] }));
    await get()._persist();
    if (authUser?.id) {
      const { saveCheckIn } = await import('../services/supabase');
      await saveCheckIn(authUser.id, landmark, xp);
    }
    return xp;
  },

  setActiveQuest: async (questId) => {
    set({ activeQuestId: questId });
    await get()._persist();
  },

  completeQuest: async (questId) => {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) return;
    const level = computeLevel(get().getTotalXP());
    const target = getQuestTarget(level);
    const xp = getQuestXP(quest, target);
    set((state) => ({
      completedQuests: [...state.completedQuests, questId],
      questBonusXP: state.questBonusXP + xp,
      activeQuestId: null,
    }));
    await get()._persist();
  },

  /** Award the daily challenge XP bonus (call when user taps Claim). */
  claimDailyChallenge: async () => {
    const today = new Date().toDateString();
    const challenge = get().getDailyChallenge();
    if (!challenge || !challenge.achieved || challenge.claimed) return;
    set((state) => ({
      dailyClaimed: { ...state.dailyClaimed, [today]: true },
      questBonusXP: state.questBonusXP + challenge.xpBonus,
    }));
    await get()._persist();
  },

  // ─── Computed getters ─────────────────────────────────────────────────────

  getTotalXP: () =>
    get().collection.reduce((s, c) => s + (c.xpEarned || 150), 0) + get().questBonusXP,
  getLevel: () => computeLevel(get().getTotalXP()),
  getCurrentXP: () => get().getTotalXP() % XP_PER_LEVEL,
  getStreak: () => computeStreak(get().collection),

  getActiveQuest: () => {
    const { activeQuestId, collection, interests, completedQuests } = get();
    const catMap = {
      architecture: 'q_arch', food: 'q_food', history: 'q_history',
      art: 'q_art', nature: 'q_nature', nightlife: 'q_night',
    };
    const preferredId = activeQuestId ?? catMap[interests[0]] ?? 'q_arch';
    const quest =
      QUESTS.find((q) => q.id === preferredId && !completedQuests.includes(q.id)) ||
      QUESTS.find((q) => !completedQuests.includes(q.id)) ||
      QUESTS[0];

    // Adaptive target scales with level
    const level = computeLevel(get().getTotalXP());
    const target = getQuestTarget(level);
    const xp = getQuestXP(quest, target);
    const progress = collection.filter((c) => c.category === quest.category).length;
    return { ...quest, target, xp, progress: Math.min(progress, target) };
  },

  getSuggestedQuests: () => {
    const { activeQuestId, interests, collection, completedQuests, visitorType } = get();
    const catMap = {
      architecture: 'q_arch', food: 'q_food', history: 'q_history',
      art: 'q_art', nature: 'q_nature', nightlife: 'q_night',
    };

    // Count visits per category for novelty sorting
    const counts = {};
    collection.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });

    const sorted = [...QUESTS].sort((a, b) => {
      if (visitorType === 'local') {
        // Locals: prefer least-explored categories (novelty-first)
        const aCnt = counts[a.category] || 0;
        const bCnt = counts[b.category] || 0;
        return aCnt - bCnt;
      }
      // Tourists: prefer stated interests
      const preferred = interests.map((i) => catMap[i]).filter(Boolean);
      const aP = preferred.indexOf(a.id);
      const bP = preferred.indexOf(b.id);
      return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP);
    });

    const level = computeLevel(get().getTotalXP());
    const target = getQuestTarget(level);

    return sorted
      .filter((q) => q.id !== activeQuestId && !completedQuests.includes(q.id))
      .slice(0, 3)
      .map((q) => ({
        ...q,
        target,
        xp: getQuestXP(q, target),
        progress: collection.filter((c) => c.category === q.category).length,
      }));
  },

  /**
   * Returns today's daily challenge, seeded by date + interests.
   * Resets automatically at midnight.
   */
  getDailyChallenge: () => {
    const { interests, collection, visitorType, dailyClaimed } = get();
    const catMap = {
      architecture: 'Architecture', food: 'Food', history: 'History',
      art: 'Art', nature: 'Nature', nightlife: 'Nightlife',
    };
    const cats = interests.map((i) => catMap[i]).filter(Boolean);
    if (!cats.length) return null;

    // Deterministic day-seeded category pick (same for all with same interests on same day)
    const dayNum = Math.floor(Date.now() / 86400000);
    const category = cats[dayNum % cats.length];
    // Locals get 2-stop challenge every other day, tourists always get 1
    const target = visitorType === 'local' && dayNum % 2 === 0 ? 2 : 1;

    // Count check-ins made today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const progress = collection.filter(
      (c) => c.category === category && new Date(c.checkedInAt) >= today
    ).length;

    const todayStr = new Date().toDateString();
    const claimed = !!dailyClaimed[todayStr];
    const achieved = progress >= target;

    return {
      category,
      emoji: DAILY_CATEGORY_EMOJIS[category] || '📍',
      target,
      progress: Math.min(progress, target),
      xpBonus: target * 75,
      achieved,
      claimed,
    };
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

  // ─── Persistence ──────────────────────────────────────────────────────────

  _persist: async () => {
    const {
      hasOnboarded, userName, interests, visitorType, collection,
      activeQuestId, completedQuests, questBonusXP, dailyClaimed,
    } = get();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          hasOnboarded, userName, interests, visitorType, collection,
          activeQuestId, completedQuests, questBonusXP, dailyClaimed,
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
      const updates = {};
      if (serverCollection?.length) updates.collection = serverCollection;
      if (profile) {
        if (profile.display_name) updates.userName = profile.display_name;
        if (profile.visitor_type) updates.visitorType = profile.visitor_type;
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
