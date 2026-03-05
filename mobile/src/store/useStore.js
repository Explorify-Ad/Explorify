import { create } from 'zustand';

/**
 * Global application state using Zustand.
 * Manages user data, landmarks, routes, and UI state.
 */
const useStore = create((set, get) => ({
  // User state
  user: null,
  isAuthenticated: false,

  // Landmarks state
  landmarks: [],
  selectedLandmark: null,

  // Route state
  currentRoute: null,
  routeHistory: [],

  // Collection state
  collection: [],
  totalPoints: 0,

  // UI state
  isLoading: false,
  error: null,

  // TODO: Implement caching

  // User actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearUser: () => set({ user: null, isAuthenticated: false }),

  // Landmark actions
  setLandmarks: (landmarks) => set({ landmarks }),
  setSelectedLandmark: (landmark) => set({ selectedLandmark: landmark }),

  // Route actions
  setCurrentRoute: (route) => set({ currentRoute: route }),
  addRouteToHistory: (route) =>
    set((state) => ({ routeHistory: [...state.routeHistory, route] })),

  // Collection actions
  setCollection: (collection) => set({ collection }),
  addToCollection: (item) =>
    set((state) => ({
      collection: [...state.collection, item],
      totalPoints: state.totalPoints + (item.points || 0),
    })),

  // UI actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

export default useStore;
