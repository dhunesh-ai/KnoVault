/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import Cookies from 'js-cookie';
import api from '../lib/axios';

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
    Cookies.set('user_token', access_token, { expires: 7, secure: true });
    Cookies.set('refresh_token', refresh_token, { expires: 30, secure: true });
    set({ user, isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    Cookies.remove('user_token');
    Cookies.remove('refresh_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const token = Cookies.get('user_token');
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      
      const response = await api.get('/api/auth/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('user_token');
      Cookies.remove('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  loginWithGoogle: async () => {
    try {
      console.log("Attempting Google Login");
      const { signInWithPopup } = await import('firebase/auth');
      const { auth, googleProvider } = await import('../lib/firebase');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Current User:", result.user);
      const idToken = await result.user.getIdToken();
      
      const response = await api.post('/api/auth/firebase-sync', { id_token: idToken });
      const { access_token, refresh_token, user } = response.data;
      
      Cookies.set('user_token', access_token, { expires: 7, secure: true });
      Cookies.set('refresh_token', refresh_token, { expires: 30, secure: true });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any  ) {
      console.error("Firebase Auth Error:", error.code, error.message);
      console.error('Google login failed:', error);
      throw new Error(error.response?.data?.detail || "Google sign-in failed");
    }
  },
}));
