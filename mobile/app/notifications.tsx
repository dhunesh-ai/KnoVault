import React, { useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated from 'react-native-reanimated';
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
  const t = type ?? category ?? '';
  switch (t) {
    case 'meeting':
      return { name: 'videocam-outline', color: '#7C4DFF', bg: '#7C4DFF18' };
    case 'event':
      return { name: 'calendar-outline', color: '#00BCD4', bg: '#00BCD418' };
    case 'task':
      return { name: 'checkbox-outline', color: '#FF9800', bg: '#FF980018' };
    case 'goal':
      return { name: 'trophy-outline', color: '#4CAF50', bg: '#4CAF5018' };
    case 'note_comment':
    case 'discussion_comment':
      return { name: 'chatbubble-ellipses-outline', color: '#29B6F6', bg: '#29B6F618' };
    case 'workspace_member_added':
    case 'workspace_invite':
      return { name: 'people-outline', color: '#EC407A', bg: '#EC407A18' };
    case 'system':
      return { name: 'planet-outline', color: '#FFB300', bg: '#FFB30018' };
    // Local types
    case 'reminders':
      return { name: 'alarm-outline', color: '#7C4DFF', bg: '#7C4DFF18' };
    case 'goals':
      return { name: 'rocket-outline', color: '#00C853', bg: '#00C85318' };
    case 'notes':
      return { name: 'document-text-outline', color: '#29B6F6', bg: '#29B6F618' };
    case 'security':
      return { name: 'shield-checkmark-outline', color: '#F44336', bg: '#F4433618' };
    case 'special_day':
    case 'special-days':
      return { name: 'gift-outline', color: '#E91E63', bg: '#E91E6318' };
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

// ── Component ─────────────────────────────────────────────────────────

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

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications]);

  const triggerHaptic = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

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
      // Backend notification navigation
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

  const ds = styles(theme, isDark, colors);
  const hasUnread = unreadCount > 0;

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
            {unreadCount > 0 && (
              <Text style={[ds.headerSubtitle, { color: theme.primary }]}>
                {unreadCount} unread
              </Text>
            )}
          </View>
        </View>

        {notifications.length > 0 ? (
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
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* ── Loading ── */}
      {isLoading && notifications.length === 0 && (
        <View style={ds.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {/* ── List ── */}
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
        {!isLoading && notifications.length === 0 ? (
          <Animated.View entering={getFadeInDown()} style={ds.emptyState}>
            <Text style={ds.emptyEmoji}>📭</Text>
            <Text style={[ds.emptyTitle, { color: theme.text }]}>No notifications yet</Text>
            <Text style={[ds.emptySubtitle, { color: theme.textSecondary }]}>
              Workspace events, meeting reminders,{'\n'}and system updates will appear here.
            </Text>
          </Animated.View>
        ) : (
          <View>
            {notifications.map((item, index) => {
              const notifType = getNotificationType(item);
              const iconInfo = getIconForType(notifType, undefined, theme.primary);
              const wsName = getWorkspaceName(item);
              const body = getNotificationBody(item);
              const title = getNotificationTitle(item);
              const date = getNotificationDate(item);
              const isUnread = !item.is_read;

              return (
                <Animated.View key={`${item.source}-${item.id}`} entering={getFadeInDown(index * 40)}>
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
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

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
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50, flexGrow: 1 },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
      paddingBottom: 80,
      paddingTop: 60,
    },
    emptyEmoji: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { ...typography.titleMedium, fontWeight: '800', textAlign: 'center' },
    emptySubtitle: {
      ...typography.bodySmall,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 20,
      maxWidth: 270,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
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
