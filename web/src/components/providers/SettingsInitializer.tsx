"use client";

import { useEffect } from "react";
import { useSettingsStore, applySettingsToDOM } from "@/store/useSettingsStore";

export function SettingsInitializer({ children }: { children: React.ReactNode }) {
  const settings = useSettingsStore();

  useEffect(() => {
    applySettingsToDOM({
      accentColor: settings.accentColor,
      compactMode: settings.compactMode,
      reduceMotion: settings.reduceMotion,
    });
  }, [settings.accentColor, settings.compactMode, settings.reduceMotion]);

  return <>{children}</>;
}
