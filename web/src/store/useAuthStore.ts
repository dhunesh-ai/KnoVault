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
  logout: () => void;
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
  logout: () => {
    clearAuthCookies();
    set({ user: null, isAuthenticated: false, isLoading: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
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
        set({ user: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
  },
  loginWithGoogle: async () => {
    const targetUrl = `${API_BASE_URL}/api/auth/firebase-sync`;
    try {
      console.log("[GOOGLE LOGIN] Step 1: Initiating Firebase OAuth Popup...");
      const { signInWithPopup } = await import('firebase/auth');
      const { auth, googleProvider } = await import('../lib/firebase');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[GOOGLE LOGIN] Step 2: Firebase OAuth success, user:", result.user.email);
      const idToken = await result.user.getIdToken();
      
      const payload = { id_token: idToken };
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      
      console.log("[GOOGLE LOGIN] Step 3: Dispatching Token Exchange Request");
      console.log(`[GOOGLE LOGIN] Request URL: POST ${targetUrl}`);
      console.log("[GOOGLE LOGIN] Headers:", headers);
      console.log("[GOOGLE LOGIN] Request Body (preview):", { id_token: idToken.slice(0, 20) + "..." });
      
      const response = await api.post('/api/auth/firebase-sync', payload);
      
      console.log("[GOOGLE LOGIN] Step 4: Token Exchange Success!");
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

      const errorDetail = error.response?.data?.detail || error.message || "Google sign-in failed. Please try again.";
      throw new Error(errorDetail);
    }
  },
}));
