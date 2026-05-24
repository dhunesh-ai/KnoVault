import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  withSpring,
  FadeInRight,
  FadeOutRight,
  LinearTransition,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore, AppNotification } from '../store/notificationsStore';
import { useTheme } from '../context/ThemeContext';
import { typography, shadows } from '../theme';

const { height } = Dimensions.get('window');

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

// Custom swipeable item component using Reanimated and Gesture Handler GestureDetector
interface SwipeableItemProps {
  children: React.ReactNode;
  onDismiss: () => void;
  isDark: boolean;
}

const SwipeableItem = ({ children, onDismiss, isDark }: SwipeableItemProps) => {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([10, 30])
    .onUpdate((event) => {
      // Swipe right to dismiss
      translateX.value = Math.max(0, event.translationX);
    })
    .onEnd((event) => {
      if (translateX.value > 120) {
        translateX.value = withTiming(500, { duration: 150 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateX.value = withSpring(0, { damping: 15 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={[
      stylesCommon.swipeBackground,
      { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }
    ]}>
      <View style={stylesCommon.trashIconContainer}>
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export const NotificationCenter = ({ visible, onClose }: NotificationCenterProps) => {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.isDark;
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  const {
    notifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotificationsStore();

  const [shouldRender, setShouldRender] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // console.log('[NOTIFICATION CENTER OPENED]');
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      progress.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = withTiming(0, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
    }
  }, [visible]);

  const triggerHaptic = async (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      await Haptics.impactAsync(style);
    } catch (e) {
      // console.log('[Haptics Not Available]', e);
    }
  };

  const handleNotificationClick = async (item: AppNotification) => {
    // console.log(`[NOTIFICATION CLICKED] id: ${item.id}, type: ${item.type}`);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    markAsRead(item.id);
    onClose();

    // Delay for smooth transition
    setTimeout(() => {
      switch (item.type) {
        case 'important_day':
        case 'special_day':
          if (item.targetId) router.push(`/special_day/${item.targetId}`);
          else router.push('/special_days');
          break;
        case 'reminder':
          if (item.targetId) router.push(`/reminder/${item.targetId}`);
          else router.push('/calendar');
          break;
        case 'goal':
          router.push('/goals');
          break;
        case 'productivity':
          router.push('/goals');
          break;
        case 'security':
          router.push('/profile');
          break;
        default:
          break;
      }
    }, 150);
  };

  const handleDismiss = async (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    dismissNotification(id);
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'important_day':
      case 'special_day':
        return { name: 'balloon-outline', color: '#F59E0B', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' };
      case 'reminder':
        return { name: 'alarm-outline', color: '#10B981', bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' };
      case 'goal':
        return { name: 'checkmark-circle-outline', color: '#0EA5E9', bg: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF' };
      case 'productivity':
        return { name: 'flash-outline', color: '#8B5CF6', bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF' };
      case 'security':
        return { name: 'shield-checkmark-outline', color: '#EF4444', bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' };
      default:
        return { name: 'notifications-outline', color: '#6B7280', bg: isDark ? 'rgba(107, 114, 128, 0.15)' : '#F9FAFB' };
    }
  };

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
    };
  });

  const panelAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: (1 - progress.value) * height,
        },
      ],
    };
  });

  if (!shouldRender) return null;

  const ds = dynamicStyles(theme.colors, isDark);

  // Group notifications into sections
  const todayList = notifications.filter(n => n.section === 'Today');
  const upcomingList = notifications.filter(n => n.section === 'Upcoming');
  const productivityList = notifications.filter(n => n.section === 'Productivity');
  const securityList = notifications.filter(n => n.section === 'Security');

  const sections = [
    { title: 'Today', data: todayList, color: '#7C4DFF' },
    { title: 'Upcoming', data: upcomingList, color: '#10B981' },
    { title: 'Productivity', data: productivityList, color: '#F59E0B' },
    { title: 'Security', data: securityList, color: '#EF4444' },
  ];

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Backdrop */}
      <Animated.View style={[ds.backdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Modal Container */}
      <Animated.View style={[ds.modalContainer, panelAnimatedStyle]}>
        {/* Notch Indicator */}
        <View style={ds.notch} />

        {/* Header */}
        <View style={ds.header}>
          <Text style={ds.headerTitle}>Notifications</Text>
          <View style={ds.headerActions}>
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                  markAllAsRead();
                }}
                style={ds.markAllBtn}
              >
                <Text style={ds.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={ds.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* List Content */}
        <ScrollView
          contentContainerStyle={[ds.scrollContent, { paddingBottom: bottomInset + 140 }]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {notifications.length === 0 ? (
            <View style={ds.emptyState}>
              <View style={ds.emptyIconBox}>
                <Ionicons name="notifications-off-outline" size={54} color={theme.colors.text.tertiary} />
              </View>
              <Text style={ds.emptyTitle}>You're all caught up ✨</Text>
              <Text style={ds.emptySubtitle}>No pending reminders or updates right now.</Text>
            </View>
          ) : (
            sections.map((sec) => {
              if (sec.data.length === 0) return null;
              return (
                <View key={sec.title} style={ds.sectionContainer}>
                  <Text style={[ds.sectionHeader, { color: sec.color }]}>{sec.title.toUpperCase()}</Text>
                  {sec.data.map((item) => {
                    const iconInfo = getNotificationIcon(item.type);
                    return (
                      <Animated.View
                        key={item.id}
                        entering={FadeInRight.duration(200)}
                        exiting={FadeOutRight.duration(150)}
                        layout={LinearTransition}
                      >
                        <SwipeableItem onDismiss={() => handleDismiss(item.id)} isDark={isDark}>
                          <View style={[
                            ds.card, 
                            item.importance === 'high' && !item.isRead && ds.cardUnread,
                            item.isRead && ds.cardRead
                          ]}>
                            <TouchableOpacity
                              style={ds.cardPressable}
                              onPress={() => handleNotificationClick(item)}
                              activeOpacity={0.7}
                            >
                              {/* Unread dot - only for important ones */}
                              {item.importance === 'high' && !item.isRead && <View style={ds.unreadDot} />}

                              <View style={[ds.iconBox, { backgroundColor: iconInfo.bg }]}>
                                <Ionicons name={iconInfo.name as any} size={20} color={iconInfo.color} />
                              </View>

                              <View style={ds.cardBody}>
                                <View style={ds.cardHeader}>
                                  <Text style={ds.cardTitle} numberOfLines={1}>{item.title}</Text>
                                  <Text style={ds.cardTime}>{item.timestamp}</Text>
                                </View>
                                <Text style={ds.cardDesc} numberOfLines={2}>{item.description}</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        </SwipeableItem>
                      </Animated.View>
                    );
                  })}
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const stylesCommon = StyleSheet.create({
  swipeBackground: {
    position: 'relative',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  trashIconContainer: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
});

const dynamicStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 999,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '82%',
    height: height * 0.82,
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.99)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 10,
    zIndex: 1000,
    ...shadows.strong,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
  },
  notch: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.tertiary,
    opacity: 0.25,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  headerTitle: {
    ...typography.titleLarge,
    color: colors.text.primary,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(108, 99, 255, 0.15)' : '#F5F3FF',
  },
  markAllText: {
    ...typography.caption,
    color: colors.isDark ? '#A78BFA' : '#6C63FF',
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  emptyTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '800',
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 240,
    lineHeight: 18,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    paddingRight: 10,
    ...shadows.soft,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    overflow: 'hidden',
  },
  cardUnread: {
    borderLeftColor: '#6C63FF',
  },
  cardRead: {
    opacity: 0.75,
  },
  cardPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C63FF',
    position: 'absolute',
    top: 10,
    left: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  cardTime: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  cardDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 16,
  },
});
