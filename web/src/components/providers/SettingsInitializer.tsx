"use client";

import { useEffect } from "react";
import { useSettingsStore, applySettingsToDOM } from "@/store/useSettingsStore";
import { useTheme } from "next-themes";

export function SettingsInitializer({ children }: { children: React.ReactNode }) {
  const settings = useSettingsStore();
  const { setTheme: setNextTheme } = useTheme();

  useEffect(() => {
    applySettingsToDOM({
      theme: settings.theme,
      accentColor: settings.accentColor,
      compactMode: settings.compactMode,
      reduceMotion: settings.reduceMotion,
    });
    if (settings.theme) {
      setNextTheme(settings.theme);
    }
  }, [settings.theme, settings.accentColor, settings.compactMode, settings.reduceMotion, setNextTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      if (settings.theme === "system") {
        applySettingsToDOM({ theme: "system" });
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [settings.theme]);

  return <>{children}</>;
}
