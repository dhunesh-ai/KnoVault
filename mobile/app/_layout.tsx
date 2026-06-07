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

SplashScreen.preventAutoHideAsync().catch(() => {});
import { useAuthStore } from '../src/store/authStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { colors, lightColors } from '../src/theme/colors';
import { setupNotificationListeners } from '../src/utils/notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { syncWorkspace } from '../src/services/sync';
import { initDB } from '../src/services/db';
import { setupNotificationChannelsAndCategories, scheduleDailyPlanner, scheduleSpecialDaysReminders } from '../src/utils/localNotifications';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '../src/store/appStore';

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

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[TaskManager] Notification Error:', error);
    return;
  }
  if (data) {
    const { actionIdentifier, notification } = data as any;
    const reqData = notification?.request?.content?.data;
    
    console.log(`[TaskManager] Background action received: ${actionIdentifier}`, reqData);
    
    try {
      if (actionIdentifier === 'SNOOZE_5' || actionIdentifier === 'SNOOZE_15') {
        const mins = actionIdentifier === 'SNOOZE_5' ? 5 : 15;
        const newTime = new Date(Date.now() + mins * 60 * 1000);
        
        const content = notification.request.content;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            data: content.data,
            sound: true,
            categoryIdentifier: content.categoryIdentifier,
          } as any,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: newTime,
            channelId: notification.request.trigger.channelId,
          } as any,
        });
        
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    } catch (e) {
      console.error('[TaskManager] Action handler failed:', e);
    }
  }
});

// Register it instantly in root scope
Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(e => console.warn('Notification task registration failed:', e));



import { ThemeProvider } from '../src/context/ThemeContext';

// QueryClient is initialized inside RootLayout to survive fast refresh

function RootLayoutContent() {
  console.log('[RootLayoutContent] Rendering...');
  const { isLoading, isAuthenticated, user, initialize } = useAuthStore();
  const { isInitialized: isSettingsReady, isOnboarded, initializeSettings } = useSettingsStore();
  const segments = useSegments();
  const router = useRouter();

  const [isAppReady, setIsAppReady] = React.useState(false);
  const [bootError, setBootError] = React.useState<string | null>(null);

  // Initialize auth and db on app start
  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        console.log('[App Startup] Mounting - initializing auth & db...');
        
        // Initialize DB FIRST to avoid concurrent SQLite.openDatabaseSync NullPointerException
        await initDB();
        
        // Background sync can run without blocking
        registerBackgroundSync().catch(e => console.warn('Background sync init failed', e));

        // Parallel initialize stores
        await Promise.all([
          initialize(),
          initializeSettings(),
          setupNotificationChannelsAndCategories()
        ]);
        
        // Schedule daily planner once on app open
        scheduleDailyPlanner().catch(e => console.warn('Daily planner schedule failed', e));
        
        // Schedule special days reminders
        scheduleSpecialDaysReminders().catch(e => console.warn('Special days schedule failed', e));

        if (isMounted) setIsAppReady(true);
      } catch (e: any) {
        console.error('[RootLayout] Fatal Boot Error:', e);
        if (isMounted) setBootError(e?.message || 'Failed to initialize app data');
      }
    };
    bootstrap();
    return () => { isMounted = false; };
  }, []);

  // Network Detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log("NetInfo:", {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });

      // Avoid marking offline if values are null (startup phase)
      if (state.isConnected !== null && state.isInternetReachable !== null) {
        const offline = state.isConnected === false || state.isInternetReachable === false;
        console.log("Offline Decision:", offline);
        
        useAppStore.getState().setOfflineStatus(offline);
        useAppStore.getState().setNetworkReady(true);
      }
    });

    return () => unsubscribe();
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

  // Initialize Local Notifications Actions Listener (Foreground)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const actionIdentifier = response.actionIdentifier;
      const data = response.notification.request.content.data;
      
      console.log(`[RootLayout] Foreground action received: ${actionIdentifier}`, data);
      
      if (actionIdentifier === 'SNOOZE_5' || actionIdentifier === 'SNOOZE_15') {
        const mins = actionIdentifier === 'SNOOZE_5' ? 5 : 15;
        const newTime = new Date(Date.now() + mins * 60 * 1000);
        
        const content = response.notification.request.content;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            data: content.data,
            sound: true,
            categoryIdentifier: content.categoryIdentifier,
          } as any,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: newTime,
            channelId: (response.notification.request.trigger as any).channelId,
          } as any,
        });
        await Notifications.dismissNotificationAsync(response.notification.request.identifier);
      }
      
      // Deep Linking (app opens)
      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER || actionIdentifier === 'OPEN') {
        const { useNotificationStore } = await import('../src/store/notificationStore');
        
        let targetRoute = null;
        if (data?.type === 'reminder' && data?.id) {
          targetRoute = `/reminder/${data.id}`;
        } else if (data?.type === 'goal' && data?.id) {
          // targetRoute = `/goal/${data.id}`;
        } else if (data?.type === 'special_day' && data?.id) {
          targetRoute = `/special_day/${data.id}`;
        }
        
        if (targetRoute) {
          useNotificationStore.getState().setPendingRoute(targetRoute);
        }
      }
    });

    return () => subscription.remove();
  }, [router]);

  // Listen for local DB modifications to trigger auto-sync
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TRIGGER_AUTO_SYNC', () => {
      console.log('[RootLayout] Auto-sync triggered from DB mutation');
      syncWorkspace().catch(e => console.warn('Auto-sync failed', e));
    });
    return () => sub.remove();
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

  // Handle Cold-Boot Deep Linking
  useEffect(() => {
    const handleDeepLink = async () => {
      const { useNotificationStore } = await import('../src/store/notificationStore');
      const { pendingRoute, setPendingRoute } = useNotificationStore.getState();
      
      // Navigate only when fully ready and unlocked
      if (isAppReady && isAuthenticated && pendingRoute) {
        console.log('[RootLayout] Routing to pending deep link:', pendingRoute);
        setTimeout(() => {
          router.push(pendingRoute as any);
          setPendingRoute(null);
        }, 300); // Small delay to let stack mount
      }
    };
    handleDeepLink();
  }, [isAppReady, isAuthenticated]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      
      {!isAppReady && (
        <View style={[StyleSheet.absoluteFill, styles.startupLoadingContainer]}>
          <ActivityIndicator size="large" color={lightColors.primary} style={{ marginBottom: 20 }} />
          <Text style={styles.startupLoadingText}>Connecting to KnoVault...</Text>
        </View>
      )}

      {bootError && (
        <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
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
      )}
    </View>
  );
}

export default function RootLayout() {
  console.log('[RootLayout] Rendering QueryClientProvider tree...');
  
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  }));

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <RootLayoutContent />
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
  startupLoadingContainer: {
    flex: 1,
    backgroundColor: lightColors.surface.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  startupLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: lightColors.text.primary,
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
