import Constants from 'expo-constants';
import { buildConfig } from './buildConfig';
import { logger } from '../utils/logger';

/**
 * KnoVault — Environment Configuration
 *
 * Canonical API Base URL resolver for the mobile application.
 * Production/default mobile backend: https://knovault-jbph.onrender.com
 *
 * Physical Android devices require the live production backend or an explicit LAN IP.
 * Localhost (http://localhost:8000) is NOT used by default in development mode because
 * on physical Android devices localhost points to the phone itself.
 */

const PRODUCTION_API_URL = 'https://knovault-jbph.onrender.com';

const resolveApiUrl = (): string => {
  // 1. Explicit override in buildConfig if set (e.g. by build scripts)
  if (buildConfig.API_URL_OVERRIDE) {
    return (buildConfig.API_URL_OVERRIDE as string).replace(/\/$/, '');
  }

  // 2. EXPO_PUBLIC_API_URL environment variable if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 3. Extra config from app.json if set
  const extra = Constants.expoConfig?.extra ?? {};
  if (extra.apiBaseUrl && typeof extra.apiBaseUrl === 'string') {
    return extra.apiBaseUrl.replace(/\/$/, '');
  }

  // 4. Optional explicit local backend flag for local PC debugging (only if EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true')
  if (process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true') {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:8000`;
      }
    }
    return 'http://localhost:8000';
  }

  // 5. Default canonical production backend for all mobile environments (including physical Android dev builds)
  return PRODUCTION_API_URL;
};

const resolvedApiUrl = resolveApiUrl();

// Log resolved URL on startup so we can verify connectivity configuration
console.log(`[API CONFIG] API_BASE_URL = ${resolvedApiUrl}`);
logger.log(`[ENV] API_BASE_URL = ${resolvedApiUrl}`);
logger.log(`[ENV] isDev = ${__DEV__}`);

export const env = {
  /** Base URL for the FastAPI backend (no trailing slash) */
  API_BASE_URL: resolvedApiUrl,

  /** Current environment */
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || (Constants.expoConfig?.extra?.appEnv as string) || (__DEV__ ? 'development' : 'production'),

  /** Whether we are running in development mode */
  isDev: __DEV__,

  /**
   * Google Web Client ID for Google Sign-In.
   * Obtained from Firebase Console → Authentication → Sign-in method → Google.
   */
  GOOGLE_WEB_CLIENT_ID: (Constants.expoConfig?.extra?.googleWebClientId as string) || '305665772392-2bad311q96smjdkgfcg8ctvl7gs3qgq2.apps.googleusercontent.com',

  /** AI Chatbot Feature Flag — MUST strictly equal string 'true' */
  AI_CHAT_ENABLED: process.env.EXPO_PUBLIC_AI_CHAT_ENABLED === 'true',
} as const;

console.log('[FEATURE FLAG] Mobile AI_CHAT_ENABLED:', env.AI_CHAT_ENABLED);

export type Env = typeof env;
