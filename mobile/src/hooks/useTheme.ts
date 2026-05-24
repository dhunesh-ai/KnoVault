import { useThemeStore } from '../store/themeStore';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { useMemo } from 'react';

export const useTheme = () => {
  const { mode, systemColorScheme, setMode } = useThemeStore();
  
  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  
  const theme = useMemo(() => {
    return isDark ? darkTheme : lightTheme;
  }, [isDark]);

  return {
    mode,
    setMode,
    isDark,
    theme,
    colors: theme.colors,
    background: theme.background,
    surface: theme.surface,
    card: theme.card,
    input: theme.input,
    border: theme.border,
    text: theme.text,
    textSecondary: theme.textSecondary,
    primary: theme.primary,
    accent: theme.accent,
    success: theme.success,
    warning: theme.warning,
    danger: theme.danger,
    shadow: theme.shadow,
    overlay: theme.overlay,
  };
};
