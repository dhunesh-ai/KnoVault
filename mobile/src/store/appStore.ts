/**
 * Kogniva — App Store (Zustand)
 *
 * Global app state for UI-level concerns (loading, modals, etc.)
 */
import { create } from 'zustand';

interface AppState {
  isGlobalLoading: boolean;
  loadingMessage: string | null;
  isOffline: boolean;
  networkReady: boolean;
  isBackendDown: boolean;
  theme: 'light' | 'dark' | 'system';
  isSyncing: boolean;

  setGlobalLoading: (loading: boolean, message?: string | null) => void;
  setOfflineStatus: (status: boolean) => void;
  setNetworkReady: (ready: boolean) => void;
  setBackendDown: (status: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSyncing: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isGlobalLoading: false,
  loadingMessage: null,
  isOffline: false,
  networkReady: false,
  isBackendDown: false,
  theme: 'dark',
  isSyncing: false,

  setGlobalLoading: (loading, message = null) =>
    set({ isGlobalLoading: loading, loadingMessage: message }),
  setOfflineStatus: (status) => set({ isOffline: status }),
  setNetworkReady: (ready) => set({ networkReady: ready }),
  setBackendDown: (status) => set({ isBackendDown: status }),
  setTheme: (theme) => set({ theme }),
  setSyncing: (status) => set({ isSyncing: status }),
}));
