import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  systemColorScheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setSystemColorScheme: (colorScheme: 'light' | 'dark') => void;
  initialize: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'knovault_theme_mode';

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  systemColorScheme: Appearance.getColorScheme() || 'light',

  setMode: async (newMode: ThemeMode) => {
    set({ mode: newMode });
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.warn('Failed to save theme to SecureStore', e);
    }
  },

  setSystemColorScheme: (colorScheme: 'light' | 'dark') => {
    set({ systemColorScheme: colorScheme });
  },

  initialize: async () => {
    try {
      const savedMode = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        set({ mode: savedMode });
      }
    } catch (e) {
      console.warn('Failed to load theme from SecureStore', e);
    }

    // Set initial system color scheme
    set({ systemColorScheme: Appearance.getColorScheme() || 'light' });

    // Listen to system theme changes
    Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        set({ systemColorScheme: colorScheme });
      }
    });
  },
}));
