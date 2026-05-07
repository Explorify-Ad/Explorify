import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { themes } from '../utils/theme';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const systemScheme  = useColorScheme();          // 'light' | 'dark' | null
  const [mode, setMode] = useState('exploration'); // exploration | discovery | quest | expedition

  const isDark = systemScheme === 'dark';

  // Resolve the theme: if system is dark, use the dark_ variant of the current mode
  const themeKey = isDark ? `dark_${mode}` : mode;
  const theme = themes[themeKey] ?? themes[mode];

  // When the app explicitly sets a mode (e.g. "discovery" on LandmarkDetail),
  // expose a setMode that screens can call. The dark/light selection stays
  // automatic based on the system setting.
  return (
    <ThemeContext.Provider value={{ mode, setMode, theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
