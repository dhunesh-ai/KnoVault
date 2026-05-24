import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/hooks/useTheme';
import { remindersApi } from '../src/api/reminders';
import { importantDaysApi, ImportantDay } from '../src/api/important_days';
import { goalsApi } from '../src/api/goals';
import { getLocalDateString, formatLocalTime } from '../src/utils/date';
import { typography, spacing, borderRadius } from '../src/theme';
import { getThemedShadow } from '../src/components/ThemedComponents';

export default function NotificationsScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Fetch data
  const { data: reminders, isLoading: isLoadingReminders, refetch: refetchReminders, isRefetching: isRefetchingReminders } = useQuery({
    queryKey: ['upcoming-reminders'],
    queryFn: () => remindersApi.getUpcomingReminders(50),
  });

  const { data: importantDays, isLoading: isLoadingImportantDays, refetch: refetchImportantDays, isRefetching: isRefetchingImportantDays } = useQuery({
    queryKey: ['today-important-days'],
    queryFn: () => importantDaysApi.getTodayImportantDays(),
  });

  const { data: goals, isLoading: isLoadingGoals, refetch: refetchGoals, isRefetching: isRefetchingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.getGoals(),
  });

  const toggleGoalMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => {
      return goalsApi.updateGoal(id, { completed });
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const previousGoals = queryClient.getQueryData(['goals']);
      queryClient.setQueryData(['goals'], (old: any) => {
        if (!old) return [];
        return old.map((g: any) => g.id === id ? { ...g, completed } : g);
      });
      return { previousGoals };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
      console.log('[QUERY INVALIDATED] Goal state toggled from notifications screen');
    }
  });

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log('[Haptics Not Available]', e);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchReminders(),
      refetchImportantDays(),
      refetchGoals()
    ]);
  };

  // 2. Filter today's items
  const todayStr = getLocalDateString(new Date());

  const todayReminders = useMemo(() => {
    if (!reminders) return [];
    return reminders.filter((r) => {
      const rDateStr = getLocalDateString(new Date(r.reminder_date));
      return rDateStr === todayStr;
    }).sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime());
  }, [reminders, todayStr]);

  const todayImportantDays = useMemo(() => {
    return importantDays || [];
  }, [importantDays]);

  const todayGoals = useMemo(() => {
    if (!goals) return [];
    return goals;
  }, [goals]);

  const isRefreshing = isRefetchingReminders || isRefetchingImportantDays || isRefetchingGoals;
  const isLoading = isLoadingReminders || isLoadingImportantDays || isLoadingGoals;

  const totalNotificationsCount = todayReminders.length + todayImportantDays.length + todayGoals.filter(g => !g.completed).length;

  const getReminderColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'meeting': return colors.accent.emerald;
      case 'assignment': return colors.accent.sky;
      case 'event': return colors.accent.violet;
      case 'birthday': return colors.accent.amber;
      case 'medicine': return colors.accent.emerald;
      case 'custom': return colors.accent.amber;
      default: return theme.primary;
    }
  };

  const ds = styles(theme, isDark, colors);

  return (
    <SafeAreaView style={ds.container}>
      {/* Header */}
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[ds.headerTitle, { color: theme.text }]}>Notifications</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading && !isRefreshing ? (
        <View style={ds.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[ds.loadingText, { color: theme.textSecondary }]}>Gathering today's schedule...</Text>
        </View>
      ) : (
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
          {totalNotificationsCount === 0 ? (
            <Animated.View entering={FadeInDown.delay(100)} style={ds.emptyState}>
              <View style={[ds.emptyIconContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="notifications-off-outline" size={60} color={theme.textSecondary} />
              </View>
              <Text style={[ds.emptyTitle, { color: theme.text }]}>All caught up!</Text>
              <Text style={[ds.emptySubtitle, { color: theme.textSecondary }]}>No reminders, events, or pending goals for today.</Text>
            </Animated.View>
          ) : (
            <View>
              {/* Summary Banner */}
              <Animated.View entering={FadeInDown.delay(100)} style={ds.summaryBanner}>
                <View style={ds.summaryIcon}>
                  <Ionicons name="calendar" size={28} color="#FFFFFF" />
                </View>
                <View style={ds.summaryTextContainer}>
                  <Text style={ds.summaryTitle}>Today's Overview</Text>
                  <Text style={ds.summarySubtitle}>
                    You have {todayReminders.length} reminder{todayReminders.length !== 1 ? 's' : ''}
                    {todayImportantDays.length > 0 ? `, ${todayImportantDays.length} special day${todayImportantDays.length !== 1 ? 's' : ''}` : ''}
                    {todayGoals.length > 0 ? `, and ${todayGoals.filter(g => !g.completed).length} pending goal${todayGoals.filter(g => !g.completed).length !== 1 ? 's' : ''}` : ''} today.
                  </Text>
                </View>
              </Animated.View>

              {/* 1. Today's Special Days */}
              {todayImportantDays.length > 0 && (
                <Animated.View entering={FadeInDown.delay(200)} style={ds.section}>
                  <View style={ds.sectionHeader}>
                    <Ionicons name="sparkles-outline" size={20} color={colors.accent.amber} />
                    <Text style={[ds.sectionTitle, { color: theme.text }]}>Today's Special Days</Text>
                  </View>
                  {todayImportantDays.map((b: ImportantDay) => {
                    const getIconForType = (type: string) => {
                      const t = type?.toLowerCase() || '';
                      if (t.includes('birthday')) return { name: 'gift', color: '#F59E0B', bg: '#FEF3C7' };
                      if (t.includes('wedding') || t.includes('anniversary')) return { name: 'heart', color: '#EC4899', bg: '#FCE7F3' };
                      if (t.includes('engagement')) return { name: 'ribbon', color: '#3B82F6', bg: '#DBEAFE' };
                      if (t.includes('festival')) return { name: 'sparkles', color: '#D97706', bg: '#FEF3C7' };
                      if (t.includes('meeting')) return { name: 'people', color: '#10B981', bg: '#D1FAE5' };
                      if (t.includes('achievement')) return { name: 'trophy', color: '#8B5CF6', bg: '#EDE9FE' };
                      if (t.includes('memory') || t.includes('personal memory')) return { name: 'camera', color: '#6366F1', bg: '#EEF2FF' };
                      return { name: 'star', color: '#64748B', bg: '#F1F5F9' };
                    };
                    const iconInfo = getIconForType(b.type);
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[ds.notificationCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => {
                          triggerHaptic();
                          router.push(`/special_day/${b.id}`);
                        }}
                      >
                        <View style={[ds.cardIconContainer, { backgroundColor: isDark ? `${iconInfo.color}15` : iconInfo.bg }]}>
                          <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
                        </View>
                        <View style={ds.cardContent}>
                          <Text style={[ds.cardTitle, { color: theme.text }]}>{b.title}</Text>
                          <Text style={[ds.cardSubtitle, { color: theme.textSecondary }]}>
                            {b.type} • Don't forget to celebrate! 🎉
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    );
                  })}
                </Animated.View>
              )}

              {/* 2. Today's Reminders */}
              {todayReminders.length > 0 && (
                <Animated.View entering={FadeInDown.delay(300)} style={ds.section}>
                  <View style={ds.sectionHeader}>
                    <Ionicons name="time-outline" size={20} color={theme.primary} />
                    <Text style={[ds.sectionTitle, { color: theme.text }]}>Reminders & Events</Text>
                  </View>
                  {todayReminders.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[ds.notificationCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => {
                        triggerHaptic();
                        router.push(`/reminder/${r.id}`);
                      }}
                    >
                      <View style={[ds.cardIconContainer, { backgroundColor: `${getReminderColor(r.type)}15` }]}>
                        <Ionicons name="alarm-outline" size={22} color={getReminderColor(r.type)} />
                      </View>
                      <View style={ds.cardContent}>
                        <View style={ds.timeRow}>
                          <Text style={[ds.cardTitle, { color: theme.text }]} numberOfLines={1}>{r.title}</Text>
                          <Text style={[ds.timeBadge, { color: getReminderColor(r.type) }]}>
                            {formatLocalTime(r.reminder_date)}
                          </Text>
                        </View>
                        <Text style={[ds.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                          {r.description || `Scheduled ${r.type.toLowerCase()}`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}

              {/* 3. Today's Goals */}
              {todayGoals.length > 0 && (
                <Animated.View entering={FadeInDown.delay(400)} style={ds.section}>
                  <View style={ds.sectionHeader}>
                    <Ionicons name="checkbox-outline" size={20} color={colors.accent.emerald} />
                    <Text style={[ds.sectionTitle, { color: theme.text }]}>Daily Checklist</Text>
                  </View>
                  {todayGoals.map((goal) => (
                    <TouchableOpacity
                      key={goal.id}
                      style={[
                        ds.notificationCard, 
                        { backgroundColor: theme.card, borderColor: theme.border },
                        goal.completed && ds.cardCompleted
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        toggleGoalMutation.mutate({ id: goal.id, completed: !goal.completed });
                      }}
                    >
                      <View style={ds.checkboxContainer}>
                        <View style={[ds.checkbox, { borderColor: colors.accent.emerald }, goal.completed && { backgroundColor: colors.accent.emerald }]}>
                          {goal.completed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                      </View>
                      <View style={ds.cardContent}>
                        <Text style={[ds.goalTitle, { color: theme.text }, goal.completed && ds.goalTitleDone]}>
                          {goal.title}
                        </Text>
                        <Text style={[ds.cardSubtitle, { color: theme.textSecondary }]}>
                          {goal.completed ? 'Completed' : 'Tap to mark as complete'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>
      )}
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
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    ...typography.bodyMedium,
    marginTop: 15,
    fontWeight: '600',
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
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
    ...getThemedShadow(theme, 'medium'),
  },
  summaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryTitle: {
    ...typography.bodyLarge,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  summarySubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    fontWeight: '800',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  cardCompleted: {
    opacity: 0.7,
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
    fontWeight: '800',
  },
  cardSubtitle: {
    ...typography.caption,
    marginTop: 4,
  },
  checkboxContainer: {
    marginRight: 15,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  goalTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});
