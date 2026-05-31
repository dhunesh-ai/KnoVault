import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const ANIMATIONS_ENABLED_KEY = 'knovault_animations';

interface SettingsState {
  animationsEnabled: boolean;
  isOnboarded: boolean;
  isInitialized: boolean;
  notificationsEnabled: boolean;
  notificationReminders: boolean;
  notificationGoals: boolean;
  notificationDailySummary: boolean;
  notificationSound: boolean;
  notificationVibration: boolean;
  microphoneEnabled: boolean;

  // Actions
  initializeSettings: () => Promise<void>;
  setAnimationsEnabled: (enabled: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  toggleNotificationSetting: (key: keyof SettingsState, storageKey: string, value: boolean) => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  animationsEnabled: false,
  isOnboarded: false,
  isInitialized: false,
  notificationsEnabled: true,
  notificationReminders: true,
  notificationGoals: true,
  notificationDailySummary: true,
  notificationSound: true,
  notificationVibration: true,
  microphoneEnabled: false,

  initializeSettings: async () => {
    try {
      const anims = await SecureStore.getItemAsync(ANIMATIONS_ENABLED_KEY);
      const onboarded = await SecureStore.getItemAsync('knovault_onboarding_completed');

      const notifsEnabled = await SecureStore.getItemAsync('knovault_notifications');
      const notifsReminders = await SecureStore.getItemAsync('knovault_notif_reminders');
      const notifsGoals = await SecureStore.getItemAsync('knovault_notif_goals');
      const notifsSummary = await SecureStore.getItemAsync('knovault_notif_summary');
      const notifsSound = await SecureStore.getItemAsync('knovault_notif_sound');
      const notifsVibration = await SecureStore.getItemAsync('knovault_notif_vibration');
      const micEnabled = await SecureStore.getItemAsync('knovault_mic_enabled');

      set({
        animationsEnabled: anims === 'true', // Default to false
        isOnboarded: onboarded === 'true',
        notificationsEnabled: notifsEnabled !== 'false',
        notificationReminders: notifsReminders !== 'false',
        notificationGoals: notifsGoals !== 'false',
        notificationDailySummary: notifsSummary !== 'false',
        notificationSound: notifsSound !== 'false',
        notificationVibration: notifsVibration !== 'false',
        microphoneEnabled: micEnabled === 'true', // Default to false
        isInitialized: true,
      });
    } catch (e) {
      console.error('[SettingsStore] Failed to initialize', e);
      set({ isInitialized: true });
    }
  },

  setAnimationsEnabled: async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync(ANIMATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
      set({ animationsEnabled: enabled });
    } catch (e) {
      console.error('[SettingsStore] Failed to set animations', e);
      throw e;
    }
  },

  completeOnboarding: async () => {
    try {
      await SecureStore.setItemAsync('knovault_onboarding_completed', 'true');
      set({ isOnboarded: true });
    } catch (e) {
      console.error('[SettingsStore] Failed to complete onboarding', e);
      throw e;
    }
  },
  
  toggleNotificationSetting: async (key: keyof SettingsState, storageKey: string, value: boolean) => {
    try {
      await SecureStore.setItemAsync(storageKey, value ? 'true' : 'false');
      set({ [key]: value } as Partial<SettingsState>);
    } catch (e) {
      console.error(`[SettingsStore] Failed to set ${key}`, e);
    }
  },

  setMicrophoneEnabled: async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync('knovault_mic_enabled', enabled ? 'true' : 'false');
      set({ microphoneEnabled: enabled });
    } catch (e) {
      console.error('[SettingsStore] Failed to set microphone', e);
      throw e;
    }
  }
}));
