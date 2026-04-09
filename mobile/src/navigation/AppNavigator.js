import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Map, Target, Briefcase, User, Route, Home } from 'lucide-react-native';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MapScreen from '../screens/MapScreen';
import QuestsScreen from '../screens/QuestsScreen';
import CollectionScreen from '../screens/CollectionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RouteBuilderScreen from '../screens/RouteBuilderScreen';
import LandmarkDetailScreen from '../screens/LandmarkDetailScreen';
import NearbyScreen from '../screens/NearbyScreen';
import CreateExpeditionScreen from '../screens/CreateExpeditionScreen';
import ExpeditionPreviewScreen from '../screens/ExpeditionPreviewScreen';
import ExpeditionChatScreen from '../screens/ExpeditionChatScreen';
import CommunityScreen from '../screens/CommunityScreen';
import CommunityChatScreen from '../screens/CommunityChatScreen';
import MyExpeditionsScreen from '../screens/MyExpeditionsScreen';
import HomeScreen from '../screens/HomeScreen';
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
          const icons = { Home, Map, Quests: Target, Route, Collection: Briefcase, Profile: User };
          const Icon = icons[route.name];
          return <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />;
        },
      })}
    >
      <Tab.Screen name="Home"       component={HomeScreen} />
      <Tab.Screen name="Map"        component={MapScreen} />
      <Tab.Screen name="Quests"     component={QuestsScreen} />
      <Tab.Screen name="Route"      component={RouteBuilderScreen} options={{ tabBarLabel: 'Route' }} />
      <Tab.Screen name="Collection" component={CollectionScreen} />
      <Tab.Screen name="Profile"    component={ProfileScreen} />
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
  const fetchQuests        = useStore((s) => s.fetchQuests);
  const fetchCommunities   = useStore((s) => s.fetchCommunities);

  useEffect(() => {
    hydrate();

    // Restore existing Supabase session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        }, session.access_token);
        fetchQuests();
        fetchCommunities();
      }
    });

    // Keep auth state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        }, session.access_token);
        syncFromSupabase();
        fetchQuests();
        fetchCommunities();
      } else {
        setAuthUser(null, null);
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

  const isConfigPlaceholder =
    !process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project') ||
    !process.env.EXPO_PUBLIC_TOMTOM_API_KEY;

  if (isConfigPlaceholder) {
    return (
      <View style={{ flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF8' }}>
        <Text style={{ fontSize: 40, marginBottom: 20 }}>⚙️</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', textAlign: 'center', color: '#1A1A2E', marginBottom: 12 }}>
          Configuration Required
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#6B7280', lineHeight: 22 }}>
          Please fill in your Supabase and TomTom keys in the <Text style={{ fontWeight: '700' }}>mobile/.env</Text> file and restart the Expo server.
        </Text>
        <View style={{ marginTop: 32, padding: 16, backgroundColor: '#FEF3C7', borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
            Note: Placeholders like 'your-project' were detected.
          </Text>
        </View>
      </View>
    );
  }

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
          name="Community"
          component={CommunityScreen}
          options={{ title: 'Communities' }}
        />
        <Stack.Screen
          name="CommunityChat"
          component={CommunityChatScreen}
          options={{ title: 'Community Chat' }}
        />
        <Stack.Screen
          name="MyExpeditions"
          component={MyExpeditionsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
