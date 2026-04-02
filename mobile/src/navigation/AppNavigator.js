import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { COLORS } from '../utils/theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CustomerDashboard from '../screens/CustomerDashboard';
import SupplierDashboard from '../screens/SupplierDashboard';
import DemandDetailScreen from '../screens/DemandDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MapScreen from '../screens/MapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.gray500,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: -2 },
  tabBarStyle: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingTop: 6,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
};

function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={CustomerDashboard}
        options={{
          tabBarLabel: 'Přehled',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }} />
      <Tab.Screen name="Map" component={MapScreen}
        options={{
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
          ),
        }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
        options={{
          tabBarLabel: 'Oznámení',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
          ),
        }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }} />
    </Tab.Navigator>
  );
}

function SupplierTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={SupplierDashboard}
        options={{
          tabBarLabel: 'Přehled',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={22} color={color} />
          ),
        }} />
      <Tab.Screen name="Map" component={MapScreen}
        options={{
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
          ),
        }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
        options={{
          tabBarLabel: 'Oznámení',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
          ),
        }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <Ionicons name="flash" size={48} color={COLORS.primary} style={{ marginBottom: 12 }} />
        <Text style={{ fontSize: 32, color: COLORS.gray900, fontWeight: '300' }}>
          Craft<Text style={{ fontWeight: '700', color: COLORS.primary }}>Bolt</Text>
        </Text>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            {user.role === 'supplier' ? (
              <Stack.Screen name="SupplierHome" component={SupplierTabs} />
            ) : (
              <Stack.Screen name="CustomerHome" component={CustomerTabs} />
            )}
            <Stack.Screen name="DemandDetail" component={DemandDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
