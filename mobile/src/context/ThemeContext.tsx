import React, { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useTheme } from '../hooks/useTheme';

export { useTheme };

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialize = useThemeStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
};
