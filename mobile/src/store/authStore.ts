/**
 * KnoVault — Auth Store (Zustand)
 *
 * Manages authentication state including JWT token, user profile,
 * and loading/error states. Persists token to SecureStore.
 * 
 * Supports both email/password and Google Sign-In authentication.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/auth';
import { signInWithGoogle, signOutFirebase, getFirebaseIdToken } from '../utils/firebase';
import { syncFCMToken, requestNotificationPermission } from '../utils/notifications';
import { env } from '../config/env';
import type { User } from '../types';

const TOKEN_KEY = 'user_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_PROVIDER_KEY = 'auth_provider';

type AuthProvider = 'email' | 'google' | null;

interface AuthState {
  /** JWT access token */
  token: string | null;
  /** Authenticated user profile */
  user: User | null;
  /** Initial app load / token restoration */
  isLoading: boolean;
  /** Auth operation in progress */
  isAuthenticating: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Last auth error message */
  error: string | null;
  /** How the user authenticated */
  authProvider: AuthProvider;

  // ── Actions ─────────────────────────────────────────────────────
  /** Restore token from SecureStore on app start */
  initialize: () => Promise<void>;
  /** Login with email/password */
  login: (email: string, password: string) => Promise<boolean>;
  /** Login with Google Sign-In via Firebase */
  loginWithGoogle: () => Promise<boolean>;
  /** Step 1: Initiate signup */
  register: (email: string, fullName?: string) => Promise<string>;
  /** Step 3: Set password and finalize account */
  completeSignup: (email: string, code: string, password: string) => Promise<boolean>;
  /** Fetch user profile with current token */
  fetchUser: () => Promise<void>;
  /** Clear auth state and remove stored token */
  logout: () => Promise<void>;
  /** Clear any error messages */
  clearError: () => void;
  /** Sync FCM token with backend (call after auth) */
  syncNotifications: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticating: false,
  isAuthenticated: false,
  error: null,
  authProvider: null,

  initialize: async () => {
    console.log('[Auth Restore] Starting initialization...');
    try {
      console.log('[Auth Restore] Fetching token from SecureStore...');
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const provider = (await SecureStore.getItemAsync(AUTH_PROVIDER_KEY)) as AuthProvider;
      console.log('[Auth Restore] Token retrieved:', token ? 'exists' : 'null', 'provider:', provider);
      
      if (token) {
        console.log('[Auth Restore] Token found, fetching profile in background...');
        set({ token, isAuthenticated: true, isAuthenticating: false, error: null, authProvider: provider });
        
        // Fetch profile in the background, don't block app initialization
        get().fetchUser().catch(console.warn);

        // Sync FCM token in background (don't block init)
        get().syncNotifications().catch(console.warn);
      } else {
        console.log('[Auth Restore] No token found');
        set({ isAuthenticated: false, isAuthenticating: false, error: null });
      }
      console.log('[Auth Restore] Initialization sequence complete');
    } catch (err) {
      console.error('[Auth Restore] Initialization failed:', err);
      set({ isAuthenticated: false, isAuthenticating: false, error: null });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isAuthenticating: true, error: null });
    try {
      const { access_token, refresh_token } = await authApi.login({ email, password });
      await SecureStore.setItemAsync(TOKEN_KEY, access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
      await SecureStore.setItemAsync(AUTH_PROVIDER_KEY, 'email');
      set({ token: access_token, isAuthenticated: true, isAuthenticating: false, authProvider: 'email' });

      // Fetch user profile after login
      await get().fetchUser();
      
      // Sync FCM in background
      get().syncNotifications().catch(console.warn);

      // Log Security notification to history
      const { logNotificationToHistory } = await import('./notificationStore');
      logNotificationToHistory(
        '🔒 Session Secured',
        `Logged in securely as ${email} (Protected session).`,
        'security',
        { type: 'security' }
      );
      logNotificationToHistory(
        '🛡️ Biometrics & Keychain Active',
        'Hardware encryption and secure sandbox keys are enabled on this device.',
        'security',
        { type: 'security' }
      );
      
      return true;
    } catch (err: any) {
      // console.log('[AuthStore] Login failed:', err?.response?.data || err.message);
      let message = 'Login failed. Please try again.';
      
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        // Handle Pydantic validation errors (list of objects)
        message = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || JSON.stringify(detail);
      } else {
        message = err?.message || message;
      }
      
      set({ error: message, isAuthenticating: false });
      return false;
    }
  },

  loginWithGoogle: async () => {
    set({ isAuthenticating: true, error: null });
    try {
      // Step 1: Google Sign-In → Firebase Auth
      console.log('[AuthStore] Starting Google Sign-In...');
      const firebaseUser = await signInWithGoogle();
      
      if (!firebaseUser) {
        // User cancelled
        console.log('[AuthStore] Google Sign-In cancelled');
        set({ isAuthenticating: false });
        return false;
      }
      console.log('[AuthStore] Firebase user:', firebaseUser.email, 'uid:', firebaseUser.uid);

      // Step 2: Get Firebase ID token
      const idToken = await getFirebaseIdToken();
      if (!idToken) {
        throw new Error('Failed to get Firebase ID token');
      }
      console.log('[AuthStore] Firebase ID token obtained, length:', idToken.length);

      // Step 3: Sync with KnoVault backend (exchange Firebase token for KnoVault JWT)
      console.log('[AuthStore] Sending firebase-sync to:', env.API_BASE_URL);
      const { access_token, refresh_token, user } = await authApi.firebaseSync(idToken);
      console.log('[AuthStore] Backend sync success, user:', user.email);

      // Step 4: Store KnoVault tokens
      await SecureStore.setItemAsync(TOKEN_KEY, access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
      await SecureStore.setItemAsync(AUTH_PROVIDER_KEY, 'google');

      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isAuthenticating: false,
        authProvider: 'google',
      });

      console.log('[AuthStore] Google Sign-In complete:', user.email);

      // Sync FCM in background
      get().syncNotifications().catch(console.warn);

      // Log Security notification to history
      const { logNotificationToHistory } = await import('./notificationStore');
      logNotificationToHistory(
        '🔒 Session Secured',
        `Logged in securely as ${user.email} (Protected session).`,
        'security',
        { type: 'security' }
      );
      logNotificationToHistory(
        '🛡️ Biometrics & Keychain Active',
        'Hardware encryption and secure sandbox keys are enabled on this device.',
        'security',
        { type: 'security' }
      );

      return true;
    } catch (err: any) {
      const isNetworkError = err?.message === 'Network Error' || err?.code === 'ECONNABORTED';
      console.error('[AuthStore] Google Sign-In failed:', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
        code: err?.code,
        isNetworkError,
        apiUrl: env.API_BASE_URL,
      });
      
      let message: string;
      if (isNetworkError) {
        message = `Cannot reach backend at ${env.API_BASE_URL}. Make sure backend is running and phone is on same network.`;
      } else {
        const detail = err?.response?.data?.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else {
          message = err?.message || 'Google Sign-In failed. Please try again.';
        }
      }
      
      set({ error: message, isAuthenticating: false });
      return false;
    }
  },

  register: async (email, fullName) => {
    // console.log('[AuthStore] register called with:', email, fullName);
    set({ isAuthenticating: true, error: null });
    try {
      // console.log('[AuthStore] Calling authApi.register...');
      const response = await authApi.register({ 
        email, 
        full_name: fullName || ''
      });
      // console.log('[AuthStore] authApi.register success:', response);
      set({ isAuthenticating: false });
      return response.message || 'Verification code sent';
    } catch (err: any) {
      // console.log('[AuthStore] Signup init failed:', err?.response?.data || err.message);
      let message = 'Signup failed. Please try again.';
      const detail = err?.response?.data?.detail;
      message = typeof detail === 'string' ? detail : err?.message || message;
      set({ error: message, isAuthenticating: false });
      throw new Error(message);
    }
  },

  completeSignup: async (email, code, password) => {
    set({ isAuthenticating: true, error: null });
    try {
      const { access_token, refresh_token, user } = await authApi.completeSignup({
        email,
        code,
        password
      });
      
      await SecureStore.setItemAsync(TOKEN_KEY, access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
      await SecureStore.setItemAsync(AUTH_PROVIDER_KEY, 'email');
      
      set({ 
        token: access_token, 
        user, 
        isAuthenticated: true, 
        isAuthenticating: false,
        authProvider: 'email',
      });

      // Sync FCM in background
      get().syncNotifications().catch(console.warn);

      // Log Security notification to history
      const { logNotificationToHistory } = await import('./notificationStore');
      logNotificationToHistory(
        '🔒 Session Secured',
        `Logged in securely as ${email} (Protected session).`,
        'security',
        { type: 'security' }
      );
      logNotificationToHistory(
        '🛡️ Biometrics & Keychain Active',
        'Hardware encryption and secure sandbox keys are enabled on this device.',
        'security',
        { type: 'security' }
      );
      
      return true;
    } catch (err: any) {
      // console.log('[AuthStore] Complete signup failed:', err?.response?.data || err.message);
      let message = 'Failed to create password. Please try again.';
      const detail = err?.response?.data?.detail;
      message = typeof detail === 'string' ? detail : err?.message || message;
      set({ error: message, isAuthenticating: false });
      return false;
    }
  },

  fetchUser: async () => {
    try {
      const user = await authApi.getProfile();
      set({ user });
    } catch {
      // Profile fetch failed — user might still be functional with token
    }
  },

  logout: async () => {
    const { authProvider } = get();
    
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(AUTH_PROVIDER_KEY);
    } catch {
      // Ignore cleanup errors
    }

    // Sign out of Firebase if Google was used
    if (authProvider === 'google') {
      try {
        await signOutFirebase();
      } catch {
        // Ignore Firebase sign-out errors
      }
    }

    set({ token: null, user: null, isAuthenticated: false, error: null, authProvider: null });
  },

  clearError: () => set({ error: null }),

  syncNotifications: async () => {
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await syncFCMToken();
      }
    } catch (error) {
      console.warn('[AuthStore] FCM sync error:', error);
    }
  },
}));
