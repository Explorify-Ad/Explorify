import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';

/**
 * Main application entry point.
 * Sets up navigation and global providers.
 * @returns {React.Component} The root application component
 */
export default function App() {
  // TODO: Add error boundary wrapper
  // TODO: Add splash screen handling
  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
