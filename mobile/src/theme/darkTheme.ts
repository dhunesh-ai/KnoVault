import { darkColors } from './colors';
import { ThemeType } from './lightTheme';

export const darkTheme: ThemeType = {
  isDark: true,
  background: '#081120',
  surface: '#101A2E',
  card: '#182235',
  input: '#182235',
  border: 'rgba(255, 255, 255, 0.06)',
  text: '#F5F7FF',
  textSecondary: '#A8B3CF',
  primary: '#7C4DFF',
  accent: '#6A5CFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Nesting for backward compatibility
  colors: darkColors,
};
