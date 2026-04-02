// Base palette — shared between light and dark variants
const LIGHT_SHELL = {
  sheetBg:       '#FFFDF8',
  cardBg:        '#FFFFFF',
  cardBgAlt:     '#F9FAFB',
  border:        'rgba(0,0,0,0.07)',
  textPrimary:   '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  inputBg:       '#F3F4F6',
  overlayBg:     'rgba(0,0,0,0.35)',
};

const DARK_SHELL = {
  sheetBg:       '#12121f',
  cardBg:        '#1c1c2e',
  cardBgAlt:     '#22223a',
  border:        'rgba(255,255,255,0.08)',
  textPrimary:   '#F1F0FF',
  textSecondary: '#9CA3B8',
  textMuted:     '#6B7280',
  inputBg:       '#1c1c2e',
  overlayBg:     'rgba(0,0,0,0.6)',
};

export const themes = {
  exploration: {
    ...LIGHT_SHELL,
    surface:   '#FFFDF8',
    primary:   '#F5A623',
    secondary: '#4A90D9',
  },
  discovery: {
    ...LIGHT_SHELL,
    surface:   '#F0FAFA',
    primary:   '#00C9B1',
    secondary: '#3D2B8E',
  },
  quest: {
    ...LIGHT_SHELL,
    surface:   '#FDFAF5',
    primary:   '#7C3AED',
    secondary: '#F97316',
  },
  expedition: {
    ...LIGHT_SHELL,
    surface:   '#FFF8F5',
    primary:   '#FF6B6B',
    secondary: '#0D9488',
  },

  // Dark variants (same mode names, prefixed with dark_)
  dark_exploration: {
    ...DARK_SHELL,
    surface:   '#0f0f1a',
    primary:   '#F5A623',
    secondary: '#4A90D9',
  },
  dark_discovery: {
    ...DARK_SHELL,
    surface:   '#0a1a1a',
    primary:   '#00C9B1',
    secondary: '#7C5CBF',
  },
  dark_quest: {
    ...DARK_SHELL,
    surface:   '#100f1a',
    primary:   '#9D5CFF',
    secondary: '#F97316',
  },
  dark_expedition: {
    ...DARK_SHELL,
    surface:   '#1a0f0f',
    primary:   '#FF6B6B',
    secondary: '#0D9488',
  },
};

export const TIER_COLORS = {
  public:     '#F5A623',
  discovered: '#00C9B1',
  hidden:     '#3D2B8E',
};

export const CATEGORY_COLORS = {
  Architecture: '#64748b',
  Food:         '#f97316',
  History:      '#d97706',
  Art:          '#ec4899',
  Nature:       '#22c55e',
  Hidden:       '#3D2B8E',
  Nightlife:    '#7c3aed',
};
