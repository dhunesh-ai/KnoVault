import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NotificationPreferences {
  reminderAlerts: boolean;
  medicineAlerts: boolean;
  goalAlerts: boolean;
  specialDaysAlerts: boolean;
  workspaceAlerts: boolean;
  aiNotifications: boolean;
  dailySummaryEmail: boolean;
  soundEffects: boolean;
}

export type AccentColor = "Purple" | "Blue" | "Green" | "Orange" | "Pink";
export type ThemeMode = "dark" | "light" | "system";
export type StorageMode = "cloud" | "cloud_gdrive" | "local" | "gdrive";

export const ACCENT_COLOR_MAP: Record<AccentColor, { primary: string; ring: string; hover: string; soft: string; border: string }> = {
  Purple: {
    primary: "#7C4DFF",
    ring: "#7C4DFF",
    hover: "#6C39FF",
    soft: "rgba(124, 77, 255, 0.12)",
    border: "rgba(124, 77, 255, 0.3)",
  },
  Blue: {
    primary: "#3B82F6",
    ring: "#3B82F6",
    hover: "#2563EB",
    soft: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.3)",
  },
  Green: {
    primary: "#10B981",
    ring: "#10B981",
    hover: "#059669",
    soft: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.3)",
  },
  Orange: {
    primary: "#F97316",
    ring: "#F97316",
    hover: "#EA580C",
    soft: "rgba(249, 115, 22, 0.12)",
    border: "rgba(249, 115, 22, 0.3)",
  },
  Pink: {
    primary: "#F43F5E",
    ring: "#F43F5E",
    hover: "#E11D48",
    soft: "rgba(244, 63, 94, 0.12)",
    border: "rgba(244, 63, 94, 0.3)",
  },
};

export function applySettingsToDOM(settings: {
  theme?: ThemeMode;
  accentColor?: AccentColor;
  compactMode?: boolean;
  reduceMotion?: boolean;
}) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;

  if (settings.theme) {
    const isDark =
      settings.theme === "dark" ||
      (settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  if (settings.accentColor && ACCENT_COLOR_MAP[settings.accentColor]) {
    const config = ACCENT_COLOR_MAP[settings.accentColor];
    root.style.setProperty("--primary", config.primary);
    root.style.setProperty("--ring", config.ring);
    root.style.setProperty("--accent-primary", config.primary);
    root.style.setProperty("--accent-hover", config.hover);
    root.style.setProperty("--accent-soft", config.soft);
    root.style.setProperty("--accent-border", config.border);
    root.style.setProperty("--accent-ring", config.ring);
    root.style.setProperty("--sidebar-primary", config.primary);
    root.style.setProperty("--sidebar-ring", config.ring);
  }

  if (typeof settings.compactMode === "boolean") {
    if (settings.compactMode) {
      root.classList.add("compact-ui");
    } else {
      root.classList.remove("compact-ui");
    }
  }

  if (typeof settings.reduceMotion === "boolean") {
    if (settings.reduceMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  }
}

interface SettingsState {
  theme: ThemeMode;
  accentColor: AccentColor;
  compactMode: boolean;
  reduceMotion: boolean;
  notificationsEnabled: boolean;
  notificationPreferences: NotificationPreferences;
  aiVoiceEnabled: boolean;
  secureNotesTimeout: number;

  // Storage Settings
  storageMode: StorageMode;
  autoSwitchWhenFull: boolean;
  googleDriveConnected: boolean;
  googleDriveEmail: string | null;
  lastDriveSync: string | null;

  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setCompactMode: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationPreference: <K extends keyof NotificationPreferences>(key: K, value: boolean) => void;
  setAiVoiceEnabled: (enabled: boolean) => void;
  setSecureNotesTimeout: (minutes: number) => void;

  setStorageMode: (mode: StorageMode) => void;
  setAutoSwitchWhenFull: (enabled: boolean) => void;
  setGoogleDriveConnected: (connected: boolean) => void;
  setGoogleDriveEmail: (email: string | null) => void;
  setLastDriveSync: (timestamp: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "system",
      accentColor: "Purple",
      compactMode: false,
      reduceMotion: false,
      notificationsEnabled: true,
      notificationPreferences: {
        reminderAlerts: true,
        medicineAlerts: true,
        goalAlerts: true,
        specialDaysAlerts: true,
        workspaceAlerts: true,
        aiNotifications: true,
        dailySummaryEmail: false,
        soundEffects: true,
      },
      aiVoiceEnabled: true,
      secureNotesTimeout: 15,

      // Storage Defaults
      storageMode: "cloud",
      autoSwitchWhenFull: true,
      googleDriveConnected: false,
      googleDriveEmail: null,
      lastDriveSync: null,

      setTheme: (theme) => {
        set({ theme });
        applySettingsToDOM({ ...get(), theme });
      },
      setAccentColor: (accentColor) => {
        set({ accentColor });
        applySettingsToDOM({ ...get(), accentColor });
      },
      setCompactMode: (compactMode) => {
        set({ compactMode });
        applySettingsToDOM({ ...get(), compactMode });
      },
      setReduceMotion: (reduceMotion) => {
        set({ reduceMotion });
        applySettingsToDOM({ ...get(), reduceMotion });
      },
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setNotificationPreference: (key, value) =>
        set((state) => ({
          notificationPreferences: {
            ...state.notificationPreferences,
            [key]: value,
          },
        })),
      setAiVoiceEnabled: (aiVoiceEnabled) => set({ aiVoiceEnabled }),
      setSecureNotesTimeout: (secureNotesTimeout) => set({ secureNotesTimeout }),

      setStorageMode: (storageMode) => set({ storageMode }),
      setAutoSwitchWhenFull: (autoSwitchWhenFull) => set({ autoSwitchWhenFull }),
      setGoogleDriveConnected: (googleDriveConnected) => set({ googleDriveConnected }),
      setGoogleDriveEmail: (googleDriveEmail) => set({ googleDriveEmail }),
      setLastDriveSync: (lastDriveSync) => set({ lastDriveSync }),
    }),
    {
      name: "knovault-settings",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applySettingsToDOM(state);
        }
      },
    }
  )
);

