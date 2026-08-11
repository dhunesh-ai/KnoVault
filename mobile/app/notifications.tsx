import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { getFadeInDown } from '../src/utils/animations';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS, 
  withRepeat,
  Layout
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/hooks/useTheme';
import { useNotificationStore, NotificationRecord } from '../src/store/notificationStore';
import { formatLocalTime } from '../src/utils/date';
import { typography } from '../src/theme';
import { getThemedShadow } from '../src/components/ThemedComponents';

// ── Icon map for notification types ──────────────────────────────────

interface IconInfo {
  name: string;
  color: string;
  bg: string;
}

function getIconForType(type: string | undefined, category: string | undefined, primary: string): IconInfo {
  const t = (type ?? category ?? '').toLowerCase();
  switch (t) {
    case 'reminder':
    case 'reminder due':
    case 'reminders':
      return { name: 'alarm-outline', color: '#7C4DFF', bg: '#7C4DFF18' };
    case 'birthday':
    case 'birthday today':
    case 'special_day':
    case 'special-days':
      return { name: 'gift-outline', color: '#EC407A', bg: '#EC407A18' };
    case 'meeting':
    case 'meeting starts soon':
      return { name: 'videocam-outline', color: '#29B6F6', bg: '#29B6F618' };
    case 'goal':
    case 'goal deadline':
    case 'goals':
      return { name: 'trophy-outline', color: '#4CAF50', bg: '#4CAF5018' };
    case 'ai':
    case 'ai memory suggestions':
    case 'ai_suggestion':
      return { name: 'bulb-outline', color: '#00BCD4', bg: '#00BCD418' };
    case 'workspace':
    case 'workspace updates':
    case 'workspace_member_added':
    case 'workspace_invite':
      return { name: 'business-outline', color: '#FF9800', bg: '#FF980018' };
    case 'project':
    case 'project activity':
      return { name: 'folder-outline', color: '#AB47BC', bg: '#AB47BC18' };
    case 'email wish sent':
      return { name: 'mail-outline', color: '#26A69A', bg: '#26A69A18' };
    case 'security':
    case 'security alerts':
      return { name: 'shield-checkmark-outline', color: '#F44336', bg: '#F4433618' };
    case 'cloud':
    case 'cloud sync status':
      return { name: 'cloud-upload-outline', color: '#00E676', bg: '#00E67618' };
    case 'system':
      return { name: 'planet-outline', color: '#FFB300', bg: '#FFB30018' };
    default:
      return { name: 'notifications-outline', color: primary, bg: `${primary}18` };
  }
}

function getNotificationBody(item: NotificationRecord): string {
  if (item.source === 'backend') return item.message;
  return (item as any).body ?? '';
}

function getNotificationTitle(item: NotificationRecord): string {
  return item.title ?? 'Notification';
}

function getNotificationDate(item: NotificationRecord): string {
  return item.created_at ?? '';
}

function getNotificationType(item: NotificationRecord): string | undefined {
  if (item.source === 'backend') return item.type;
  return (item as any).category;
}

function getWorkspaceName(item: NotificationRecord): string | null {
  if (item.source === 'backend') return (item as any).workspace_name ?? null;
  return null;
}

// ── Skeleton Shimmer component ───────────────────────────────────────

function SkeletonCard({ theme, isDark }: { theme: any; isDark: boolean }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const placeholderBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <Animated.View style={[dsStyles.skeletonCard, animatedStyle, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[dsStyles.skeletonIcon, { backgroundColor: placeholderBg }]} />
      <View style={{ flex: 1 }}>
        <View style={[dsStyles.skeletonTitle, { backgroundColor: placeholderBg }]} />
        <View style={[dsStyles.skeletonText, { backgroundColor: placeholderBg }]} />
      </View>
    </Animated.View>
  );
}

// ── Swipe-to-Delete Wrapper component ────────────────────────────────

interface SwipeableNotificationProps {
  children: React.ReactNode;
  onDelete: () => void;
  theme: any;
}

function SwipeableNotification({ children, onDelete, theme }: SwipeableNotificationProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) 
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      } else {
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -140) {
        // Threshold crossed: trigger swipe-out delete animation
        translateX.value = withTiming(-400, { duration: 200 }, () => {
          opacity.value = withTiming(0, { duration: 150 }, () => {
            runOnJS(onDelete)();
          });
        });
      } else if (event.translationX < -65) {
        // Snap open to reveal action button
        translateX.value = withSpring(-80, { damping: 15 });
      } else {
        // Snap closed
        translateX.value = withSpring(0, { damping: 15 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    backgroundColor: theme.card,
  }));

  const deleteBtnStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    translateX.value = withTiming(-400, { duration: 200 }, () => {
      opacity.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(onDelete)();
      });
    });
  };

  return (
    <Animated.View style={[{ position: 'relative', overflow: 'hidden', marginBottom: 10 }, containerStyle]}>
      {/* Background Action Container */}
      <View style={[dsStyles.deleteBg, { backgroundColor: '#EF4444' }]}>
        <TouchableOpacity
          onPress={handlePressDelete}
          style={dsStyles.deleteBtnContainer}
          activeOpacity={0.8}
        >
          <Animated.View style={[deleteBtnStyle, { alignItems: 'center' }]}>
            <Ionicons name="trash-outline" size={22} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 3 }}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedStyle, { borderRadius: 18 }]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(true);

  // Permission details
  const [permissionDetails, setPermissionDetails] = useState<{ status: string; canAskAgain: boolean | null }>({
    status: 'granted',
    canAskAgain: true,
  });

  const checkNotificationPermission = async () => {
    try {
      const Notifications = require('expo-notifications');
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      setNotificationPermissionGranted(status === 'granted');
      setPermissionDetails({
        status,
        canAskAgain: canAskAgain !== undefined ? canAskAgain : true,
      });
    } catch (e) {
      console.warn('[NotificationsScreen] checkNotificationPermission error:', e);
    }
  };

  useEffect(() => {
    checkNotificationPermission();

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        checkNotificationPermission();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkNotificationPermission();
      fetchNotifications();
      const { dumpScheduledNotifications } = require('../src/utils/localNotifications');
      dumpScheduledNotifications('NotificationScreen_Open');
    }, [fetchNotifications])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await checkNotificationPermission();
    await fetchNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications]);

  const triggerHaptic = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const handleEnableNotifications = async () => {
    triggerHaptic();
    try {
      const Notifications = require('expo-notifications');
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();

      if (status === 'undetermined' || (status === 'denied' && canAskAgain !== false)) {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus === 'granted') {
          setNotificationPermissionGranted(true);
          fetchNotifications();
        } else {
          Alert.alert('Permission Denied', 'Notifications could not be enabled.');
        }
      } else {
        // Permanently denied or blocked
        Linking.openSettings();
      }
    } catch (e) {
      console.warn('[NotificationsScreen] handleEnableNotifications error:', e);
      Linking.openSettings();
    }
    await checkNotificationPermission();
  };

  const handlePress = async (item: NotificationRecord) => {
    triggerHaptic();
    if (!item.is_read) {
      await markAsRead(item.id, item.source);
    }
    // Local notification navigation
    if (item.source === 'local') {
      try {
        const payload = JSON.parse((item as any).payload ?? '{}');
        if (payload.type === 'reminder' && payload.id) {
          router.push(`/reminder/${payload.id}`);
        } else if (payload.type === 'special_day' && payload.id) {
          router.push(`/special_day/${payload.id}`);
        } else if (payload.type === 'workspace_meeting' && payload.workspaceId) {
          router.push(`/workspace/${payload.workspaceId}?module=meetings`);
        } else if (payload.type === 'workspace_event' && payload.workspaceId) {
          router.push(`/workspace/${payload.workspaceId}?module=calendar`);
        }
      } catch {}
    } else if (item.source === 'backend') {
      const type = item.type;
      const workspaceId = item.workspace_id;
      if (workspaceId) {
        if (type === 'meeting') {
          router.push(`/workspace/${workspaceId}?module=meetings`);
        } else if (type === 'event') {
          router.push(`/workspace/${workspaceId}?module=calendar`);
        }
      }
    }
  };

  const handleLongPress = (item: NotificationRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert('Delete Notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNotification(item.id, item.source),
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notification history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            clearAll();
          },
        },
      ]
    );
  };

  // Group notifications by Date (Today, Yesterday, Earlier)
  const groupedNotifications = useMemo(() => {
    const today: NotificationRecord[] = [];
    const yesterday: NotificationRecord[] = [];
    const earlier: NotificationRecord[] = [];

    const now = new Date();
    const todayStr = now.toDateString();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    const query = searchQuery.toLowerCase().trim();
    const listToProcess = query
      ? notifications.filter((item) => {
          const t = getNotificationTitle(item).toLowerCase();
          const b = getNotificationBody(item).toLowerCase();
          return t.includes(query) || b.includes(query);
        })
      : notifications;

    listToProcess.forEach((item) => {
      const itemDateStr = item.created_at ? new Date(item.created_at).toDateString() : '';
      if (itemDateStr === todayStr) {
        today.push(item);
      } else if (itemDateStr === yesterdayStr) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier, totalCount: listToProcess.length };
  }, [notifications, searchQuery]);

  const ds = styles(theme, isDark, colors);
  const hasUnread = unreadCount > 0;

  const renderItem = (item: NotificationRecord) => {
    const notifType = getNotificationType(item);
    const iconInfo = getIconForType(notifType, undefined, theme.primary);
    const wsName = getWorkspaceName(item);
    const body = getNotificationBody(item);
    const title = getNotificationTitle(item);
    const date = getNotificationDate(item);
    const isUnread = !item.is_read;

    return (
      <SwipeableNotification
        key={`${item.source}-${item.id}`}
        theme={theme}
        onDelete={() => deleteNotification(item.id, item.source)}
      >
        <TouchableOpacity
          style={[
            ds.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            isUnread && { borderColor: theme.primary, borderWidth: 1.5 },
          ]}
          onPress={() => handlePress(item)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.85}
        >
          {/* Unread dot */}
          {isUnread && <View style={[ds.unreadDot, { backgroundColor: theme.primary }]} />}

          {/* Icon */}
          <View style={[ds.iconContainer, { backgroundColor: iconInfo.bg }]}>
            <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
          </View>

          {/* Content */}
          <View style={ds.cardContent}>
            <View style={ds.titleRow}>
              <Text style={[ds.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[ds.timeText, { color: theme.textSecondary }]}>
                {formatLocalTime(date)}
              </Text>
            </View>

            <Text
              style={[ds.cardBody, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {body}
            </Text>

            {/* Workspace name badge */}
            {wsName && (
              <View style={[ds.wsBadge, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="business-outline" size={11} color={theme.primary} />
                <Text style={[ds.wsBadgeText, { color: theme.primary }]} numberOfLines={1}>
                  {wsName}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </SwipeableNotification>
    );
  };

  return (
    <SafeAreaView style={ds.container}>
      {/* ── Header ── */}
      <View style={ds.header}>
        <View style={ds.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={ds.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[ds.headerTitle, { color: theme.text }]}>Notifications</Text>
            {unreadCount > 0 && notificationPermissionGranted && (
              <Text style={[ds.headerSubtitle, { color: theme.primary }]}>
                {unreadCount} unread
              </Text>
            )}
          </View>
        </View>

        {/* Debug Panel Shortcut */}
        <TouchableOpacity onPress={() => router.push('/debug-notifications' as any)} style={[ds.headerActionBtn, { backgroundColor: '#3B82F618', marginRight: 6 }]}>
          <Ionicons name="bug-outline" size={16} color="#3B82F6" />
          <Text style={[ds.headerActionText, { color: '#3B82F6', fontWeight: 'bold' }]}>Debug</Text>
        </TouchableOpacity>

        {notifications.length > 0 && notificationPermissionGranted && (
          hasUnread ? (
            <TouchableOpacity onPress={markAllAsRead} style={ds.headerActionBtn}>
              <Ionicons name="checkmark-done-outline" size={18} color={theme.primary} />
              <Text style={[ds.headerActionText, { color: theme.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleClearAll} style={ds.iconBtn}>
              <Ionicons name="trash-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          )
        )}
      </View>

      {/* ── Search Bar ── */}
      {notificationPermissionGranted && notifications.length > 0 && (
        <View style={ds.searchContainer}>
          <View style={[ds.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[ds.searchInput, { color: theme.text }]}
              placeholder="Search notifications..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Content View ── */}
      {!notificationPermissionGranted ? (
        // Disabled Permission Screen (YouTube turn-on style)
        <View style={ds.centerWrapper}>
          <Animated.View entering={getFadeInDown()} style={ds.emptyState}>
            <View style={[ds.illustrationContainer, { backgroundColor: isDark ? 'rgba(124, 77, 255, 0.15)' : 'rgba(124, 77, 255, 0.08)' }]}>
              <Ionicons name="notifications-off-outline" size={64} color={theme.primary} />
            </View>
            <Text style={[ds.emptyTitle, { color: theme.text }]}>Turn on Notifications</Text>
            <Text style={[ds.emptySubtitle, { color: theme.textSecondary }]}>
              Enable notifications to receive reminder alerts, meeting notifications, birthdays, tasks, AI updates, and important workspace events.
            </Text>
            <TouchableOpacity
              style={[ds.enableBtn, { backgroundColor: theme.primary }]}
              onPress={handleEnableNotifications}
              activeOpacity={0.85}
            >
              <Text style={ds.enableBtnText}>Enable Notifications</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : isLoading && notifications.length === 0 ? (
        // Skeleton Loading Shimmer States
        <ScrollView contentContainerStyle={ds.scrollContent} showsVerticalScrollIndicator={false}>
          <SkeletonCard theme={theme} isDark={isDark} />
          <SkeletonCard theme={theme} isDark={isDark} />
          <SkeletonCard theme={theme} isDark={isDark} />
          <SkeletonCard theme={theme} isDark={isDark} />
        </ScrollView>
      ) : groupedNotifications.totalCount === 0 ? (
        // Empty State (Permission Granted but no matching notifications)
        <View style={ds.centerWrapper}>
          <Animated.View entering={getFadeInDown()} style={ds.emptyState}>
            <View style={[ds.illustrationContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
              <Ionicons name="mail-unread-outline" size={64} color={theme.textSecondary} />
            </View>
            <Text style={[ds.emptyTitle, { color: theme.text }]}>No notifications yet</Text>
            <Text style={[ds.emptySubtitle, { color: theme.textSecondary }]}>
              Reminder alerts, meeting updates, birthdays, AI insights, and workspace activities will appear here.
            </Text>
          </Animated.View>
        </View>
      ) : (
        // Grouped Notifications List
        <ScrollView
          contentContainerStyle={ds.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {groupedNotifications.today.length > 0 && (
            <Animated.View layout={Layout.springify()}>
              <Text style={[ds.sectionHeader, { color: theme.primary }]}>Today</Text>
              {groupedNotifications.today.map((item) => renderItem(item))}
            </Animated.View>
          )}

          {groupedNotifications.yesterday.length > 0 && (
            <Animated.View layout={Layout.springify()} style={{ marginTop: 20 }}>
              <Text style={[ds.sectionHeader, { color: theme.textSecondary }]}>Yesterday</Text>
              {groupedNotifications.yesterday.map((item) => renderItem(item))}
            </Animated.View>
          )}

          {groupedNotifications.earlier.length > 0 && (
            <Animated.View layout={Layout.springify()} style={{ marginTop: 20 }}>
              <Text style={[ds.sectionHeader, { color: theme.textSecondary }]}>Earlier</Text>
              {groupedNotifications.earlier.map((item) => renderItem(item))}
            </Animated.View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const dsStyles = StyleSheet.create({
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.2,
  },
  skeletonIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    marginRight: 13,
  },
  skeletonTitle: {
    height: 16,
    width: '50%',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonText: {
    height: 12,
    width: '80%',
    borderRadius: 6,
  },
  deleteBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteBtnContainer: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const styles = (theme: any, isDark: boolean, colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.2,
      borderColor: theme.border,
      ...getThemedShadow(theme, 'soft'),
    },
    iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { ...typography.titleLarge, fontWeight: '800' },
    headerSubtitle: { ...typography.caption, fontWeight: '700', marginTop: 1 },
    headerActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    headerActionText: { ...typography.bodySmall, fontWeight: '700' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50, flexGrow: 1 },
    centerWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
      paddingBottom: 40,
    },
    illustrationContainer: {
      width: 130,
      height: 130,
      borderRadius: 65,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: { ...typography.titleMedium, fontWeight: '800', textAlign: 'center' },
    emptySubtitle: {
      ...typography.bodySmall,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 20,
      maxWidth: 290,
      color: theme.textSecondary,
    },
    enableBtn: {
      marginTop: 24,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 25,
      ...getThemedShadow(theme, 'soft'),
    },
    enableBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: 'bold',
    },
    searchContainer: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 46,
      borderWidth: 1.2,
      ...getThemedShadow(theme, 'soft'),
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      padding: 0,
    },
    sectionHeader: {
      ...typography.caption,
      fontWeight: '800',
      marginBottom: 12,
      marginLeft: 4,
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 1,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 18,
      padding: 14,
      borderWidth: 1.2,
      ...getThemedShadow(theme, 'soft'),
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: 'absolute',
      top: 14,
      left: 10,
    },
    iconContainer: {
      width: 46,
      height: 46,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 13,
      flexShrink: 0,
    },
    cardContent: { flex: 1 },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
    },
    cardTitle: { ...typography.bodyMedium, fontWeight: '700', flex: 1, marginRight: 8 },
    timeText: { ...typography.caption, fontWeight: '600', flexShrink: 0 },
    cardBody: { ...typography.bodySmall, lineHeight: 18 },
    wsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      marginTop: 7,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    wsBadgeText: { ...typography.caption, fontWeight: '700', maxWidth: 180 },
  });
