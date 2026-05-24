import { lightColors } from './colors';

export const lightTheme = {
  isDark: false,
  background: '#F5F5FA',
  surface: '#F1F5F9',
  card: '#FFFFFF',
  input: '#FFFFFF',
  border: '#E8E8F0',
  text: '#1A1A1A',
  textSecondary: '#71717A',
  primary: '#7C4DFF',
  accent: '#6A5CFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  shadow: 'rgba(0, 0, 0, 0.05)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  
  // Nesting for backward compatibility
  colors: lightColors,
};

export type ThemeType = typeof lightTheme;
