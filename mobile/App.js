import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications, addNotificationListeners } from './src/utils/notifications';

function AppContent() {
  const { user } = useAuth();
  const notifCleanup = useRef(null);

  useEffect(() => {
    if (user) {
      registerForPushNotifications();

      notifCleanup.current = addNotificationListeners(
        (notification) => {
          console.log('Notification received:', notification);
        },
        (response) => {
          const data = response.notification.request.content.data;
          console.log('Notification tapped:', data);
        }
      );
    }

    return () => {
      if (notifCleanup.current) notifCleanup.current();
    };
  }, [user]);

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
