import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing } from '../theme';

interface Props {
  visible: boolean;
  message?: string | null;
}

export function LoadingOverlay({ visible, message }: Props) {
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={[
        styles.overlay, 
        { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }
      ]}>
        <View style={[
          styles.container, 
          { 
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1.2
          }
        ]}>
          <ActivityIndicator size="large" color={theme.primary} />
          {message && (
            <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 20,
    padding: spacing.xxxl,
    alignItems: 'center',
    minWidth: 160,
  },
  message: {
    ...typography.bodyMedium,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
