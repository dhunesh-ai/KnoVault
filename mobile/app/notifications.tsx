import React, { useEffect, useMemo } from 'react';
import { getFadeIn, getFadeInDown } from '../src/utils/animations';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/hooks/useTheme';
import { useNotificationStore, NotificationRecord } from '../src/store/notificationStore';
import { formatLocalTime, getLocalDateString } from '../src/utils/date';
import { typography } from '../src/theme';
import { getThemedShadow } from '../src/components/ThemedComponents';

export default function NotificationsScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  
  const { 
    notifications, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAll 
  } = useNotificationStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  };

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleNotificationPress = async (item: NotificationRecord) => {
    triggerHaptic();
    if (!item.is_read) {
      await markAsRead(item.id);
    }

    try {
      if (item.payload) {
        const payload = JSON.parse(item.payload);
        if (payload.type === 'reminder' && payload.id) {
          router.push(`/reminder/${payload.id}`);
        } else if (payload.type === 'goal' && payload.id) {
          // router.push(`/goal/${payload.id}`);
        } else if (payload.type === 'special_day' && payload.id) {
          router.push(`/special_day/${payload.id}`);
        }
      }
    } catch (e) {
      console.warn('Failed to parse payload', e);
    }
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearAll();
          }
        }
      ]
    );
  };

  const ds = styles(theme, isDark, colors);

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'reminders': return { name: 'alarm-outline', color: '#7C4DFF', bg: '#7C4DFF15' };
      case 'goals': return { name: 'rocket-outline', color: '#00C853', bg: '#00C85315' };
      case 'notes': return { name: 'document-text-outline', color: '#29B6F6', bg: '#29B6F615' };
      case 'security': return { name: 'shield-checkmark-outline', color: '#F44336', bg: '#F4433615' };
      case 'system': return { name: 'planet-outline', color: '#FFB300', bg: '#FFB30015' };
      default: return { name: 'notifications-outline', color: theme.primary, bg: `${theme.primary}15` };
    }
  };

  return (
    <SafeAreaView style={ds.container}>
      {/* Header */}
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[ds.headerTitle, { color: theme.text }]}>Notification Center</Text>
        <TouchableOpacity onPress={handleClearAll} style={ds.iconBtn}>
          <Ionicons name="trash-outline" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

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
        {notifications.length > 0 && notifications.some(n => !n.is_read) && (
          <TouchableOpacity onPress={() => markAllAsRead()} style={ds.markAllBtn}>
            <Text style={[ds.markAllText, { color: theme.primary }]}>Mark all as read</Text>
          </TouchableOpacity>
        )}

        {notifications.length === 0 ? (
          <Animated.View entering={getFadeInDown()} style={ds.emptyState}>
            <View style={[ds.emptyIconContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="notifications-off-outline" size={60} color={theme.textSecondary} />
            </View>
            <Text style={[ds.emptyTitle, { color: theme.text }]}>All caught up!</Text>
            <Text style={[ds.emptySubtitle, { color: theme.textSecondary }]}>You have no notifications in your history.</Text>
          </Animated.View>
        ) : (
          <View>
            {notifications.map((n, index) => {
              const iconInfo = getIconForCategory(n.category);
              return (
                <Animated.View key={n.id} entering={getFadeInDown(index * 50)}>
                  <TouchableOpacity
                    style={[
                      ds.notificationCard, 
                      { backgroundColor: theme.card, borderColor: theme.border },
                      !n.is_read && { borderColor: theme.primary, borderWidth: 1.5 }
                    ]}
                    onPress={() => handleNotificationPress(n)}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      deleteNotification(n.id);
                    }}
                  >
                    {!n.is_read && <View style={[ds.unreadDot, { backgroundColor: theme.primary }]} />}
                    
                    <View style={[ds.cardIconContainer, { backgroundColor: iconInfo.bg }]}>
                      <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
                    </View>
                    
                    <View style={ds.cardContent}>
                      <View style={ds.timeRow}>
                        <Text style={[ds.cardTitle, { color: theme.text }]} numberOfLines={1}>{n.title}</Text>
                        <Text style={[ds.timeBadge, { color: theme.textSecondary }]}>
                          {formatLocalTime(n.created_at)}
                        </Text>
                      </View>
                      <Text style={[ds.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={2}>
                        {n.body}
                      </Text>
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

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
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
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginTop: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  emptyTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 260,
  },
  markAllBtn: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  markAllText: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  cardIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  cardTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
  },
  timeBadge: {
    ...typography.caption,
    fontWeight: '600',
  },
  cardSubtitle: {
    ...typography.bodySmall,
    marginTop: 4,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 15,
    left: 10,
  }
});
