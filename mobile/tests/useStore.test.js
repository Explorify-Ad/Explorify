import { create } from 'zustand';

// Simple mock for AsyncStorage to allow testing zustand
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(),
}));

jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  setAuthToken: jest.fn()
}));

jest.mock('../src/services/supabase', () => ({
  __esModule: true,
  saveUserProfile: jest.fn(),
  fetchCollections: jest.fn(),
  fetchUserProfile: jest.fn()
}));

// Import store after mocks
const useStore = require('../src/store/useStore').default;

describe('useStore Mobile State', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    // Reset state before each test
    useStore.setState(initialState, true);
    jest.clearAllMocks();
  });

  describe('Level & XP System', () => {
    it('should correctly calculate total XP from collection and bonus', () => {
      useStore.setState({
        collection: [
          { id: '1', xpEarned: 200 },
          { id: '2', xpEarned: 350 }
        ],
        questBonusXP: 100
      });
      
      const total = useStore.getState().getTotalXP();
      expect(total).toBe(650);
    });

    it('should level up every 500 XP', () => {
      useStore.setState({ collection: [{ xpEarned: 499 }] });
      expect(useStore.getState().getLevel()).toBe(1);

      useStore.setState({ collection: [{ xpEarned: 500 }] });
      expect(useStore.getState().getLevel()).toBe(2);

      useStore.setState({ collection: [{ xpEarned: 1005 }] });
      expect(useStore.getState().getLevel()).toBe(3);
    });
  });

  describe('DNA & Check-in Logic', () => {
    it('should calculate DNA radar chart stats based on category frequency', () => {
      useStore.setState({
        collection: [
          { category: 'Architecture' },
          { category: 'Architecture' },
          { category: 'History' },
          { category: 'Nature' },
          { category: 'Nature' },
          { category: 'Nature' },
        ]
      });

      const dna = useStore.getState().getDNAStats();
      const arch = dna.find(d => d.label === 'Architecture');
      const hist = dna.find(d => d.label === 'History');
      const nature = dna.find(d => d.label === 'Nature');

      // Nature is highest (3), so it should be 100%
      expect(nature.value).toBe(100);
      // Architecture (2) is 2/3 of 100 = ~67%
      expect(arch.value).toBe(67);
      // History (1) is 1/3 of 100 = ~33%
      expect(hist.value).toBe(33);
    });
  });

  describe('Onboarding', () => {
    it('should set hasOnboarded and profile matching interests', async () => {
      await useStore.getState().completeOnboarding(['Architecture', 'Food'], 'TestUser', 'local');
      
      const state = useStore.getState();
      expect(state.hasOnboarded).toBe(true);
      expect(state.interests).toContain('Architecture');
      expect(state.userName).toBe('TestUser');
      expect(state.preferences.visitor_type).toBe('local');
    });
  });
});
