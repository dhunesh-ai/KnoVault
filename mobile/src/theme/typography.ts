/**
 * Kogniva Design System — Typography
 *
 * Clean, modern hierarchy using system fonts (San Francisco/Roboto).
 */
import { Platform } from 'react-native';

const fontConfig = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif' }),
  medium:  Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  bold:    Platform.select({ ios: 'System', android: 'sans-serif-condensed-light' }), // Actually use bold weights
};

export const typography = {
  // ── Display ──────────────────────────────────────────────────────
  displayLarge: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },

  // ── Title ────────────────────────────────────────────────────────
  titleLarge: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600' as const,
  },
  titleMedium: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600' as const,
  },
  titleSmall: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600' as const,
  },

  // ── Body ─────────────────────────────────────────────────────────
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
  },

  // ── Caption / Overline ──────────────────────────────────────────
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
} as const;
