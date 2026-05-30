/**
 * Kogniva — Root Layout
 *
 * Handles app initialization, auth state restoration,
 * and route protection via redirect.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, DeviceEventEmitter, AppState } from 'react-native';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import OfflineBanner from '../src/components/OfflineBanner';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { colors, lightColors } from '../src/theme/colors';
import { setupNotificationListeners } from '../src/utils/notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { syncWorkspace } from '../src/services/sync';
import { initDB } from '../src/services/db';
import LockScreen from '../src/components/LockScreen';

const BACKGROUND_SYNC_TASK = 'background-sync';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const success = await syncWorkspace();
    return success ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 60 * 15, // 15 minutes
      stopOnTerminate: false, // android only
      startOnBoot: true, // android only
    });
  } catch (err) {
    console.log("Task Register failed:", err);
  }
}


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
  const { isInitialized: isSettingsReady, passcodeEnabled, isUnlocked, isOnboarded, initializeSettings, setUnlocked } = useSettingsStore();
  const segments = useSegments();
  const router = useRouter();

  const [isAppReady, setIsAppReady] = React.useState(false);
  const [bootError, setBootError] = React.useState<string | null>(null);

  // Initialize auth and db on app start
  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        console.log('[RootLayout] Mounting - initializing auth & db...');
        
        // Initialize DB FIRST to avoid concurrent SQLite.openDatabaseSync NullPointerException
        await initDB();
        
        // Background sync can run without blocking
        registerBackgroundSync().catch(e => console.warn('Background sync init failed', e));

        // Parallel initialize stores
        await Promise.all([
          initialize(),
          initializeSettings()
        ]);
        
        if (isMounted) setIsAppReady(true);
      } catch (e: any) {
        console.error('[RootLayout] Fatal Boot Error:', e);
        if (isMounted) setBootError(e?.message || 'Failed to initialize app data');
      }
    };
    bootstrap();
    return () => { isMounted = false; };
  }, []);

  // Initialize FCM notifications
  useEffect(() => {
    console.log('[RootLayout] Setting up FCM listeners...');
    try {
      const unsubscribeFCM = setupNotificationListeners();
      return () => { unsubscribeFCM(); };
    } catch (e) {
      console.warn('FCM listeners failed to setup', e);
    }
  }, []);

  // Listen for local DB modifications to trigger auto-sync
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TRIGGER_AUTO_SYNC', () => {
      console.log('[RootLayout] Auto-sync triggered from DB mutation');
      syncWorkspace().catch(e => console.warn('Auto-sync failed', e));
    });
    return () => sub.remove();
  }, []);

  // Handle AppState for auto-lock
  useEffect(() => {
    let backgroundTime: number | null = null;
    const LOCK_TIMEOUT = 30 * 1000; // 30 seconds

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        backgroundTime = Date.now();
      } else if (nextAppState === 'active' && backgroundTime) {
        const timeAway = Date.now() - backgroundTime;
        if (timeAway > LOCK_TIMEOUT) {
          console.log('[RootLayout] App was in background for >30s, locking...');
          useSettingsStore.getState().setUnlocked(false);
        }
        backgroundTime = null;
      }
    });

    return () => subscription.remove();
  }, []);

  // Handle SplashScreen and Auth redirection
  useEffect(() => {
    if (!isAppReady || isLoading || !isSettingsReady) return;

    console.log('[RootLayout] App ready - hiding splash screen');
    SplashScreen.hideAsync().catch(console.warn);

    // If authenticated but user profile isn't loaded yet, wait for it
    if (isAuthenticated && !user) {
      console.log('[RootLayout] Authenticated but waiting for user profile...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    
    if (!isOnboarded) {
      if (!inOnboarding) {
        setTimeout(() => router.replace('/onboarding'), 0);
      }
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      setTimeout(() => router.replace('/(auth)/login'), 0);
    } else if (isAuthenticated && (inAuthGroup || inOnboarding)) {
      setTimeout(() => router.replace('/(tabs)'), 0);
    }
  }, [isAppReady, isLoading, isSettingsReady, isAuthenticated, user, segments, isOnboarded]);

  // Handle Fatal Boot Errors
  if (bootError) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color="#EF4444" style={{ marginBottom: 20 }} />
        <Text style={styles.errorTitle}>App Initialization Failed</Text>
        <Text style={styles.errorDesc}>{bootError}</Text>
        <Text style={styles.errorHelp}>If this issue persists, your local database may be corrupted.</Text>
        
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={async () => {
            try {
              const { resetLocalDB } = await import('../src/services/db');
              await resetLocalDB();
              setBootError(null);
              setIsAppReady(true);
            } catch (e) {
              console.error(e);
              setBootError('Reset failed. Please reinstall the app.');
            }
          }}
        >
          <Text style={styles.resetButtonText}>Reset Local Database</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading indicator while restoring auth
  if (!isAppReady || isLoading || !isSettingsReady) {
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
          {passcodeEnabled && !isUnlocked && isAuthenticated ? (
            <LockScreen />
          ) : (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          )}
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
  errorContainer: {
    flex: 1,
    backgroundColor: lightColors.surface.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 10,
  },
  errorDesc: {
    fontSize: 14,
    color: lightColors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorHelp: {
    fontSize: 12,
    color: lightColors.text.tertiary,
    textAlign: 'center',
    marginBottom: 30,
  },
  resetButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
