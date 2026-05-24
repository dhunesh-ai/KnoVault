import Constants from 'expo-constants';

/**
 * KnoVault — Production Environment Configuration
 *
 * All API traffic is routed to the live Render backend.
 * Firebase Auth uses the Web Client ID for Google Sign-In.
 */

const extra = Constants.expoConfig?.extra ?? {};

export const env = {
  /** Base URL for the FastAPI backend (no trailing slash) */
  API_BASE_URL: 'https://knovault-jbph.onrender.com',

  /** Current environment */
  APP_ENV: 'production',

  /** Whether we are running in development mode */
  isDev: false,

  /**
   * Google Web Client ID for Google Sign-In.
   * Obtained from Firebase Console → Authentication → Sign-in method → Google.
   */
  GOOGLE_WEB_CLIENT_ID: (extra.googleWebClientId as string) || '305665772392-2bad311q96smjdkgfcg8ctvl7gs3qgq2.apps.googleusercontent.com',
} as const;

export type Env = typeof env;
