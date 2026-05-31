import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing } from '../theme';

export default function OfflineBanner() {
  const { isOffline, isBackendDown, networkReady } = useAppStore();
  const { theme } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  // We show the banner if EITHER the user is offline or the backend is down
  const showBanner = (isOffline || isBackendDown) && networkReady;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showBanner ? 0 : -100,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [showBanner, slideAnim]);

  if (!networkReady) return null;

  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: theme.danger,
        transform: [{ translateY: slideAnim }] 
      }
    ]}>
      <Ionicons name={isOffline ? "cloud-offline" : "server"} size={20} color="#FFFFFF" />
      <Text style={styles.text}>
        {isOffline ? "You are currently offline." : "Server unavailable."}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  text: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
});
