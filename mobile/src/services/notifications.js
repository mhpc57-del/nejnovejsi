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
 * Register for push notifications and store the token
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Ask for permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    const pushToken = tokenData.data;
    console.log('Expo Push Token:', pushToken);

    // Store locally
    await AsyncStorage.setItem('pushToken', pushToken);

    // Send to backend
    await sendTokenToBackend(pushToken);

    return pushToken;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Send the push token to the backend
 */
async function sendTokenToBackend(pushToken) {
  try {
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) return;

    await axios.post(
      `${API_URL}/users/push-token`,
      { push_token: pushToken },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('Push token sent to backend');
  } catch (error) {
    console.log('Failed to send push token to backend:', error.message);
  }
}

/**
 * Schedule a local notification (for testing or local events)
 */
export async function sendLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Immediately
  });
}

/**
 * Set up notification listeners
 * Returns cleanup function
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  const receivedSub = Notifications.addNotificationReceivedListener(notification => {
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });

  // Android notification channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'CraftBolt',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f97316',
      sound: 'default',
    });
  }

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

/**
 * Get badge count
 */
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}
