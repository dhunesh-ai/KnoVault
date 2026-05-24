/**
 * KnoVault — Push Notification Utility (FCM)
 *
 * Handles:
 *  - Notification permission requests
 *  - FCM token generation and backend sync
 *  - Foreground/background notification handlers
 *  - Deep-link navigation from notification taps
 */
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import { authApi } from '../api/auth';

// ── Permission Request ───────────────────────────────────────────────

/**
 * Request notification permissions from the user.
 * On Android 13+ (API 33), this shows the system permission dialog.
 * Returns true if authorized.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('[FCM] Permission status:', authStatus, 'enabled:', enabled);
    return enabled;
  } catch (error) {
    console.error('[FCM] Permission request failed:', error);
    return false;
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
    console.log('[FCM] Device token:', token?.substring(0, 20) + '...');
    return token;
  } catch (error) {
    console.error('[FCM] Failed to get token:', error);
    return null;
  }
}

/**
 * Sync the device's FCM token with the KnoVault backend.
 * Should be called after authentication and whenever the token refreshes.
 */
export async function syncFCMToken(): Promise<void> {
  try {
    const token = await getFCMToken();
    if (!token) {
      console.log('[FCM] No token to sync');
      return;
    }

    await authApi.updateFCMToken(token);
    console.log('[FCM] ✅ Token synced with backend');
  } catch (error) {
    console.warn('[FCM] Token sync failed (likely expired session):', error.message);
    // Don't throw — FCM sync failure shouldn't block the user
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
 * Initialize all FCM notification listeners.
 * Call this once during app startup (in _layout.tsx).
 * Returns a cleanup function to unsubscribe all listeners.
 */
export function setupNotificationListeners(): () => void {
  const unsubscribers: (() => void)[] = [];

  // 1. Foreground message handler
  const unsubForeground = messaging().onMessage(async (remoteMessage) => {
    console.log('[FCM] Foreground message:', remoteMessage.notification?.title);

    const payload: NotificationPayload = {
      title: remoteMessage.notification?.title || 'KnoVault',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data as Record<string, string> | undefined,
    };

    if (_onForegroundNotification) {
      _onForegroundNotification(payload);
    } else {
      // Default: show an alert
      Alert.alert(payload.title, payload.body);
    }
  });
  unsubscribers.push(unsubForeground);

  // 2. Notification opened (app was in background)
  const unsubOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[FCM] Notification opened (background):', remoteMessage.notification?.title);

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

  // 3. Token refresh handler — sync new token with backend
  const unsubTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
    console.log('[FCM] Token refreshed, syncing...');
    try {
      await authApi.updateFCMToken(newToken);
      console.log('[FCM] ✅ Refreshed token synced');
    } catch (error) {
      console.error('[FCM] Token refresh sync failed:', error);
    }
  });
  unsubscribers.push(unsubTokenRefresh);

  // 4. Check if app was opened from a quit state notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[FCM] App opened from quit state notification:', remoteMessage.notification?.title);

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

  console.log('[FCM] ✅ All notification listeners registered');

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
    console.log('[FCM] Notification listeners cleaned up');
  };
}

// ── Background Message Handler ──────────────────────────────────────
// This must be called at the top level (outside of components)
// It handles messages when the app is in the background or killed

export function registerBackgroundHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] Background message:', remoteMessage.notification?.title);
    // Background processing can be done here
    // The notification will be displayed automatically by the system
  });
}
