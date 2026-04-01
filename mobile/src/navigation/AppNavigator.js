import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { COLORS } from '../utils/theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CustomerDashboard from '../screens/CustomerDashboard';
import SupplierDashboard from '../screens/SupplierDashboard';
import DemandDetailScreen from '../screens/DemandDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ label, focused }) => (
  <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
    <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>
      {label === 'Přehled' ? '▦' : label === 'Profil' ? '●' : '●'}
    </Text>
  </View>
);

function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: tabStyles.bar,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray500,
      tabBarLabelStyle: tabStyles.label,
    }}>
      <Tab.Screen name="Dashboard" component={CustomerDashboard}
        options={{ tabBarLabel: 'Přehled', tabBarIcon: ({ focused }) => <TabIcon label="Přehled" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: 'Profil', tabBarIcon: ({ focused }) => <TabIcon label="Profil" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function SupplierTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: tabStyles.bar,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray500,
      tabBarLabelStyle: tabStyles.label,
    }}>
      <Tab.Screen name="Dashboard" component={SupplierDashboard}
        options={{ tabBarLabel: 'Přehled', tabBarIcon: ({ focused }) => <TabIcon label="Přehled" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: 'Profil', tabBarIcon: ({ focused }) => <TabIcon label="Profil" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <Text style={{ fontSize: 32, color: COLORS.gray900, fontWeight: '300' }}>
          Craft<Text style={{ fontWeight: '700', color: COLORS.primary }}>Bolt</Text>
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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

const tabStyles = StyleSheet.create({
  bar: { backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray100, height: 60, paddingBottom: 8, paddingTop: 4 },
  label: { fontSize: 11, fontWeight: '600' },
  iconWrap: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  iconWrapActive: { backgroundColor: COLORS.primaryLight },
  icon: { fontSize: 16, color: COLORS.gray500 },
  iconActive: { color: COLORS.primary },
});
