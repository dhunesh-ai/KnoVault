import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Environment configuration for KnoVault mobile app.
 *
 * For physical device testing via LAN, replace the API_BASE_URL
 * with your machine's LAN IP address (e.g. 192.168.1.100).
 *
 * Find your LAN IP:
 *   Windows:  ipconfig → look for IPv4 Address
 *   Mac:      ifconfig | grep "inet " | grep -v 127.0.0.1
 *   Linux:    hostname -I
 */

// Default to localhost for emulator, LAN IP for physical devices
const getDefaultApiUrl = (): string => {
  // In development, attempt to dynamically extract Metro bundler's host IP address.
  const hostUri = Constants.expoConfig?.hostUri; // e.g., "10.28.116.19:8081" or "localhost:8081"
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:8000`;
    }
  }
  // Fallback to the current machine's actual LAN IP address
  return 'http://10.28.116.19:8000';
};


const extra = Constants.expoConfig?.extra ?? {};

export const env = {
  /** Base URL for the FastAPI backend (no trailing slash) */
  API_BASE_URL: (extra.apiBaseUrl as string) || getDefaultApiUrl(),

  /** Current environment */
  APP_ENV: (extra.appEnv as string) || 'development',

  /** Whether we are running in development mode */
  isDev: (extra.appEnv as string) !== 'production',

  /**
   * Google Web Client ID for Google Sign-In.
   * 
   * To get this:
   * 1. Go to Firebase Console → Authentication → Sign-in method → Google → Enable
   * 2. Copy the "Web client ID" shown there
   * 3. Paste it here
   * 
   * NOTE: This is the WEB client ID, not the Android client ID.
   * It typically looks like: 305665772392-xxxxxxxxxxxx.apps.googleusercontent.com
   */
  GOOGLE_WEB_CLIENT_ID: (extra.googleWebClientId as string) || '305665772392-2bad311q96smjdkgfcg8ctvl7gs3qgq2.apps.googleusercontent.com',
} as const;

export type Env = typeof env;
