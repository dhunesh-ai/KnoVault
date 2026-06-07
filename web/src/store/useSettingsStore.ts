import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  theme: "dark" | "light" | "system";
  notificationsEnabled: boolean;
  aiVoiceEnabled: boolean;
  secureNotesTimeout: number; // in minutes
  setTheme: (theme: "dark" | "light" | "system") => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAiVoiceEnabled: (enabled: boolean) => void;
  setSecureNotesTimeout: (minutes: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      notificationsEnabled: false,
      aiVoiceEnabled: true,
      secureNotesTimeout: 15, // 15 mins default

      setTheme: (theme) => set({ theme }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setAiVoiceEnabled: (enabled) => set({ aiVoiceEnabled: enabled }),
      setSecureNotesTimeout: (minutes) => set({ secureNotesTimeout: minutes }),
    }),
    {
      name: "knovault-settings",
    }
  )
);
