/**
 * KnoVault — Push Notification Utility (FCM + Expo)
 *
 * Handles:
 *  - Notification permission requests
 *  - FCM token generation and backend sync
 *  - Expo Push Token generation (for Expo Go / managed workflow)
 *  - Foreground/background notification handlers
 *  - Deep-link navigation from notification taps
 *
 * The backend auto-detects ExponentPushToken and routes via Expo HTTP API,
 * otherwise falls back to native FCM Admin SDK.
 */
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import * as ExpoNotifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { authApi } from '../api/auth';

// Expo project ID from app.json → extra.eas.projectId
const EXPO_PROJECT_ID = 'd696d6a3-8e24-457f-95f7-da955e2a7b97';

// ── Permission Request ───────────────────────────────────────────────

/**
 * Request notification permissions from the user.
 * Tries expo-notifications first (works in all environments).
 * Returns true if authorized.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Request via expo-notifications (covers both managed & bare)
    const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus === 'granted') return true;

    // Fallback: try FCM (native builds)
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error('[Push] Permission request failed:', error);
    return false;
  }
}

// ── Expo Push Token ─────────────────────────────────────────────────

/**
 * Get an Expo Push Token (ExponentPushToken[...]).
 * Works in Expo Go and managed workflow builds.
 * Returns null if not available (e.g. simulator, or native-only build without EAS).
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const result = await ExpoNotifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    return result.data; // e.g. "ExponentPushToken[xxxxxx]"
  } catch (error) {
    // Not available in simulator or if EAS project isn't set up
    return null;
  }
}

// ── FCM Token Management ────────────────────────────────────────────

/**
 * Get the device's FCM registration token.
 * This token uniquely identifies this device for push notifications.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('[FCM] Failed to get token:', error);
    return null;
  }
}

/**
 * Sync the best available push token with the KnoVault backend.
 * Priority: Expo Push Token → FCM Token.
 * The backend auto-detects ExponentPushToken and routes accordingly.
 */
export async function syncFCMToken(): Promise<void> {
  try {
    const { useAuthStore } = await import('../store/authStore');
    if (!useAuthStore.getState().isAuthenticated) return;

    // 1. Try Expo Push Token first (works in Expo Go)
    const expoToken = await getExpoPushToken();
    if (expoToken) {
      await authApi.updateFCMToken(expoToken);
      console.log('[Push] ✅ Expo Push Token synced:', expoToken.substring(0, 30) + '...');
      return;
    }

    // 2. Fallback to native FCM token
    const fcmToken = await getFCMToken();
    if (fcmToken) {
      await authApi.updateFCMToken(fcmToken);
      console.log('[Push] ✅ FCM Token synced');
    }
  } catch (error: any) {
    console.warn('[Push] Token sync failed (likely expired session):', error.message || error);
    // Don't throw — push token sync failure shouldn't block the user
  }
}

// ── Notification Handlers ───────────────────────────────────────────

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

type NotificationCallback = (payload: NotificationPayload) => void;

let _onForegroundNotification: NotificationCallback | null = null;
let _onNotificationOpened: NotificationCallback | null = null;

/**
 * Set the callback for foreground notifications (when app is open).
 */
export function setOnForegroundNotification(callback: NotificationCallback) {
  _onForegroundNotification = callback;
}

/**
 * Set the callback for when a notification is tapped (app opened from notification).
 */
export function setOnNotificationOpened(callback: NotificationCallback) {
  _onNotificationOpened = callback;
}

/**
 * Initialize all FCM and Expo notification listeners.
 * Call this once during app startup (in _layout.tsx).
 * Returns a cleanup function to unsubscribe all listeners.
 */
export function setupNotificationListeners(): () => void {
  const unsubscribers: (() => void)[] = [];

  // Helper to trigger store refresh
  const triggerStoreRefresh = async () => {
    try {
      const { useNotificationStore } = await import('../store/notificationStore');
      await useNotificationStore.getState().fetchNotifications();
      console.log('[Push] Notification store refreshed from push event');
    } catch (err) {
      console.warn('[Push] Failed to auto-refresh store:', err);
    }
  };

  // 1. FCM Foreground message handler
  const unsubForeground = messaging().onMessage(async (remoteMessage) => {
    const payload: NotificationPayload = {
      title: remoteMessage.notification?.title || 'KnoVault',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data as Record<string, string> | undefined,
    };

    await triggerStoreRefresh();

    if (_onForegroundNotification) {
      _onForegroundNotification(payload);
    } else {
      Alert.alert(payload.title, payload.body);
    }
  });
  unsubscribers.push(unsubForeground);

  // 2. FCM Notification opened (app was in background)
  const unsubOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
    const payload: NotificationPayload = {
      title: remoteMessage.notification?.title || '',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data as Record<string, string> | undefined,
    };

    if (_onNotificationOpened) {
      _onNotificationOpened(payload);
    }
  });
  unsubscribers.push(unsubOpened);

  // 3. FCM Token refresh handler — sync new token with backend
  const unsubTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
    try {
      const { useAuthStore } = await import('../store/authStore');
      if (useAuthStore.getState().isAuthenticated) {
        await authApi.updateFCMToken(newToken);
      }
    } catch (error: any) {
      console.warn('[FCM] Token refresh sync failed:', error.message || error);
    }
  });
  unsubscribers.push(unsubTokenRefresh);

  // 4. FCM Check if app was opened from a quit state notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        const payload: NotificationPayload = {
          title: remoteMessage.notification?.title || '',
          body: remoteMessage.notification?.body || '',
          data: remoteMessage.data as Record<string, string> | undefined,
        };

        if (_onNotificationOpened) {
          _onNotificationOpened(payload);
        }
      }
    });

  // 5. Expo Foreground notification handler
  const expoForegroundSub = ExpoNotifications.addNotificationReceivedListener(async (notification) => {
    const payload: NotificationPayload = {
      title: notification.request.content.title || 'KnoVault',
      body: notification.request.content.body || '',
      data: notification.request.content.data as Record<string, string> | undefined,
    };

    await triggerStoreRefresh();

    if (_onForegroundNotification) {
      _onForegroundNotification(payload);
    } else {
      Alert.alert(payload.title, payload.body);
    }
  });

  // 6. Expo Notification Response (Tapped) handler
  const expoResponseSub = ExpoNotifications.addNotificationResponseReceivedListener(async (response) => {
    const payload: NotificationPayload = {
      title: response.notification.request.content.title || '',
      body: response.notification.request.content.body || '',
      data: response.notification.request.content.data as Record<string, string> | undefined,
    };

    if (_onNotificationOpened) {
      _onNotificationOpened(payload);
    }
  });

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
    expoForegroundSub.remove();
    expoResponseSub.remove();
  };
}

// ── Background Message Handler ──────────────────────────────────────
export function registerBackgroundHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // Handled by OS
  });
}
