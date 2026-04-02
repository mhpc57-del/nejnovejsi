import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'https://craftbolt.cz/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications.
 * Gracefully handles Expo Go limitations (push not available in Expo Go since SDK 53).
 */
export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'CraftBolt',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f97316',
        sound: 'default',
      });
    }

    // Try to get push token — this will fail in Expo Go (SDK 53+)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('No EAS projectId found — push tokens disabled (normal in Expo Go)');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    console.log('Expo Push Token:', pushToken);

    await AsyncStorage.setItem('pushToken', pushToken);
    await sendTokenToBackend(pushToken);
    return pushToken;
  } catch (error) {
    // Expected in Expo Go — push not supported
    console.log('Push registration skipped:', error.message);
    return null;
  }
}

async function sendTokenToBackend(pushToken) {
  try {
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) return;
    await axios.post(
      `${API_URL}/users/push-token`,
      { push_token: pushToken },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  } catch (error) {
    console.log('Failed to send push token to backend:', error.message);
  }
}

/**
 * Set up notification listeners. Returns cleanup function.
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  const receivedSub = Notifications.addNotificationReceivedListener(notification => {
    if (onNotificationReceived) onNotificationReceived(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    if (onNotificationResponse) onNotificationResponse(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
