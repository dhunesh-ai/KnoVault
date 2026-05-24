import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle, 
  ViewProps, 
  TextProps,
  TouchableOpacityProps
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';

// ── Themed Shadow Utility ──────────────────────────────────────────
export const getThemedShadow = (theme: any, level: 'soft' | 'medium' | 'strong' = 'soft') => {
  const isDark = theme.isDark;
  if (isDark) {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: level === 'soft' ? 0.35 : level === 'medium' ? 0.5 : 0.7,
      shadowRadius: level === 'soft' ? 8 : level === 'medium' ? 14 : 24,
      elevation: level === 'soft' ? 3 : level === 'medium' ? 6 : 12,
    };
  } else {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: level === 'soft' ? 0.05 : level === 'medium' ? 0.08 : 0.15,
      shadowRadius: level === 'soft' ? 8 : level === 'medium' ? 12 : 20,
      elevation: level === 'soft' ? 2 : level === 'medium' ? 4 : 8,
    };
  }
};

// ── Themed Gradient Utility ────────────────────────────────────────
export const getThemedGradient = (theme: any, type: 'primary' | 'hero' | 'surface' | 'danger' | 'success' | 'subtle' = 'primary') => {
  return theme.colors.gradient[type];
};

// ── Themed Text ────────────────────────────────────────────────────
export const ThemedText: React.FC<TextProps & { type?: 'primary' | 'secondary' | 'inverse' }> = ({ 
  style, 
  type = 'primary', 
  ...props 
}) => {
  const { text, textSecondary, colors } = useTheme();
  const color = type === 'primary' 
    ? text 
    : type === 'secondary' 
      ? textSecondary 
      : colors.white;
  return <Text style={[{ color }, style]} {...props} />;
};

// ── Themed View ────────────────────────────────────────────────────
export const ThemedView: React.FC<ViewProps & { variant?: 'background' | 'surface' | 'card' }> = ({ 
  style, 
  variant = 'background', 
  ...props 
}) => {
  const theme = useTheme();
  const backgroundColor = variant === 'background' 
    ? theme.background 
    : variant === 'surface' 
      ? theme.surface 
      : theme.card;
  return <View style={[{ backgroundColor }, style]} {...props} />;
};

// ── Themed Card ────────────────────────────────────────────────────
interface ThemedCardProps extends ViewProps {
  level?: 'soft' | 'medium' | 'strong';
  onPress?: () => void;
  border?: boolean;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({ 
  style, 
  level = 'soft', 
  onPress, 
  border = true,
  children,
  ...props 
}) => {
  const theme = useTheme();
  
  const cardStyle = [
    styles.card,
    { 
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: border ? 1 : 0,
      ...getThemedShadow(theme, level)
    },
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity 
        style={cardStyle} 
        onPress={onPress} 
        activeOpacity={0.8}
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
  },
});
