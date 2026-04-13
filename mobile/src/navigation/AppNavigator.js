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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.gray400,
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
  tabBarStyle: {
    backgroundColor: COLORS.white, borderTopWidth: 0,
    paddingTop: 8, paddingBottom: 4, height: 60,
    elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 16,
  },
};

function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={CustomerDashboard}
        options={{ tabBarLabel: 'Poptávky', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'list' : 'list-outline'} size={22} color={color} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
        options={{ tabBarLabel: 'Oznámení', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: 'Profil', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} /> }} />
    </Tab.Navigator>
  );
}

function SupplierTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={SupplierDashboard}
        options={{ tabBarLabel: 'Zakázky', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={22} color={color} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
        options={{ tabBarLabel: 'Oznámení', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: 'Profil', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} /> }} />
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
            {(user.role === 'supplier' || user.role === 'customer_supplier') ? (
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
