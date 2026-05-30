import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const PASSCODE_KEY = 'knovault_passcode_hash';
const PASSCODE_ENABLED_KEY = 'knovault_app_lock';
const ANIMATIONS_ENABLED_KEY = 'knovault_animations';

interface SettingsState {
  passcodeEnabled: boolean;
  passcodeHash: string | null;
  isUnlocked: boolean;
  animationsEnabled: boolean;
  isOnboarded: boolean;
  isInitialized: boolean;

  // Actions
  initializeSettings: () => Promise<void>;
  setPasscode: (passcode: string) => Promise<void>;
  disablePasscode: () => Promise<void>;
  verifyPasscode: (passcode: string) => boolean;
  setUnlocked: (unlocked: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  passcodeEnabled: false,
  passcodeHash: null,
  isUnlocked: false,
  animationsEnabled: true,
  isOnboarded: false,
  isInitialized: false,

  initializeSettings: async () => {
    try {
      const lockEnabled = await SecureStore.getItemAsync(PASSCODE_ENABLED_KEY);
      const hash = await SecureStore.getItemAsync(PASSCODE_KEY);
      const anims = await SecureStore.getItemAsync(ANIMATIONS_ENABLED_KEY);
      const onboarded = await SecureStore.getItemAsync('knovault_onboarding_completed');

      set({
        passcodeEnabled: lockEnabled === 'true',
        passcodeHash: hash || null,
        animationsEnabled: anims !== 'false', // Default to true
        isOnboarded: onboarded === 'true',
        isUnlocked: lockEnabled !== 'true', // Auto-unlock if no passcode
        isInitialized: true,
      });
    } catch (e) {
      console.error('[SettingsStore] Failed to initialize', e);
      set({ isInitialized: true });
    }
  },

  setPasscode: async (passcode: string) => {
    try {
      const hash = CryptoJS.SHA256(passcode).toString();
      await SecureStore.setItemAsync(PASSCODE_KEY, hash);
      await SecureStore.setItemAsync(PASSCODE_ENABLED_KEY, 'true');
      set({ passcodeEnabled: true, passcodeHash: hash, isUnlocked: true });
    } catch (e) {
      console.error('[SettingsStore] Failed to set passcode', e);
      throw e;
    }
  },

  disablePasscode: async () => {
    try {
      await SecureStore.deleteItemAsync(PASSCODE_KEY);
      await SecureStore.setItemAsync(PASSCODE_ENABLED_KEY, 'false');
      set({ passcodeEnabled: false, passcodeHash: null, isUnlocked: true });
    } catch (e) {
      console.error('[SettingsStore] Failed to disable passcode', e);
      throw e;
    }
  },

  verifyPasscode: (passcode: string) => {
    const { passcodeHash } = get();
    if (!passcodeHash) return false;
    
    const inputHash = CryptoJS.SHA256(passcode).toString();
    const isValid = inputHash === passcodeHash;
    if (isValid) {
      set({ isUnlocked: true });
    }
    return isValid;
  },

  setUnlocked: (unlocked: boolean) => {
    set({ isUnlocked: unlocked });
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
  }
}));
