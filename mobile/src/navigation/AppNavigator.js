import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import RouteBuilderScreen from '../screens/RouteBuilderScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LandmarkDetailScreen from '../screens/LandmarkDetailScreen';
import CollectionScreen from '../screens/CollectionScreen';
import GroupScreen from '../screens/GroupScreen';

const Stack = createStackNavigator();

/**
 * Main application navigator.
 * Configures the stack-based navigation for all screens.
 * @returns {React.Component} Navigation container with screen stack
 */
export default function AppNavigator() {
  // TODO: Add bottom tab navigation
  // TODO: Add auth flow (login/register screens)
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#2E86AB' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Explorify' }}
        />
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{ title: 'Explore Map' }}
        />
        <Stack.Screen
          name="RouteBuilder"
          component={RouteBuilderScreen}
          options={{ title: 'Build Route' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'My Profile' }}
        />
        <Stack.Screen
          name="LandmarkDetail"
          component={LandmarkDetailScreen}
          options={{ title: 'Landmark Details' }}
        />
        <Stack.Screen
          name="Collection"
          component={CollectionScreen}
          options={{ title: 'My Collection' }}
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
