import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications, addNotificationListener, addNotificationResponseListener } from './src/utils/notifications';

function AppContent() {
  const { user } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (user) {
      // Register for push notifications when user is logged in
      registerForPushNotifications();

      notificationListener.current = addNotificationListener(notification => {
        console.log('Notification received:', notification);
      });

      responseListener.current = addNotificationResponseListener(response => {
        console.log('Notification tapped:', response);
      });

      return () => {
        if (notificationListener.current) notificationListener.current.remove();
        if (responseListener.current) responseListener.current.remove();
      };
    }
  }, [user]);

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
