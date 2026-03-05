/**
 * Application-wide constants.
 */

// Dublin city center coordinates
export const DUBLIN_CENTER = {
  latitude: 53.3498,
  longitude: -6.2603,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

// Landmark categories
export const CATEGORIES = [
  'historical',
  'cultural',
  'nature',
  'shopping',
  'sports',
  'architecture',
  'landmark',
];

// Walking pace options (km/h)
export const WALKING_PACES = {
  slow: { label: 'Slow', speed: 3.0 },
  moderate: { label: 'Moderate', speed: 4.5 },
  fast: { label: 'Fast', speed: 6.0 },
};

// Accessibility levels
export const ACCESSIBILITY_LEVELS = {
  1: 'Very Limited - Significant barriers',
  2: 'Limited - Some stairs or obstacles',
  3: 'Moderate - Minor barriers possible',
  4: 'Good - Mostly accessible',
  5: 'Fully Accessible - No barriers',
};

// API endpoints
export const ENDPOINTS = {
  LANDMARKS: '/landmarks',
  ROUTES: '/routes',
  USERS: '/users',
  COLLECTIONS: '/collections',
  HEALTH: '/health',
};

// App theme colors
export const COLORS = {
  primary: '#2E86AB',
  secondary: '#A23B72',
  accent: '#F18F01',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  background: '#F5F5F5',
  text: '#333333',
  textLight: '#666666',
  white: '#FFFFFF',
};
