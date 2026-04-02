import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/utils/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from './src/services/notifications';

export default function App() {
  const notifCleanup = useRef(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().catch(console.error);

    // Set up notification listeners
    notifCleanup.current = setupNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification.request.content.title);
      },
      (response) => {
        console.log('Notification tapped:', response.notification.request.content.data);
      }
    );

    return () => {
      if (notifCleanup.current) notifCleanup.current();
    };
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  );
}
