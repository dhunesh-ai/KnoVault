import Constants from 'expo-constants';

/**
 * KnoVault — Environment Configuration
 *
 * Automatically detects whether we are running in development or production.
 * In development, it dynamically resolves the local machine's IP address (via Metro's hostUri)
 * so that both physical devices and emulators can connect to the local FastAPI backend.
 * In production, it routes all API traffic to the live Render backend.
 */

const getLocalApiUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri; // e.g., "192.168.1.15:8081" or "localhost:8081"
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }
  return 'http://10.0.2.2:8000'; // Fallback for standard Android Emulator
};

import { buildConfig } from './buildConfig';

const extra = Constants.expoConfig?.extra ?? {};
const isDevMode = __DEV__;

const resolvedApiUrl = buildConfig.API_URL_OVERRIDE || (extra.apiBaseUrl as string) || (isDevMode ? getLocalApiUrl() : 'https://knovault-jbph.onrender.com');

import { logger } from '../utils/logger';

// Log the resolved URL on startup so we can debug connectivity issues
logger.log(`[ENV] API_BASE_URL = ${resolvedApiUrl}`);
logger.log(`[ENV] hostUri = ${Constants.expoConfig?.hostUri ?? 'undefined'}`);
logger.log(`[ENV] isDev = ${isDevMode}`);

export const env = {
  /** Base URL for the FastAPI backend (no trailing slash) */
  API_BASE_URL: resolvedApiUrl,

  /** Current environment */
  APP_ENV: (extra.appEnv as string) || (isDevMode ? 'development' : 'production'),

  /** Whether we are running in development mode */
  isDev: isDevMode,

  /**
   * Google Web Client ID for Google Sign-In.
   * Obtained from Firebase Console → Authentication → Sign-in method → Google.
   */
  GOOGLE_WEB_CLIENT_ID: (extra.googleWebClientId as string) || '305665772392-2bad311q96smjdkgfcg8ctvl7gs3qgq2.apps.googleusercontent.com',
} as const;

export type Env = typeof env;

