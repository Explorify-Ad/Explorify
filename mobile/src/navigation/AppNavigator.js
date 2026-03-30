import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Map, Target, Briefcase, User } from 'lucide-react-native';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MapScreen from '../screens/MapScreen';
import QuestsScreen from '../screens/QuestsScreen';
import CollectionScreen from '../screens/CollectionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LandmarkDetailScreen from '../screens/LandmarkDetailScreen';
import NearbyScreen from '../screens/NearbyScreen';
import CreateExpeditionScreen from '../screens/CreateExpeditionScreen';
import ExpeditionPreviewScreen from '../screens/ExpeditionPreviewScreen';
import ExpeditionChatScreen from '../screens/ExpeditionChatScreen';
import GroupScreen from '../screens/GroupScreen';
import { useTheme } from '../context/ThemeContext';
import useStore from '../store/useStore';
import supabase from '../services/supabase';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopColor: 'rgba(0,0,0,0.06)',
          height: 80,
          paddingBottom: 16,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
        tabBarIcon: ({ focused, color }) => {
          const icons = { Map, Quests: Target, Collection: Briefcase, Profile: User };
          const Icon = icons[route.name];
          return <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />;
        },
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Quests" component={QuestsScreen} />
      <Tab.Screen name="Collection" component={CollectionScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const hydrated           = useStore((s) => s.hydrated);
  const hasOnboarded       = useStore((s) => s.hasOnboarded);
  const isAuthenticated    = useStore((s) => s.isAuthenticated);
  const hydrate            = useStore((s) => s.hydrate);
  const setAuthUser        = useStore((s) => s.setAuthUser);
  const syncFromSupabase   = useStore((s) => s.syncFromSupabase);

  useEffect(() => {
    hydrate();

    // Restore existing Supabase session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        });
      }
    });

    // Keep auth state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        });
        syncFromSupabase();
      } else {
        setAuthUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF8' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Determine the initial/first screen based on auth + onboarding state
  const initialRoute = !isAuthenticated
    ? 'Login'
    : !hasOnboarded
    ? 'Onboarding'
    : 'Main';

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        {/* Auth screens — always present so navigation between them works */}
        <Stack.Screen name="Login"      component={LoginScreen} />
        <Stack.Screen name="Signup"     component={SignupScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        {/* App screens */}
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen
          name="LandmarkDetail"
          component={LandmarkDetailScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Nearby"
          component={NearbyScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="CreateExpedition"
          component={CreateExpeditionScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="ExpeditionPreview"
          component={ExpeditionPreviewScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="ExpeditionChat"
          component={ExpeditionChatScreen}
        />
        <Stack.Screen
          name="Group"
          component={GroupScreen}
          options={{ title: 'Group Travel' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
