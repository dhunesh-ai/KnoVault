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
  microphoneAccessEnabled: boolean;
  hasCreatedFirstNotificationItem: boolean;
  hasTappedMicrophoneBefore: boolean;

  // Hybrid Storage System Settings
  storageMode: 'cloud' | 'cloud_gdrive' | 'cloud_local' | 'gdrive' | 'local';
  autoSwitchWhenFull: boolean;
  googleDriveConnected: boolean;
  googleDriveAccessToken: string | null;
  lastDriveSync: string | null;
  rememberChoice: boolean;

  // Actions
  initializeSettings: () => Promise<void>;
  setAnimationsEnabled: (enabled: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  toggleNotificationSetting: (key: keyof SettingsState, storageKey: string, value: boolean) => Promise<void>;
  setMicrophoneAccessEnabled: (enabled: boolean) => Promise<void>;
  setHasCreatedFirstNotificationItem: (value: boolean) => Promise<void>;
  setHasTappedMicrophoneBefore: (value: boolean) => Promise<void>;
  setStorageMode: (mode: 'cloud' | 'cloud_gdrive' | 'cloud_local' | 'gdrive' | 'local') => Promise<void>;
  setAutoSwitchWhenFull: (enabled: boolean) => Promise<void>;
  setGoogleDriveConnected: (connected: boolean) => Promise<void>;
  setGoogleDriveAccessToken: (token: string | null) => Promise<void>;
  setLastDriveSync: (timestamp: string | null) => Promise<void>;
  setRememberChoice: (remember: boolean) => Promise<void>;
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
  microphoneAccessEnabled: false,
  hasCreatedFirstNotificationItem: false,
  hasTappedMicrophoneBefore: false,

  // Hybrid Storage Defaults
  storageMode: 'cloud',
  autoSwitchWhenFull: true,
  googleDriveConnected: false,
  googleDriveAccessToken: null,
  lastDriveSync: null,
  rememberChoice: false,

  initializeSettings: async () => {
    try {
      const anims = await SecureStore.getItemAsync('knovault_animations');
      const onboarded = await SecureStore.getItemAsync('knovault_onboarding_completed');

      const notifsEnabled = await SecureStore.getItemAsync('knovault_notifications');
      const notifsReminders = await SecureStore.getItemAsync('knovault_notif_reminders');
      const notifsGoals = await SecureStore.getItemAsync('knovault_notif_goals');
      const notifsSummary = await SecureStore.getItemAsync('knovault_notif_summary');
      const notifsSound = await SecureStore.getItemAsync('knovault_notif_sound');
      const notifsVibration = await SecureStore.getItemAsync('knovault_notif_vibration');
      const micEnabled = await SecureStore.getItemAsync('knovault_mic_enabled');
      const hasCreatedFirstNotif = await SecureStore.getItemAsync('knovault_has_created_first_notif');
      const hasTappedMic = await SecureStore.getItemAsync('knovault_has_tapped_mic');

      // Hybrid storage settings from SecureStore
      const mode = await SecureStore.getItemAsync('knovault_storage_mode') as SettingsState['storageMode'] || 'cloud';
      const autoSwitch = await SecureStore.getItemAsync('knovault_storage_auto_switch') !== 'false';
      const gDriveConnected = await SecureStore.getItemAsync('knovault_storage_gdrive_connected') === 'true';
      const gDriveToken = await SecureStore.getItemAsync('knovault_storage_gdrive_token') || null;
      const lastSync = await SecureStore.getItemAsync('knovault_storage_last_sync') || null;
      const remember = await SecureStore.getItemAsync('knovault_storage_remember_choice') === 'true';

      set({
        animationsEnabled: anims === 'true', // Default to false
        isOnboarded: onboarded === 'true',
        notificationsEnabled: notifsEnabled !== 'false',
        notificationReminders: notifsReminders !== 'false',
        notificationGoals: notifsGoals !== 'false',
        notificationDailySummary: notifsSummary !== 'false',
        notificationSound: notifsSound !== 'false',
        notificationVibration: notifsVibration !== 'false',
        microphoneAccessEnabled: micEnabled === 'true', // Default to false
        hasCreatedFirstNotificationItem: hasCreatedFirstNotif === 'true',
        hasTappedMicrophoneBefore: hasTappedMic === 'true',
        storageMode: mode,
        autoSwitchWhenFull: autoSwitch,
        googleDriveConnected: gDriveConnected,
        googleDriveAccessToken: gDriveToken,
        lastDriveSync: lastSync,
        rememberChoice: remember,
        isInitialized: true,
      });
    } catch (e) {
      console.error('[SettingsStore] Failed to initialize', e);
      set({ isInitialized: true });
    }
  },

  setAnimationsEnabled: async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync('knovault_animations', enabled ? 'true' : 'false');
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

  setMicrophoneAccessEnabled: async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync('knovault_mic_enabled', enabled ? 'true' : 'false');
      set({ microphoneAccessEnabled: enabled });
    } catch (e) {
      console.error('[SettingsStore] Failed to set microphone access', e);
      throw e;
    }
  },

  setHasCreatedFirstNotificationItem: async (val: boolean) => {
    try {
      await SecureStore.setItemAsync('knovault_has_created_first_notif', val ? 'true' : 'false');
      set({ hasCreatedFirstNotificationItem: val });
    } catch (e) {
      console.error('[SettingsStore] Failed to set hasCreatedFirstNotificationItem', e);
    }
  },

  setHasTappedMicrophoneBefore: async (val: boolean) => {
    try {
      await SecureStore.setItemAsync('knovault_has_tapped_mic', val ? 'true' : 'false');
      set({ hasTappedMicrophoneBefore: val });
    } catch (e) {
      console.error('[SettingsStore] Failed to set hasTappedMicrophoneBefore', e);
    }
  },

  setStorageMode: async (mode: SettingsState['storageMode']) => {
    try {
      await SecureStore.setItemAsync('knovault_storage_mode', mode);
      set({ storageMode: mode });
    } catch (e) {
      console.error('[SettingsStore] Failed to set storage mode', e);
    }
  },

  setAutoSwitchWhenFull: async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync('knovault_storage_auto_switch', enabled ? 'true' : 'false');
      set({ autoSwitchWhenFull: enabled });
    } catch (e) {
      console.error('[SettingsStore] Failed to set auto switch', e);
    }
  },

  setGoogleDriveConnected: async (connected: boolean) => {
    try {
      await SecureStore.setItemAsync('knovault_storage_gdrive_connected', connected ? 'true' : 'false');
      set({ googleDriveConnected: connected });
    } catch (e) {
      console.error('[SettingsStore] Failed to set gdrive connected', e);
    }
  },

  setGoogleDriveAccessToken: async (token: string | null) => {
    try {
      if (token) {
        await SecureStore.setItemAsync('knovault_storage_gdrive_token', token);
      } else {
        await SecureStore.deleteItemAsync('knovault_storage_gdrive_token');
      }
      set({ googleDriveAccessToken: token });
    } catch (e) {
      console.error('[SettingsStore] Failed to set gdrive token', e);
    }
  },

  setLastDriveSync: async (timestamp: string | null) => {
    try {
      if (timestamp) {
        await SecureStore.setItemAsync('knovault_storage_last_sync', timestamp);
      } else {
        await SecureStore.deleteItemAsync('knovault_storage_last_sync');
      }
      set({ lastDriveSync: timestamp });
    } catch (e) {
      console.error('[SettingsStore] Failed to set last sync', e);
    }
  },

  setRememberChoice: async (remember: boolean) => {
    try {
      await SecureStore.setItemAsync('knovault_storage_remember_choice', remember ? 'true' : 'false');
      set({ rememberChoice: remember });
    } catch (e) {
      console.error('[SettingsStore] Failed to set remember choice', e);
    }
  }
}));
