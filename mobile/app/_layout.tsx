/**
 * Kogniva — Root Layout
 *
 * Handles app initialization, auth state restoration,
 * and route protection via redirect.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import OfflineBanner from '../src/components/OfflineBanner';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';
import { colors, lightColors } from '../src/theme/colors';
import { setupNotificationListeners } from '../src/utils/notifications';


import { ThemeProvider } from '../src/context/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const { isLoading, isAuthenticated, user, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  console.log('[RootLayout] Render - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', !!user);

  // Initialize auth on app start
  useEffect(() => {
    console.log('[RootLayout] Mounting - initializing auth...');
    initialize();
  }, []);

  // Initialize FCM notifications
  useEffect(() => {
    console.log('[RootLayout] Setting up FCM listeners...');
    const unsubscribeFCM = setupNotificationListeners();
    return () => {
      unsubscribeFCM();
    };
  }, []);

  // Handle SplashScreen and Auth redirection
  useEffect(() => {
    if (!isLoading) {
      console.log('[RootLayout] Auth initialized - hiding splash screen');
      SplashScreen.hideAsync().catch(console.warn);
    }

    if (isLoading) return;

    // If authenticated but user profile isn't loaded yet, wait for it
    if (isAuthenticated && !user) {
      console.log('[RootLayout] Authenticated but waiting for user profile...');
      return;
    }

    const isVerified = user?.is_verified ?? false;
    const inAuthGroup = segments[0] === '(auth)';

    console.log('[RootLayout] Navigating - segments:', segments, 'auth:', isAuthenticated, 'verified:', isVerified);

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in, redirect to login
      console.log('[RootLayout] Redirecting to login');
      setTimeout(() => router.replace('/(auth)/login'), 0);
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in, redirect to main app (tabs)
      console.log('[RootLayout] Redirecting to tabs');
      setTimeout(() => router.replace('/(tabs)'), 0);
    }
  }, [isLoading, isAuthenticated, user, segments]);

  // Show loading indicator while restoring auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: lightColors.surface.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
