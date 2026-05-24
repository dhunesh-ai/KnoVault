import React from 'react';
import { Text, StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { getThemedShadow } from './ThemedComponents';
import { typography, spacing, borderRadius } from '../theme';

interface FeatureCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
  style?: ViewStyle;
  badge?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ title, icon, color, onPress, style, badge }) => {
  const { colors, theme, isDark } = useTheme();

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1.2,
          ...getThemedShadow(theme, 'soft')
        }, 
        style
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
        {badge ? (
          <View style={[styles.badge, { borderColor: theme.card }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.titleSmall,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F43F5E',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
