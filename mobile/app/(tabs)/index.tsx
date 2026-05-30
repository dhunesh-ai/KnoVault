import React from 'react';
import SwipeWrapper, { useSwipe } from '../../src/components/SwipeWrapper';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/hooks/useTheme';
import { notesApi } from '../../src/api/notes';
import { goalsApi } from '../../src/api/goals';
import { projectsApi } from '../../src/api/projects';
import { remindersApi } from '../../src/api/reminders';
import { importantDaysApi } from '../../src/api/important_days';
import { calculateDaysRemaining, sortImportantDaysByUpcoming } from '../../src/utils/important_day';
import { getReminderTitle, getReminderSubtitle, getReminderCategory, getMedicineSummary, formatMedicineSubtitle } from '../../src/utils';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { typography } from '../../src/theme';
import { ExactProgressRing } from '../../src/components/ExactProgressRing';
import { FeatureCard } from '../../src/components/FeatureCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { formatLocalTime } from '../../src/utils/date';
import { SecurityOverlay } from '../../src/components/SecurityOverlay';
import { authenticateSecureAccess } from '../../src/utils/auth';
import { NotificationCenter } from '../../src/components/NotificationCenter';
import { useNotificationsStore } from '../../src/store/notificationsStore';
import * as Haptics from 'expo-haptics';
import { getThemedShadow } from '../../src/components/ThemedComponents';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { colors, theme, isDark, setMode } = useTheme();
  const { setSwipeEnabled } = useSwipe();
  
  const [securityVisible, setSecurityVisible] = React.useState(false);
  const [pendingNote, setPendingNote] = React.useState<any>(null);
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);



  const reminderScale = useSharedValue(1);
  const reminderOpacity = useSharedValue(1);

  const reminderAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: reminderScale.value }],
      opacity: reminderOpacity.value,
    };
  });

  const handleReminderPressIn = () => {
    reminderScale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
    reminderOpacity.value = withTiming(0.85, { duration: 100 });
  };

  const handleReminderPressOut = () => {
    reminderScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    reminderOpacity.value = withTiming(1, { duration: 100 });
  };

  const renderWidget = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    stat: string | number,
    detail: string,
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity 
        style={[
          ds.widgetCard, 
          { 
            backgroundColor: theme.card,
            borderColor: theme.border,
          }
        ]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={ds.widgetHeader}>
          <View style={[ds.widgetIconContainer, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text style={[ds.widgetTitle, { color: theme.textSecondary }]}>{title}</Text>
        </View>
        <Text style={[ds.widgetStat, { color: theme.text }]}>{stat}</Text>
        <Text style={[ds.widgetDetail, { color: colors.text.tertiary }]} numberOfLines={1}>
          {detail}
        </Text>
      </TouchableOpacity>
    );
  };

  const generateNotifications = useNotificationsStore((state) => state.generateNotifications);
  const unreadCount = useNotificationsStore((state) => state.getUnreadCount());

  const badgeScale = useSharedValue(1);

  React.useEffect(() => {
    if (unreadCount > 0) {
      badgeScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        true
      );
    } else {
      badgeScale.value = 1;
    }
  }, [unreadCount]);

  const badgeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: badgeScale.value }],
    };
  });

  const handleNotePress = async (note: any) => {
    if (note.is_secure || note.category === 'Secure') {
      setPendingNote(note);
      setSecurityVisible(true);
      handleAuthenticate(note);
      return;
    }
    router.push(`/note/${note.id}`);
  };

  const handleAuthenticate = async (noteOverride?: any) => {
    const note = noteOverride || pendingNote;
    if (!note) return;
    
    const success = await authenticateSecureAccess();
    if (success) {
      setSecurityVisible(false);
      setPendingNote(null);
      setTimeout(() => {
        router.push(`/note/${note.id}`);
      }, 100);
    }
  };
  
  const queryClient = useQueryClient();
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: () => notesApi.getNotes() });
  const { data: goals } = useQuery({ 
    queryKey: ['goals'], 
    queryFn: () => goalsApi.getGoals() 
  });

  const toggleGoalMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => {
      return goalsApi.updateGoal(id, { completed });
    },
    onMutate: async ({ id, completed }) => {
      console.log(`[GOAL TOGGLED] GoalId: ${id}, completed: ${completed}`);
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      await queryClient.cancelQueries({ queryKey: ['goalStats'] });
      const previousGoals = queryClient.getQueryData(['goals']);
      const previousStats = queryClient.getQueryData(['goalStats']);

      queryClient.setQueryData(['goals'], (old: any) => {
        if (!old) return [];
        return old.map((g: any) => g.id === id ? { ...g, completed } : g);
      });

      queryClient.setQueryData(['goalStats'], (old: any) => {
        if (!old) return old;
        const diff = completed ? 1 : -1;
        const total = old.today_total || 0;
        const newCompleted = Math.max(0, Math.min(total, old.today_completed + diff));
        const newPercentage = total > 0 ? Math.round((newCompleted / total) * 100) : 0;
        return { 
          ...old, 
          today_completed: newCompleted,
          today_percentage: newPercentage
        };
      });

      return { previousGoals, previousStats };
    },
    onSuccess: (data) => {
      console.log(`[GOAL MUTATION SUCCESS] Home screen goal toggle successful. ID: ${data?.id}, Completed: ${data?.completed}`);
    },
    onError: (err, vars, context) => {
      if (context?.previousGoals) queryClient.setQueryData(['goals'], context.previousGoals);
      if (context?.previousStats) queryClient.setQueryData(['goalStats'], context.previousStats);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
      console.log('[QUERY INVALIDATED] Home screen goals and stats cache invalidated');
    }
  });
  
  const toggleReminderMutation = useMutation({
    mutationFn: ({ id, is_completed }: { id: number; is_completed: boolean }) => {
      return remindersApi.updateReminder(id, { is_completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update reminder status');
    }
  });

  const { data: reminders, isLoading: isLoadingReminders } = useQuery({ 
    queryKey: ['upcoming-reminders'], 
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const data = await remindersApi.getReminders({
        start_date: start.toISOString(),
        end_date: end.toISOString()
      });
      
      return [...data].sort((a, b) => {
        const complA = a.is_completed ? 1 : 0;
        const complB = b.is_completed ? 1 : 0;
        if (complA !== complB) {
          return complA - complB;
        }
        return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
      });
    }
  });

  const { data: importantDays } = useQuery({ 
    queryKey: ['important-days'], 
    queryFn: async () => {
      return await importantDaysApi.getImportantDays();
    }
  });

  const { data: todayImportantDays, isLoading: isLoadingTodayImportantDays } = useQuery({ 
    queryKey: ['today-important-days'], 
    queryFn: async () => {
      return await importantDaysApi.getTodayImportantDays();
    }
  });

  React.useEffect(() => {
    generateNotifications(reminders || [], todayImportantDays || [], goals || [], notes || []);
  }, [reminders, todayImportantDays, goals, notes]);

  const openThemePicker = () => {
    Alert.alert('Theme Settings', 'Choose your preference:', [
      { text: 'System Default', onPress: () => setMode('system') },
      { text: 'Light Mode', onPress: () => setMode('light') },
      { text: 'Dark Mode', onPress: () => setMode('dark') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const { data: goalStats } = useQuery({
    queryKey: ['goalStats'],
    queryFn: () => goalsApi.getGoalStats(),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getProjects(),
  });

  const activeProjects = projects?.filter(p => !p.completed) || [];
  const activeProjectsCount = activeProjects.length;

  const nearestProjectWithDeadline = [...activeProjects]
    .filter(p => p.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

  const nearestDeadlineStr = nearestProjectWithDeadline && nearestProjectWithDeadline.deadline
    ? new Date(nearestProjectWithDeadline.deadline).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const getPriorityColor = (prio: string) => {
    switch (prio.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return theme.primary;
    }
  };


  const totalCount = goals?.length ?? 0;
  const completedCount = goals?.filter(g => g.completed).length ?? 0;
  const todayPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const todayMedicines = reminders?.filter(r => getReminderCategory(r) === 'medicine') || [];
  const totalMedCount = todayMedicines.length;
  const completedMedCount = todayMedicines.filter(r => r.is_completed).length;
  const remainingMedCount = totalMedCount - completedMedCount;

  React.useEffect(() => {
    console.log(`[HOME STATS UPDATED] [HOME STATS] todayTotal=${totalCount} todayCompleted=${completedCount} todayPercentage=${todayPercentage}%`);
  }, [goals, totalCount, completedCount, todayPercentage]);

  const sortedImportantDays = importantDays ? sortImportantDaysByUpcoming(importantDays) : [];
  const nextEvent = sortedImportantDays.find(d => {
    const days = calculateDaysRemaining(d.date || d.birth_date, d.is_recurring);
    return days >= 0;
  });
  const nextEventDays = nextEvent ? calculateDaysRemaining(nextEvent.date || nextEvent.birth_date, nextEvent.is_recurring) : null;
  const widgetDetail = todayImportantDays && todayImportantDays.length > 0
    ? `${todayImportantDays.length} event(s) today! 🎉`
    : nextEvent
      ? `${nextEvent.title} in ${nextEventDays}d`
      : 'No upcoming events';

  const recentNotes = notes?.slice(0, 5) || [];
  
  const todayStr = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  const ds = styles(theme, isDark);

  return (
    <SwipeWrapper currentTab="index">
      <SafeAreaView style={ds.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds.scrollContent}>
        
        <LinearGradient
          colors={isDark ? ['#101A2E', '#081120'] : colors.gradient.primary}
          style={ds.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={ds.headerTop}>
            <View>
              <View style={ds.dateChip}>
                <Text style={ds.dateChipText}>{todayStr}</Text>
              </View>
              <Text style={ds.greetingText}>Hello, {user?.full_name?.split(' ')[0] || 'Innovator'}</Text>
            </View>
            <View style={ds.headerActions}>
              <TouchableOpacity style={ds.headerIconBtn} onPress={openThemePicker}>
                <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[ds.headerIconBtn, { marginLeft: 10 }]}
                onPress={() => setNotificationsVisible(true)}
              >
                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <Animated.View style={[ds.badgeContainer, badgeAnimatedStyle]}>
                    <Text style={ds.badgeText}>{unreadCount}</Text>
                  </Animated.View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={ds.progressContainer}>
            <ExactProgressRing 
              completed={completedCount} 
              total={totalCount} 
              size={180} 
              textColor="#FFFFFF"
            />
          </View>
        </LinearGradient>

        <View style={ds.content}>
          <Animated.View entering={FadeInDown.delay(200)} style={ds.quickGrid}>
            <View style={ds.gridRow}>
              {renderWidget(
                'Notes',
                'document-text',
                '#8B5CF6',
                notes?.length ?? 0,
                notes?.[0]?.title ?? 'No notes yet',
                () => router.push('/notes')
              )}
              <View style={{ width: 15 }} />
              {renderWidget(
                'Projects',
                'rocket',
                '#0EA5E9',
                activeProjectsCount,
                nearestProjectWithDeadline ? `Due ${nearestDeadlineStr}` : 'No deadlines',
                () => router.push('/goals?tab=projects')
              )}
            </View>
            <View style={[ds.gridRow, { marginTop: 15 }]}>
              {renderWidget(
                'Calendar',
                'calendar',
                '#F43F5E',
                reminders?.length ?? 0,
                reminders && reminders.length > 0 
                  ? `${reminders.length} scheduled reminder${reminders.length !== 1 ? 's' : ''}`
                  : 'No reminders today',
                () => router.push('/calendar')
              )}
              <View style={{ width: 15 }} />
              {renderWidget(
                'Daily Goals',
                'checkbox',
                '#10B981',
                totalCount > 0 ? `${completedCount}/${totalCount}` : '0',
                goals?.find(g => !g.completed)?.title ?? 'All caught up! 🎉',
                () => router.push('/goals')
              )}
            </View>
            <View style={[ds.gridRow, { marginTop: 15 }]}>
              {renderWidget(
                'Special Days',
                'sparkles',
                '#F59E0B',
                importantDays?.length ?? 0,
                widgetDetail,
                () => router.push('/special_days')
              )}
              <View style={{ width: 15 }} />
              <Animated.View style={[{ flex: 1 }, reminderAnimatedStyle]}>
                <Pressable
                  onPressIn={handleReminderPressIn}
                  onPressOut={handleReminderPressOut}
                  onPress={async () => {
                    try {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (e) {}
                    router.push('/reminder/create');
                  }}
                  style={[
                    ds.widgetCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    }
                  ]}
                >
                  <View style={ds.widgetHeader}>
                    <View style={[ds.widgetIconContainer, { backgroundColor: 'rgba(124, 77, 255, 0.12)' }]}>
                      <Ionicons name="alarm" size={18} color="#7C4DFF" />
                    </View>
                    <Text style={[ds.widgetTitle, { color: theme.textSecondary }]}>Reminders</Text>
                  </View>
                  <Text style={[ds.widgetStat, { color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 4 }]} numberOfLines={2}>
                    <Text style={{ color: '#7C4DFF', fontWeight: '900' }}>+ </Text>New Reminder
                  </Text>
                  <Text style={[ds.widgetDetail, { color: colors.text.tertiary }]} numberOfLines={1}>
                    Tap to schedule
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>

          {isLoadingTodayImportantDays ? (
            <View style={ds.loadingContainer}><ActivityIndicator color="#F59E0B" /></View>
          ) : todayImportantDays && todayImportantDays.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(400)}>
              <SectionHeader title="✨ Today's Special Days" actionLabel="View All" onAction={() => router.push('/special_days')} />
              {todayImportantDays.map((b) => {
                const getIconForType = (type: string) => {
                  const t = type?.toLowerCase() || '';
                  if (t.includes('birthday')) return { name: 'gift-outline', color: '#F59E0B', bg: '#FEF3C7' };
                  if (t.includes('wedding') || t.includes('anniversary')) return { name: 'heart-outline', color: '#EC4899', bg: '#FCE7F3' };
                  if (t.includes('engagement')) return { name: 'ribbon-outline', color: '#3B82F6', bg: '#DBEAFE' };
                  if (t.includes('festival')) return { name: 'sparkles-outline', color: '#D97706', bg: '#FEF3C7' };
                  if (t.includes('meeting')) return { name: 'people-outline', color: '#10B981', bg: '#D1FAE5' };
                  if (t.includes('achievement')) return { name: 'trophy-outline', color: '#8B5CF6', bg: '#EDE9FE' };
                  if (t.includes('memory') || t.includes('personal memory')) return { name: 'camera-outline', color: '#6366F1', bg: '#EEF2FF' };
                  return { name: 'star-outline', color: '#64748B', bg: '#F1F5F9' };
                };
                
                const iconInfo = getIconForType(b.type);
                const hasDetails = !!(b.notes || b.gift_ideas || b.celebration_plans || b.message_draft);
                return (
                  <TouchableOpacity 
                    key={b.id} 
                    style={[
                      ds.birthdayCard, 
                      { 
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }
                    ]} 
                    activeOpacity={0.7} 
                    onPress={() => router.push(`/special_day/${b.id}`)}
                  >
                    <View style={[ds.birthdayIcon, { backgroundColor: isDark ? `${iconInfo.color}15` : iconInfo.bg }]}>
                      <Ionicons name={iconInfo.name as any} size={24} color={iconInfo.color} />
                    </View>
                    <View style={ds.birthdayInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[ds.birthdayTitle, { color: theme.text }]} numberOfLines={1}>{b.title}</Text>
                        {hasDetails && (
                          <View style={{ backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 9, color: isDark ? '#A78BFA' : '#7C3AED', fontWeight: '800' }}>Reminders</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[ds.birthdaySubtitle, { color: theme.textSecondary }]}>{b.type} • Today 🎉</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[ds.countdownChip, { backgroundColor: '#F59E0B' }]}>
                        <Text style={ds.countdownChipText}>TODAY</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 20 }} />
            </Animated.View>
          ) : null}

          <SectionHeader title="Today's Goals" actionLabel="View All" onAction={() => router.push('/goals')} />
          {goals && goals.length > 0 ? (
            goals.slice(0, 3).map((goal) => (
              <TouchableOpacity 
                key={goal.id} 
                style={ds.goalItem}
                activeOpacity={0.7}
                onPress={async () => {
                  const nextCompleted = !goal.completed;
                  try {
                    if (nextCompleted) {
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } else {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  } catch (e) {
                    console.log('[Haptics error]', e);
                  }
                  toggleGoalMutation.mutate({ id: goal.id, completed: nextCompleted });
                }}
              >
                <View style={ds.goalCheckContainer}>
                  <View style={[ds.goalCheck, goal.completed && ds.goalCheckActive]}>
                    {goal.completed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </View>
                <Text style={[ds.goalText, goal.completed && ds.goalTextDone]}>{goal.title}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={ds.emptyGoalContainer}>
              <Text style={ds.emptyGoalText}>Plan your day 🌅</Text>
              <TouchableOpacity style={ds.addGoalBtn} onPress={() => router.push('/goals')}>
                <Text style={ds.addGoalBtnText}>+ Add Goal</Text>
              </TouchableOpacity>
            </View>
          )}

          <SectionHeader title="Active Projects & Long-Term Goals" actionLabel="View All" onAction={() => router.push('/goals')} />
          
          <View style={ds.projectStatsRow}>
            <View style={[ds.projectStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="rocket-outline" size={20} color={theme.primary} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[ds.projectStatNum, { color: theme.text }]}>{activeProjectsCount}</Text>
                <Text style={[ds.projectStatLabel, { color: theme.textSecondary }]} numberOfLines={1}>Ongoing Projects</Text>
              </View>
            </View>
            <View style={[ds.projectStatCard, { backgroundColor: theme.card, borderColor: theme.border, marginLeft: 12 }]}>
              <Ionicons name="calendar-outline" size={20} color="#F43F5E" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[ds.projectStatNum, { color: theme.text, fontSize: nearestDeadlineStr ? 12 : 18 }]} numberOfLines={1}>
                  {nearestDeadlineStr || 'None'}
                </Text>
                <Text style={[ds.projectStatLabel, { color: theme.textSecondary }]} numberOfLines={1}>Next Deadline</Text>
              </View>
            </View>
          </View>

          {activeProjects && activeProjects.length > 0 ? (
            activeProjects.slice(0, 3).map((project) => {
              const subtasksCount = project.subtasks?.length ?? 0;
              const completedSubtasksCount = project.subtasks?.filter((s: any) => s.completed).length ?? 0;
              const ongoingSubtasksCount = subtasksCount - completedSubtasksCount;
              return (
                <TouchableOpacity 
                  key={project.id} 
                  style={ds.homeProjectCard} 
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({ pathname: '/goals', params: { tab: 'projects' } });
                  }}
                >
                  <View style={ds.homeProjectHeader}>
                    <Text style={[ds.homeProjectTitle, { color: theme.text }]} numberOfLines={1}>{project.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[ds.homeProjectStatusBadge, { backgroundColor: project.status === 'Completed' ? '#10B98115' : (project.status === 'In Progress' ? '#0EA5E915' : '#F59E0B15') }]}>
                        <Text style={[ds.homeProjectStatusText, { color: project.status === 'Completed' ? '#10B981' : (project.status === 'In Progress' ? '#0EA5E9' : '#F59E0B') }]}>
                          {project.status}
                        </Text>
                      </View>
                      <View style={[ds.homeProjectPriority, { backgroundColor: getPriorityColor(project.priority) + '15' }]}>
                        <Text style={[ds.homeProjectPriorityText, { color: getPriorityColor(project.priority) }]}>{project.priority}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Subtasks Count Progress Indicator */}
                  {project.subtasks && project.subtasks.length > 0 && (
                    <View style={ds.homeProjectSubtasksContainer}>
                      <Ionicons name="git-branch-outline" size={12} color={theme.textSecondary} />
                      <Text style={[ds.homeProjectSubtasksText, { color: theme.textSecondary }]}>
                        {ongoingSubtasksCount} ongoing subtask{ongoingSubtasksCount !== 1 ? 's' : ''} ({completedSubtasksCount}/{subtasksCount})
                      </Text>
                    </View>
                  )}
                  
                  <View style={ds.homeProjectProgressContainer}>
                    <View style={ds.homeProjectProgressTrack}>
                      <View style={[ds.homeProjectProgressBar, { backgroundColor: theme.primary, width: `${project.progress}%` }]} />
                    </View>
                    <Text style={[ds.homeProjectProgressText, { color: theme.textSecondary }]}>{project.progress}%</Text>
                  </View>

                  {project.deadline && (
                    <View style={ds.homeProjectDeadline}>
                      <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                      <Text style={[ds.homeProjectDeadlineText, { color: theme.textSecondary }]}>
                        Due {new Date(project.deadline).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={ds.emptyGoalContainer}>
              <Text style={ds.emptyGoalText}>Start your first long-term project 🚀</Text>
              <TouchableOpacity style={ds.addGoalBtn} onPress={() => router.push({ pathname: '/goals', params: { tab: 'projects', openAddProject: 'true' } })}>
                <Text style={ds.addGoalBtnText}>+ Start Project</Text>
              </TouchableOpacity>
            </View>
          )}


          <SectionHeader title="Recent Notes" actionLabel="See All" onAction={() => router.push('/notes')} />
          <FlatList
            data={recentNotes}
            horizontal
            showsHorizontalScrollIndicator={false}
            onTouchStart={() => setSwipeEnabled(false)}
            onTouchEnd={() => setSwipeEnabled(true)}
            onTouchCancel={() => setSwipeEnabled(true)}
            onMomentumScrollEnd={() => setSwipeEnabled(true)}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSecure = item.is_secure || item.category === 'Secure';
              return (
                <TouchableOpacity style={ds.noteCard} onPress={() => handleNotePress(item)}>
                  <View style={[ds.noteTag, { backgroundColor: isSecure ? 'rgba(124,77,255,0.15)' : (isDark ? '#1C2A3E' : '#F5F3FF') }]}>
                    <Text style={[ds.noteTagText, { color: isSecure ? '#C4B5FD' : theme.primary }]}>{item.category}</Text>
                  </View>
                  <Text style={ds.noteTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={ds.noteDate}>{new Date(item.updated_at).toLocaleDateString()}</Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Medicine Stats Card */}
          {!isLoadingReminders && totalMedCount > 0 && (
            <Animated.View entering={FadeInDown.delay(500)} style={[ds.medStatsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={ds.medStatsHeader}>
                <Ionicons name="medical-outline" size={20} color="#10B981" />
                <Text style={[ds.medStatsTitle, { color: theme.text }]}>Today's Medicines</Text>
              </View>
              <View style={ds.medStatsRow}>
                <View style={ds.medStatItem}>
                  <Text style={[ds.medStatValue, { color: theme.primary }]}>{totalMedCount}</Text>
                  <Text style={[ds.medStatLabel, { color: theme.textSecondary }]}>Total</Text>
                </View>
                <View style={[ds.medStatDivider, { backgroundColor: theme.border }]} />
                <View style={ds.medStatItem}>
                  <Text style={[ds.medStatValue, { color: '#10B981' }]}>{completedMedCount}</Text>
                  <Text style={[ds.medStatLabel, { color: theme.textSecondary }]}>Taken</Text>
                </View>
                <View style={[ds.medStatDivider, { backgroundColor: theme.border }]} />
                <View style={ds.medStatItem}>
                  <Text style={[ds.medStatValue, { color: remainingMedCount > 0 ? '#F59E0B' : theme.textSecondary }]}>
                    {remainingMedCount}
                  </Text>
                  <Text style={[ds.medStatLabel, { color: theme.textSecondary }]}>Remaining</Text>
                </View>
              </View>
            </Animated.View>
          )}

          <SectionHeader title="Upcoming Reminders" actionLabel="View All" onAction={() => router.push('/calendar')} />
          {isLoadingReminders ? (
            <View style={ds.loadingContainer}><ActivityIndicator color={theme.primary} /></View>
          ) : reminders && reminders.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(600)}>
              {reminders.slice(0, 5).map((r) => {
                const category = getReminderCategory(r);
                const titleText = getReminderTitle(r);
                const isMed = category === 'medicine';
                const medicineSummary = isMed ? getMedicineSummary(r) : null;
                const subtitleText = isMed ? formatMedicineSubtitle(r) : getReminderSubtitle(r);
                const isCompleted = r.is_completed ?? false;
                return (
                  <TouchableOpacity 
                    key={r.id} 
                    style={[ds.reminderCard, isCompleted && { opacity: 0.7 }]} 
                    onPress={() => router.push(`/reminder/${r.id}`)}
                  >
                    <TouchableOpacity
                      style={ds.reminderCheckContainer}
                      activeOpacity={0.7}
                      onPress={async () => {
                        try {
                          if (!isCompleted) {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          } else {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        } catch (e) {}
                        toggleReminderMutation.mutate({ id: r.id, is_completed: !isCompleted });
                      }}
                    >
                      <View style={[ds.reminderCheck, isCompleted && ds.reminderCheckActive]}>
                        {isCompleted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                    
                    <View style={[ds.reminderBar, { backgroundColor: getReminderColor(category) }]} />
                    <View style={ds.reminderInfo}>
                      <View style={ds.reminderHeader}>
                        <Text style={[ds.reminderTitle, isCompleted && ds.reminderTitleDone]} numberOfLines={1}>{titleText}</Text>
                      </View>
                      {isMed ? (
                        <View style={{ gap: 2, marginBottom: 6 }}>
                          {medicineSummary ? (
                            <Text style={[ds.metaText, { marginLeft: 0, fontSize: 13, fontWeight: '700', color: theme.primary }]}>
                              {medicineSummary}
                            </Text>
                          ) : null}
                          {subtitleText ? (
                            <Text style={[ds.metaText, { marginLeft: 0, fontSize: 12, color: theme.textSecondary }]} numberOfLines={1}>
                              {subtitleText}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        subtitleText ? (
                          <Text style={[ds.metaText, { marginLeft: 0, marginBottom: 6, fontSize: 12, color: theme.textSecondary }]} numberOfLines={1}>
                            {subtitleText}
                          </Text>
                        ) : null
                      )}
                      <View style={ds.reminderMeta}>
                        <Ionicons name="calendar-outline" size={12} color={colors.text.tertiary} />
                        <Text style={ds.metaText}>{new Date(r.reminder_date).toLocaleDateString()}</Text>
                        {!isMed && (
                          <>
                            <Ionicons name="time-outline" size={12} color={colors.text.tertiary} style={{ marginLeft: 10 }} />
                            <Text style={ds.metaText}>{formatLocalTime(r.reminder_date)}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          ) : (
            <View style={ds.emptyState}><Text style={ds.emptyText}>No upcoming reminders</Text></View>
          )}
        </View>
      </ScrollView>
      <SecurityOverlay 
        visible={securityVisible}
        onAuthenticate={() => handleAuthenticate()}
        onCancel={() => {
          setSecurityVisible(false);
          setPendingNote(null);
        }}
      />
      <NotificationCenter 
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </SafeAreaView>
    </SwipeWrapper>
  );
}

function getReminderColor(type: string) {
  switch (type.toLowerCase()) {
    case 'meeting': return '#10B981';
    case 'assignment': return '#0EA5E9';
    case 'event': return '#8B5CF6';
    case 'birthday': return '#F59E0B';
    case 'medicine': return '#10B981';
    case 'custom': return '#F59E0B';
    default: return '#6C63FF';
  }
}

const styles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingBottom: 120 },
  widgetCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.2,
    minHeight: 125,
    ...getThemedShadow(theme, 'soft'),
    justifyContent: 'space-between',
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  widgetIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  widgetStat: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 4,
  },
  widgetDetail: {
    fontSize: 10,
    fontWeight: '600',
  },
  homeProjectStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  homeProjectStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  homeProjectSubtasksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  homeProjectSubtasksText: {
    fontSize: 11,
    fontWeight: '600',
  },

  header: { 
    paddingTop: 20, 
    paddingHorizontal: 25, 
    paddingBottom: 50, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40,
    ...getThemedShadow(theme, 'medium'),
    borderWidth: isDark ? 1 : 0,
    borderColor: theme.border,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  dateChip: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-start', marginBottom: 8 },
  dateChipText: { ...typography.caption, color: '#FFFFFF', fontWeight: '700' },
  greetingText: { ...typography.displaySmall, color: '#FFFFFF', fontWeight: '800' },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  progressContainer: { alignItems: 'center', marginTop: 10 },
  content: { paddingHorizontal: 25, marginTop: -30 },
  quickGrid: { marginBottom: 25, width: '100%' },
  gridRow: { flexDirection: 'row', width: '100%' },
  birthdayCard: { 
    backgroundColor: theme.card, 
    borderRadius: 24, 
    padding: 18, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10, 
    ...getThemedShadow(theme, 'medium'), 
    borderWidth: 1.2, 
    borderColor: theme.border 
  },
  countdownChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  birthdayIcon: { 
    width: 54, 
    height: 54, 
    borderRadius: 18, 
    backgroundColor: isDark ? '#1C2638' : '#FFF1F2', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  birthdayInfo: { flex: 1 },
  birthdayTitle: { ...typography.titleSmall, color: theme.text, fontWeight: '700' },
  birthdaySubtitle: { ...typography.bodySmall, color: theme.textSecondary },
  goalItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.card, 
    padding: 10, 
    borderRadius: 18, 
    marginBottom: 10, 
    ...getThemedShadow(theme, 'soft'), 
    borderWidth: 1.2, 
    borderColor: theme.border 
  },
  goalCheckContainer: { padding: 10 },
  goalCheck: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  goalCheckActive: { backgroundColor: theme.primary },
  goalText: { ...typography.bodyMedium, color: theme.text, fontWeight: '600', flex: 1 },
  goalTextDone: { textDecorationLine: 'line-through', color: theme.textSecondary, opacity: 0.7 },
  noteCard: { 
    backgroundColor: theme.card, 
    width: 170, 
    borderRadius: 24, 
    padding: 20, 
    marginRight: 15, 
    ...getThemedShadow(theme, 'soft'), 
    borderWidth: 1.2, 
    borderColor: theme.border 
  },
  noteTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 12 },
  noteTagText: { ...typography.caption, fontWeight: '700' },
  noteTitle: { ...typography.titleSmall, color: theme.text, fontWeight: '700', height: 45 },
  noteDate: { ...typography.caption, color: theme.colors.text.tertiary, marginTop: 10 },
  reminderCard: { 
    backgroundColor: theme.card, 
    borderRadius: 24, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    ...getThemedShadow(theme, 'soft'), 
    borderWidth: 1.2, 
    borderColor: theme.border, 
    marginBottom: 12 
  },
  reminderBar: { width: 6, height: 40, borderRadius: 3, marginRight: 15 },
  reminderInfo: { flex: 1 },
  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reminderTitle: { ...typography.bodyLarge, color: theme.text, fontWeight: '800', flex: 1 },
  reminderMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { ...typography.caption, color: theme.colors.text.tertiary, fontWeight: '600', marginLeft: 4 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyState: { 
    backgroundColor: theme.card, 
    borderRadius: 24, 
    padding: 30, 
    alignItems: 'center', 
    ...getThemedShadow(theme, 'soft'), 
    borderWidth: 1.2, 
    borderStyle: 'dashed', 
    borderColor: theme.colors.text.tertiary 
  },
  emptyText: { ...typography.bodyMedium, color: theme.textSecondary, fontWeight: '600' },
  emptyGoalContainer: { 
    backgroundColor: theme.card, 
    borderRadius: 24, 
    padding: 30, 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...getThemedShadow(theme, 'soft'), 
    borderWidth: 1.2, 
    borderColor: theme.border, 
    borderStyle: 'dashed', 
    marginBottom: 20 
  },
  emptyGoalText: { ...typography.bodyMedium, color: theme.colors.text.tertiary, fontWeight: '600', marginBottom: 12 },
  addGoalBtn: { backgroundColor: isDark ? theme.surface : theme.card, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  addGoalBtnText: { ...typography.caption, color: theme.primary, fontWeight: '800' },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.white,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  projectStatsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  projectStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.2,
  },
  projectStatNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  projectStatLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  homeProjectCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: theme.border,
    marginBottom: 12,
    ...getThemedShadow(theme, 'soft'),
  },
  homeProjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  homeProjectTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  homeProjectPriority: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  homeProjectPriorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  homeProjectProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  homeProjectProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  homeProjectProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  homeProjectProgressText: {
    fontSize: 11,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  homeProjectDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  homeProjectDeadlineText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reminderCheckContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  reminderCheckActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  reminderTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  medStatsCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.2,
    marginBottom: 20,
    ...getThemedShadow(theme, 'soft'),
  },
  medStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  medStatsTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  medStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  medStatItem: {
    alignItems: 'center',
  },
  medStatValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  medStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  medStatDivider: {
    width: 1.2,
    height: 24,
  },
});
