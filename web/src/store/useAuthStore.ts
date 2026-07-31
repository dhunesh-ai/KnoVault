/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import Cookies from 'js-cookie';
import api, { setAuthCookies, clearAuthCookies, API_BASE_URL } from '../lib/axios';

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_verified: boolean;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (access_token: string, refresh_token: string, user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  login: (access_token, refresh_token, user) => {
    setAuthCookies(access_token, refresh_token);
    set({ user, isAuthenticated: true, isLoading: false });
  },
  logout: async () => {
    try {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase sign out error:", e);
    } finally {
      clearAuthCookies();
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },
  checkAuth: async () => {
    try {
      const token = Cookies.get('user_token');
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      
      // Optimistically set authenticated state so the app shell renders immediately
      set({ isAuthenticated: true, isLoading: false });
      
      const response = await api.get('/api/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (error: any) {
      console.error('Auth check failed:', error);
      // Only clear credentials and redirect if the server explicitly rejected the token (401/403)
      if (error.response?.status === 401 || error.response?.status === 403) {
        clearAuthCookies();
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        set({ user: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
  },
  loginWithGoogle: async () => {
    const { getApiBaseUrl } = await import('../lib/axios');
    const baseUrl = getApiBaseUrl();
    const targetUrl = `${baseUrl}/api/auth/firebase-sync`;
    try {
      console.log("[GOOGLE LOGIN] Step 1: Pre-login cleanup & resetting Firebase Auth...");
      const { signInWithPopup, signOut } = await import('firebase/auth');
      const { auth, getGoogleProvider } = await import('../lib/firebase');
      
      // Ensure any existing Firebase session or cached tokens are completely cleared
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("[GOOGLE LOGIN] Pre-login Firebase signout warning:", e);
      }
      clearAuthCookies();
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      console.log("[GOOGLE LOGIN] Step 2: Instantiating GoogleAuthProvider with prompt='select_account'...");
      const provider = getGoogleProvider();

      console.log("[GOOGLE LOGIN] Step 3: Initiating Firebase OAuth Popup...");
      const result = await signInWithPopup(auth, provider);
      console.log("[GOOGLE LOGIN] Step 4: Firebase OAuth success!");
      console.log("[GOOGLE LOGIN] Firebase User Email:", result.user.email);
      console.log("[GOOGLE LOGIN] Firebase User UID:", result.user.uid);
      const idToken = await result.user.getIdToken();
      console.log("[GOOGLE LOGIN] Firebase ID Token generated successfully.");
      console.log("[GOOGLE LOGIN] Firebase ID Token Length:", idToken.length);
      console.log("[GOOGLE LOGIN] Firebase ID Token Preview:", idToken.slice(0, 30) + "...");
      
      const payload = { id_token: idToken };
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      
      const isClient = typeof window !== 'undefined';
      const hostname = isClient ? window.location.hostname : 'SSR';
      const environment = process.env.NODE_ENV || 'unknown';

      console.log("==========================================");
      console.log("[GOOGLE LOGIN] Step 5: DISPATCHING TOKEN EXCHANGE REQUEST");
      console.log("[GOOGLE LOGIN] Hostname:", hostname);
      console.log("[GOOGLE LOGIN] Environment:", environment);
      console.log("[GOOGLE LOGIN] API Base URL:", baseUrl);
      console.log("[GOOGLE LOGIN] Final Request URL:", targetUrl);
      console.log("[GOOGLE LOGIN] HTTP Method: POST");
      console.log("[GOOGLE LOGIN] Request Headers:", headers);
      console.log("[GOOGLE LOGIN] Request Payload (preview):", { id_token: idToken.slice(0, 30) + "..." });
      console.log("==========================================");
      
      const response = await api.post('/api/auth/firebase-sync', payload);
      
      console.log("[GOOGLE LOGIN] Step 6: Token Exchange Success!");
      console.log("[GOOGLE LOGIN] Response Status:", response.status);
      console.log("[GOOGLE LOGIN] Response Body:", response.data);

      const { access_token, refresh_token, user } = response.data;
      setAuthCookies(access_token, refresh_token);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      console.error("==========================================");
      console.error("[GOOGLE LOGIN EXCEPTION LOG]");
      console.error("Target URL:", targetUrl);
      console.error("HTTP Method: POST");
      console.error("Error Code:", error.code);
      console.error("Error Message:", error.message);
      if (error.response) {
        console.error("Response Status:", error.response.status);
        console.error("Response Body:", error.response.data);
      } else {
        console.error("No HTTP response received (Network Error / Connection Refused / CORS Failure)");
      }
      console.error("Stack Trace:", error.stack);
      console.error("==========================================");

      let errorDetail = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (error.response?.data?.detail ? JSON.stringify(error.response.data.detail) : null);

      if (!errorDetail) {
        const isClient = typeof window !== 'undefined';
        const currentHost = isClient ? window.location.hostname : 'SSR';
        const env = process.env.NODE_ENV || 'unknown';
        const statusCode = error.response?.status ? `${error.response.status}` : 'N/A (No Response)';
        const responseBody = error.response?.data ? JSON.stringify(error.response.data) : 'None';

        if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
          errorDetail = `Unable to connect to backend API [${targetUrl}]. Environment: ${env}, Host: ${currentHost}, Base URL: ${baseUrl}, Method: POST, Status: ${statusCode}, Error: Network/CORS Failure. Please verify backend server status and CORS rules.`;
        } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
          errorDetail = `Backend API request timed out after 30s [${targetUrl}]. Environment: ${env}, Host: ${currentHost}, Base URL: ${baseUrl}.`;
        } else if (error.code === "auth/popup-closed-by-user") {
          errorDetail = "Google sign-in popup was closed before completing. (Firebase Error Code: auth/popup-closed-by-user)";
        } else if (error.code === "auth/cancelled-popup-request") {
          errorDetail = "Google sign-in request was cancelled. (Firebase Error Code: auth/cancelled-popup-request)";
        } else if (error.code && typeof error.code === 'string' && error.code.startsWith("auth/")) {
          errorDetail = `Firebase Authentication Error [${error.code}]: ${error.message}`;
        } else {
          errorDetail = `Google sign-in failed: ${error.message || 'Unknown error'}. [Env: ${env}, Host: ${currentHost}, Base URL: ${baseUrl}, Request URL: ${targetUrl}, Method: POST, Status: ${statusCode}, Response: ${responseBody}]`;
        }
      }
      throw new Error(errorDetail);
    }
  },
}));
