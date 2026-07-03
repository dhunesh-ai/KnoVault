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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/hooks/useTheme';
import { notesApi } from '../../src/api/notes';
import { goalsApi } from '../../src/api/goals';
import { projectsApi } from '../../src/api/projects';
import { remindersApi } from '../../src/api/reminders';
import { importantDaysApi } from '../../src/api/important_days';
import { calendarNotesApi } from '../../src/api/calendar_notes';
import { calculateDaysRemaining, sortImportantDaysByUpcoming } from '../../src/utils/important_day';
import { getReminderTitle, getReminderSubtitle, getReminderCategory, getMedicineSummary, formatMedicineSubtitle } from '../../src/utils';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { getFadeInDown, getZoomIn } from '../../src/utils/animations';
import { typography } from '../../src/theme';
import { ExactProgressRing } from '../../src/components/ExactProgressRing';
import { FeatureCard } from '../../src/components/FeatureCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { formatLocalTime, getLocalDateString } from '../../src/utils/date';
import { calendarApi } from '../../src/api/calendar';
import { SecurityOverlay } from '../../src/components/SecurityOverlay';
import { useNotificationStore, logNotificationToHistory } from '../../src/store/notificationStore';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { getThemedShadow } from '../../src/components/ThemedComponents';

const { width } = Dimensions.get('window');

const ScalePressable: React.FC<{
  children: React.ReactNode;
  onPress: () => void;
  style: any;
}> = ({ children, onPress, style }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={style}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function HomeScreen() {
  console.log('[HomeScreen] Rendering...');
  const { user } = useAuthStore();
  const { colors, theme, isDark, setMode } = useTheme();
  const { setSwipeEnabled } = useSwipe();
  
  const [securityVisible, setSecurityVisible] = React.useState(false);
  const [pendingNote, setPendingNote] = React.useState<any>(null);
  const [showFabSheet, setShowFabSheet] = React.useState(false);

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  const [streak, setStreak] = React.useState(0);
  const mascotY = useSharedValue(0);

  React.useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const floatingMascotStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: mascotY.value }],
    };
  });




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

  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const [currentDate, setCurrentDate] = React.useState(new Date());

  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications();
      setCurrentDate(new Date());
    }, [])
  );

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
      return;
    }
    router.push(`/note/${note.id}`);
  };

  const handleAuthenticate = async (noteOverride?: any) => {
    const note = noteOverride || pendingNote;
    if (!note) return;
    
    setSecurityVisible(false);
    setPendingNote(null);
    setTimeout(() => {
      router.push(`/note/${note.id}`);
    }, 100);
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
      if (data && data.completed) {
        logNotificationToHistory(
          '🎯 Goal Completed!',
          `Excellent job finishing: "${data.title}"`,
          'goals',
          { type: 'goal', id: data.id }
        );
      }
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

  const { data: todayCalendarNotes, isLoading: isLoadingTodayCalendarNotes } = useQuery({
    queryKey: ['today-calendar-notes'],
    queryFn: async () => {
      const todayStr = getLocalDateString(new Date());
      return await calendarNotesApi.getCalendarNotesByDate(todayStr);
    }
  });



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

  const todayStrKey = React.useMemo(() => getLocalDateString(new Date()), []);
  
  const { data: calendarEventsMap } = useQuery({
    queryKey: ['calendar-events', new Date().getMonth() + 1, new Date().getFullYear()],
    queryFn: () => calendarApi.getCalendarEvents(new Date().getMonth() + 1, new Date().getFullYear()),
  });

  const todayEventsCount = React.useMemo(() => {
    return calendarEventsMap?.[todayStrKey]?.length ?? 0;
  }, [calendarEventsMap, todayStrKey]);

  const activeProjects = React.useMemo(() => {
    return projects?.filter(p => !p.completed) || [];
  }, [projects]);

  const activeProjectsCount = React.useMemo(() => {
    return activeProjects.length;
  }, [activeProjects]);

  const nearestProjectWithDeadline = React.useMemo(() => {
    return [...activeProjects]
      .filter(p => p.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
  }, [activeProjects]);

  const nearestDeadlineStr = React.useMemo(() => {
    return nearestProjectWithDeadline && nearestProjectWithDeadline.deadline
      ? new Date(nearestProjectWithDeadline.deadline).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : null;
  }, [nearestProjectWithDeadline]);

  const getPriorityColor = React.useCallback((prio: string) => {
    switch (prio.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return theme.primary;
    }
  }, [theme.primary]);

  const totalCount = React.useMemo(() => goals?.length ?? 0, [goals]);
  const completedCount = React.useMemo(() => goals?.filter(g => g.completed).length ?? 0, [goals]);
  const todayPercentage = React.useMemo(() => totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0, [totalCount, completedCount]);

  const todayMedicines = React.useMemo(() => reminders?.filter(r => getReminderCategory(r) === 'medicine') || [], [reminders]);
  const totalMedCount = React.useMemo(() => todayMedicines.length, [todayMedicines]);
  const completedMedCount = React.useMemo(() => todayMedicines.filter(r => r.is_completed).length, [todayMedicines]);
  const remainingMedCount = React.useMemo(() => totalMedCount - completedMedCount, [totalMedCount, completedMedCount]);

  const pendingRemindersCount = React.useMemo(() => {
    return reminders?.filter(r => !r.is_completed).length ?? 0;
  }, [reminders]);

  const smartInsight = React.useMemo(() => {
    if (totalCount === 0) {
      return { text: "🎯 Set a goal to start tracking progress." };
    }
    if (totalCount > 0 && todayPercentage < 100) {
      return { text: `🔥 You are ${todayPercentage}% complete today.` };
    }
    if (pendingRemindersCount > 0) {
      return { text: `⏰ You have ${pendingRemindersCount} upcoming reminders.` };
    }
    if (activeProjectsCount > 0) {
      return { text: `🚀 ${activeProjectsCount} active projects need attention.` };
    }
    return { text: "✨ You are all caught up for today!" };
  }, [totalCount, todayPercentage, pendingRemindersCount, activeProjectsCount]);

  React.useEffect(() => {
    console.log(`[HOME STATS UPDATED] [HOME STATS] todayTotal=${totalCount} todayCompleted=${completedCount} todayPercentage=${todayPercentage}%`);
  }, [goals, totalCount, completedCount, todayPercentage]);

  React.useEffect(() => {
    const loadStreak = async () => {
      try {
        const stored = await SecureStore.getItemAsync('productivity_streak');
        if (stored) {
          setStreak(parseInt(stored, 10));
        } else {
          if (completedCount > 0) {
            setStreak(1);
            await SecureStore.setItemAsync('productivity_streak', '1');
          } else {
            setStreak(0);
          }
        }
      } catch (e) {
        setStreak(completedCount > 0 ? 1 : 0);
      }
    };
    loadStreak();
  }, [completedCount]);

  const sortedImportantDays = importantDays ? sortImportantDaysByUpcoming(importantDays) : [];
  const upcomingSpecialDaysCount = sortedImportantDays.length;
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
  
  const todayStr = React.useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }, [currentDate]);

  const isStudent = React.useMemo(() => {
    const emailLower = user?.email?.toLowerCase() || '';
    const nameLower = user?.full_name?.toLowerCase() || '';
    return emailLower.includes('student') || emailLower.includes('.edu') || 
           nameLower.includes('student') || nameLower.includes('dhunesh');
  }, [user]);

  const aiCardSubtitle = React.useMemo(() => {
    if (activeProjects && activeProjects.length > 0) {
      const approachingProject = activeProjects.find((p: any) => {
        if (!p.deadline) return false;
        const diffDays = Math.ceil((new Date(p.deadline as string).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      });
      if (approachingProject) {
        const diffDays = Math.ceil((new Date(approachingProject.deadline as string).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const dayStr = diffDays === 1 ? '1 day' : `${diffDays} days`;
        return `"${approachingProject.title}" is due in ${dayStr}! Let's make progress today.`;
      }
    }

    const activeGoalsCount = goals?.filter(g => !g.completed).length ?? 0;
    if (activeGoalsCount > 0) {
      return `You have ${activeGoalsCount} active goal${activeGoalsCount !== 1 ? 's' : ''} today. Let's finish them!`;
    }

    if ((notes?.length ?? 0) === 0) {
      return "Create your first note to build your second brain.";
    }

    if ((reminders?.length ?? 0) === 0) {
      return "Never miss an important event. Set up your reminders!";
    }

    return "Ask me to set reminders, take notes, create goals, or plan your day!";
  }, [notes, reminders, goals, activeProjects]);

  const dynamicAiSuggestions = React.useMemo(() => {
    const suggestions = [];

    if (isStudent) {
      suggestions.push({ label: 'Exam roadmap 📚', prompt: 'Help me design an exam study roadmap and schedule.' });
    }

    if ((notes?.length ?? 0) === 0) {
      suggestions.push({ label: 'Write first note 📝', prompt: 'Create a note for my courses.' });
    } else {
      suggestions.push({ label: 'Summarize notes 🧠', prompt: 'Summarize my recent study notes and extract key concepts.' });
    }

    const activeGoalsCount = goals?.filter(g => !g.completed).length ?? 0;
    if (activeGoalsCount === 0) {
      suggestions.push({ label: 'Set daily goal 🎯', prompt: 'Suggest 3 focus goals for today to boost my productivity.' });
    } else {
      suggestions.push({ label: 'Check goals 🏆', prompt: 'List all my pending daily goals and suggest how to complete them.' });
    }

    if (activeProjectsCount === 0) {
      suggestions.push({ label: 'Start project 🚀', prompt: 'Guide me in starting a new project from scratch.' });
    } else if (nearestProjectWithDeadline) {
      if (nearestProjectWithDeadline.title.toLowerCase().trim() !== 'daa capstone') {
        suggestions.push({ 
          label: `${nearestProjectWithDeadline.title.slice(0, 15)}... 📅`, 
          prompt: `Help me break down my project "${nearestProjectWithDeadline.title}" into subtasks before the deadline.` 
        });
      } else {
        suggestions.push({ 
          label: 'Review notes 📝', 
          prompt: 'Suggest a revision and review schedule for my notes.' 
        });
      }
    }

    if (suggestions.length < 3) {
      suggestions.push({ label: 'Plan my day 🌅', prompt: 'Create a schedule for today covering work, rest, and learning.' });
    }

    return suggestions;
  }, [isStudent, notes, goals, activeProjectsCount, nearestProjectWithDeadline]);

  const ds = React.useMemo(() => styles(theme, isDark), [theme, isDark]);

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
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={ds.dateChip}>
                  <Text style={ds.dateChipText}>{todayStr}</Text>
                </View>
                <Text style={ds.greetingText} numberOfLines={1} adjustsFontSizeToFit>
                  Hello, {user?.full_name?.split(' ')[0] || 'Innovator'} 👋
                </Text>
                <Text style={ds.subGreetingText}>Today's productivity overview</Text>
              </View>
              <View style={ds.headerActions}>
                <TouchableOpacity style={ds.headerIconBtn} onPress={openThemePicker}>
                  <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[ds.headerIconBtn, { marginLeft: 10 }]}
                  onPress={() => router.push('/notifications')}
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

            {/* Goal Progress Circle */}
            <View style={ds.progressContainer}>
              <ExactProgressRing 
                completed={completedCount} 
                total={totalCount} 
                size={160} 
                textColor="#FFFFFF"
              />
            </View>

            {/* Smart Dashboard Insight Card */}
            <View style={ds.insightCard}>
              <Text style={ds.insightText}>{smartInsight.text}</Text>
            </View>

            {/* Today Snapshot Row */}
            <View style={ds.snapshotRow}>
              <View style={ds.snapshotItem}>
                <Text style={ds.snapshotEmoji}>📝</Text>
                <Text style={ds.snapshotLabel}>Notes: {notes?.length ?? 0}</Text>
              </View>
              <View style={ds.snapshotDivider} />
              <View style={ds.snapshotItem}>
                <Text style={ds.snapshotEmoji}>🎯</Text>
                <Text style={ds.snapshotLabel}>Goals: {completedCount}/{totalCount}</Text>
              </View>
              <View style={ds.snapshotDivider} />
              <View style={ds.snapshotItem}>
                <Text style={ds.snapshotEmoji}>⏰</Text>
                <Text style={ds.snapshotLabel}>Reminders: {pendingRemindersCount}</Text>
              </View>
              <View style={ds.snapshotDivider} />
              <View style={ds.snapshotItem}>
                <Text style={ds.snapshotEmoji}>🚀</Text>
                <Text style={ds.snapshotLabel}>Projects: {activeProjectsCount}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={ds.content}>
            
            {/* Overview Dashboard (Grid of 6 Cards) */}
            <View style={ds.overviewGrid}>
              <View style={ds.gridRow}>
                <TouchableOpacity 
                  style={[ds.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); router.push('/notes'); }}
                  activeOpacity={0.7}
                >
                  <View style={ds.gridCardHeader}>
                    <Text style={ds.gridCardEmoji}>📝</Text>
                    <Text style={[ds.gridCardTitle, { color: theme.textSecondary }]} numberOfLines={1}>Notes</Text>
                  </View>
                  <Text style={[ds.gridCardValue, { color: theme.text }]} numberOfLines={1}>{notes?.length ?? 0}</Text>
                  <Text style={[ds.gridCardSub, { color: colors.text.tertiary }]} numberOfLines={1}>Total Notes</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[ds.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); router.push('/calendar'); }}
                  activeOpacity={0.7}
                >
                  <View style={ds.gridCardHeader}>
                    <Text style={ds.gridCardEmoji}>📅</Text>
                    <Text style={[ds.gridCardTitle, { color: theme.textSecondary }]} numberOfLines={1}>Calendar</Text>
                  </View>
                  <Text style={[ds.gridCardValue, { color: theme.text }]} numberOfLines={1}>{todayEventsCount}</Text>
                  <Text style={[ds.gridCardSub, { color: colors.text.tertiary }]} numberOfLines={1}>{todayEventsCount === 1 ? 'Event Today' : 'Events Today'}</Text>
                </TouchableOpacity>
              </View>

              <View style={ds.gridRow}>
                <TouchableOpacity 
                  style={[ds.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); router.push('/goals'); }}
                  activeOpacity={0.7}
                >
                  <View style={ds.gridCardHeader}>
                    <Text style={ds.gridCardEmoji}>🎯</Text>
                    <Text style={[ds.gridCardTitle, { color: theme.textSecondary }]} numberOfLines={1}>Goals</Text>
                  </View>
                  <Text style={[ds.gridCardValue, { color: theme.text }]} numberOfLines={1}>{completedCount}/{totalCount}</Text>
                  <Text style={[ds.gridCardSub, { color: colors.text.tertiary }]} numberOfLines={1}>Completed</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[ds.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); router.push('/special_days'); }}
                  activeOpacity={0.7}
                >
                  <View style={ds.gridCardHeader}>
                    <Text style={ds.gridCardEmoji}>🎉</Text>
                    <Text style={[ds.gridCardTitle, { color: theme.textSecondary }]} numberOfLines={1}>Special Days</Text>
                  </View>
                  <Text style={[ds.gridCardValue, { color: theme.text }]} numberOfLines={1}>{upcomingSpecialDaysCount}</Text>
                  <Text style={[ds.gridCardSub, { color: colors.text.tertiary }]} numberOfLines={1}>{upcomingSpecialDaysCount === 1 ? 'Upcoming Day' : 'Upcoming Days'}</Text>
                </TouchableOpacity>
              </View>

              <View style={ds.gridRow}>
                <TouchableOpacity 
                  style={[ds.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); router.push({ pathname: '/goals', params: { tab: 'projects' } }); }}
                  activeOpacity={0.7}
                >
                  <View style={ds.gridCardHeader}>
                    <Text style={ds.gridCardEmoji}>🚀</Text>
                    <Text style={[ds.gridCardTitle, { color: theme.textSecondary }]} numberOfLines={1}>Projects</Text>
                  </View>
                  <Text style={[ds.gridCardValue, { color: theme.text }]} numberOfLines={1}>{activeProjectsCount}</Text>
                  <Text style={[ds.gridCardSub, { color: colors.text.tertiary }]} numberOfLines={1}>Active Projects</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[ds.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); router.push('/reminder/create'); }}
                  activeOpacity={0.7}
                >
                  <View style={ds.gridCardHeader}>
                    <Text style={ds.gridCardEmoji}>⏰</Text>
                    <Text style={[ds.gridCardTitle, { color: theme.textSecondary }]} numberOfLines={1}>Set Reminders</Text>
                  </View>
                  <Text style={[ds.gridCardValue, { color: theme.text }]} numberOfLines={1}>{pendingRemindersCount}</Text>
                  <Text style={[ds.gridCardSub, { color: colors.text.tertiary }]} numberOfLines={1}>Pending</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 3: Today's Goals */}
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
                <Ionicons name="medal-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={ds.emptyGoalText}>Start your productivity journey</Text>
                <TouchableOpacity style={ds.addGoalBtn} onPress={() => { triggerHaptic(); router.push('/goals'); }}>
                  <Text style={ds.addGoalBtnText}>Create Goal</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Section 4: Upcoming Reminders */}
            <SectionHeader title="Upcoming Reminders" actionLabel="View All" onAction={() => router.push('/calendar')} />
            {isLoadingReminders ? (
              <View style={ds.loadingContainer}><ActivityIndicator color={theme.primary} /></View>
            ) : reminders && reminders.length > 0 ? (
              <View>
                {reminders.filter((r: any) => r && r.is_deleted !== true).slice(0, 3).map((r) => {
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
              </View>
            ) : (
              <View style={ds.emptyGoalContainer}>
                <Ionicons name="alarm-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={ds.emptyGoalText}>No reminders scheduled</Text>
                <TouchableOpacity style={ds.addGoalBtn} onPress={() => { triggerHaptic(); router.push('/reminder/create'); }}>
                  <Text style={ds.addGoalBtnText}>Create Reminder</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Section 5: Special Days */}
            {todayImportantDays && todayImportantDays.length > 0 && (
              <>
                <SectionHeader 
                  title="🎉 Today's Special Days" 
                  actionLabel="View All" 
                  onAction={() => router.push('/special_days')} 
                />
                {isLoadingTodayImportantDays ? (
                  <View style={ds.loadingContainer}><ActivityIndicator color="#F59E0B" /></View>
                ) : (
                  <View>
                    {/* If there are special days today, show them */}
                    {todayImportantDays.map((b) => {
                      const iconInfo = getIconForType(b.type);
                      const hasDetails = !!(b.notes || b.gift_ideas || b.celebration_plans || b.message_draft);
                      return (
                        <TouchableOpacity 
                          key={b.id} 
                          style={ds.birthdayCard} 
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
                                  <Text style={{ fontSize: 9, color: isDark ? '#A78BFA' : '#7C3AED', fontWeight: '800' }}>Details</Text>
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
                  </View>
                )}
              </>
            )}

            {/* Section 5.5: Today's Notes */}
            {todayCalendarNotes && todayCalendarNotes.length > 0 && (
              <>
                <SectionHeader title="Today's Notes" actionLabel="View Calendar" onAction={() => router.push('/calendar')} />
                <View style={{ gap: 10 }}>
                  {todayCalendarNotes.map((item: any) => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[ds.recentNoteItem, { backgroundColor: theme.card, borderColor: theme.border }]} 
                      onPress={() => router.push(`/calendar_note/${item.id}`)}
                    >
                      <View style={[ds.noteTag, { backgroundColor: 'rgba(59,130,246,0.15)', marginBottom: 0 }]}>
                        <Text style={[ds.noteTagText, { color: '#3B82F6' }]}>Note</Text>
                      </View>
                      <Text style={[ds.recentNoteTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Section 6: Recent Notes */}
            <SectionHeader title="Recent Notes" actionLabel="See All" onAction={() => router.push('/notes')} />
            {recentNotes && recentNotes.length > 0 ? (
              <View style={{ gap: 10 }}>
                {recentNotes.slice(0, 3).map((item) => {
                  const isSecure = item.is_secure || item.category === 'Secure';
                  return (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[ds.recentNoteItem, { backgroundColor: theme.card, borderColor: theme.border }]} 
                      onPress={() => handleNotePress(item)}
                    >
                      <View style={[ds.noteTag, { backgroundColor: isSecure ? 'rgba(124,77,255,0.15)' : (isDark ? '#1C2A3E' : '#F5F3FF'), marginBottom: 0 }]}>
                        <Text style={[ds.noteTagText, { color: isSecure ? '#C4B5FD' : theme.primary }]}>{item.category}</Text>
                      </View>
                      <Text style={[ds.recentNoteTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[ds.recentNoteDate, { color: colors.text.tertiary }]}>{new Date(item.updated_at).toLocaleDateString()}</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={ds.emptyGoalContainer}>
                <Ionicons name="book-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={ds.emptyGoalText}>Capture your first idea</Text>
                <TouchableOpacity style={ds.addGoalBtn} onPress={() => { triggerHaptic(); router.push('/notes'); }}>
                  <Text style={ds.addGoalBtnText}>Create Note</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Section 7: Projects */}
            <SectionHeader title="Active Projects & Long-Term Goals" actionLabel="View All" onAction={() => router.push('/goals')} />
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
                <Ionicons name="rocket-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={ds.emptyGoalText}>Start your first project</Text>
                <TouchableOpacity 
                  style={ds.addGoalBtn} 
                  onPress={() => { triggerHaptic(); router.push({ pathname: '/goals', params: { tab: 'projects', openAddProject: 'true' } }); }}
                >
                  <Text style={ds.addGoalBtnText}>Start Project</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Study Focus Card for Students (at bottom) */}
            {isStudent && (
              <Animated.View entering={getFadeInDown(250, 500)} style={[ds.studyFocusCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 15 }]}>
                <View style={ds.studyFocusHeader}>
                  <Text style={ds.studyFocusIcon}>📚</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[ds.studyFocusTitle, { color: theme.text }]}>Study Focus</Text>
                    <Text style={[ds.studyFocusSubtitle, { color: theme.textSecondary }]}>Continue your learning journey today.</Text>
                  </View>
                </View>
                
                <View style={[ds.studyFocusDivider, { backgroundColor: theme.border }]} />
                
                <Text style={[ds.suggestedActionsTitle, { color: theme.textSecondary }]}>Suggested actions:</Text>
                
                <View style={ds.suggestedActionsList}>
                  <TouchableOpacity 
                    style={[ds.suggestedActionItem, { backgroundColor: isDark ? 'rgba(124, 77, 255, 0.12)' : '#F3E8FF', borderColor: isDark ? 'rgba(124, 77, 255, 0.25)' : '#D8B4FE' }]}
                    onPress={() => router.push('/note/create')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-text-outline" size={14} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={[ds.suggestedActionText, { color: theme.primary }]}>Create study notes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[ds.suggestedActionItem, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.12)' : '#FFE4E6', borderColor: isDark ? 'rgba(244, 63, 94, 0.25)' : '#FECDD3' }]}
                    onPress={() => router.push('/reminder/create')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="alarm-outline" size={14} color="#F43F5E" style={{ marginRight: 8 }} />
                    <Text style={[ds.suggestedActionText, { color: '#F43F5E' }]}>Set exam reminder</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[ds.suggestedActionItem, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : '#E0F2FE', borderColor: isDark ? 'rgba(14, 165, 233, 0.25)' : '#BAE6FD' }]}
                    onPress={() => router.push({ pathname: '/ai', params: { initialPrompt: 'Build a learning roadmap for my academic studies.' } })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="map-outline" size={14} color="#0EA5E9" style={{ marginRight: 8 }} />
                    <Text style={[ds.suggestedActionText, { color: '#0EA5E9' }]}>Build learning roadmap</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* AI Assistant Mascot & Chips (at bottom) */}
            <Animated.View entering={getFadeInDown(300, 500)} style={[ds.aiWidgetCard, { borderColor: theme.border, marginTop: 15 }]}>
              <LinearGradient
                colors={isDark ? ['#1A103C', '#0A061C'] : ['#F3E8FF', '#E9D5FF']}
                style={ds.aiWidgetGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={ds.aiWidgetHeader}>
                  <Animated.View style={[ds.aiMascotContainer, floatingMascotStyle]}>
                    <Text style={ds.aiMascotEmoji}>🤖</Text>
                  </Animated.View>
                  <View style={ds.aiWidgetHeaderText}>
                    <Text style={[ds.aiWidgetTitle, { color: theme.text }]}>KnoVault Intelligence</Text>
                    <Text style={[ds.aiWidgetSubtitle, { color: theme.textSecondary }]}>
                      {aiCardSubtitle}
                    </Text>
                  </View>
                </View>

                <Text style={[ds.aiSuggestionsTitle, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}>Suggestions</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={ds.aiSuggestionsScroll}
                >
                  {dynamicAiSuggestions.map((chip, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        ds.aiSuggestionChip,
                        {
                          backgroundColor: isDark ? 'rgba(124, 77, 255, 0.15)' : '#FFFFFF',
                          borderColor: isDark ? 'rgba(124, 77, 255, 0.3)' : 'rgba(124, 77, 255, 0.2)',
                        }
                      ]}
                      onPress={() => {
                        router.push({
                          pathname: '/ai',
                          params: { initialPrompt: chip.prompt }
                        });
                      }}
                    >
                      <Text style={[ds.aiSuggestionText, { color: isDark ? '#E9D5FF' : '#6B21A8' }]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </LinearGradient>
            </Animated.View>
            
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

        {/* Floating Action Button (FAB) */}
        <TouchableOpacity 
          style={ds.fabButton}
          activeOpacity={0.8}
          onPress={() => { triggerHaptic(); setShowFabSheet(true); }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Quick Access FAB Bottom Sheet */}
        <Modal
          visible={showFabSheet}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFabSheet(false)}
        >
          <Pressable 
            style={ds.modalOverlay} 
            onPress={() => setShowFabSheet(false)}
          >
            <View style={ds.bottomSheetContainer}>
              <View style={ds.bottomSheetHeader}>
                <Text style={ds.bottomSheetTitle}>Quick Actions</Text>
                <TouchableOpacity onPress={() => setShowFabSheet(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              
              <View style={ds.bottomSheetContent}>
                <TouchableOpacity 
                  style={ds.bottomSheetItem} 
                  onPress={() => {
                    setShowFabSheet(false);
                    triggerHaptic();
                    router.push('/notes');
                  }}
                >
                  <View style={[ds.bottomSheetIconContainer, { backgroundColor: '#8B5CF615' }]}>
                    <Ionicons name="document-text-outline" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={ds.bottomSheetItemText}>New Note</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={ds.bottomSheetItem} 
                  onPress={() => {
                    setShowFabSheet(false);
                    triggerHaptic();
                    router.push('/goals');
                  }}
                >
                  <View style={[ds.bottomSheetIconContainer, { backgroundColor: '#3B82F615' }]}>
                    <Ionicons name="medal-outline" size={20} color="#3B82F6" />
                  </View>
                  <Text style={ds.bottomSheetItemText}>New Goal</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={ds.bottomSheetItem} 
                  onPress={() => {
                    setShowFabSheet(false);
                    triggerHaptic();
                    router.push('/reminder/create');
                  }}
                >
                  <View style={[ds.bottomSheetIconContainer, { backgroundColor: '#10B98115' }]}>
                    <Ionicons name="alarm-outline" size={20} color="#10B981" />
                  </View>
                  <Text style={ds.bottomSheetItemText}>New Reminder</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={ds.bottomSheetItem} 
                  onPress={() => {
                    setShowFabSheet(false);
                    triggerHaptic();
                    router.push({ pathname: '/goals', params: { tab: 'projects', openAddProject: 'true' } });
                  }}
                >
                  <View style={[ds.bottomSheetIconContainer, { backgroundColor: '#F59E0B15' }]}>
                    <Ionicons name="rocket-outline" size={20} color="#F59E0B" />
                  </View>
                  <Text style={ds.bottomSheetItemText}>New Project</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </SwipeWrapper>
  );
}

function getReminderColor(type: string) {
  switch (type?.toLowerCase()) {
    case 'meeting': return '#10B981';
    case 'assignment': return '#0EA5E9';
    case 'event': return '#8B5CF6';
    case 'birthday': return '#F59E0B';
    case 'medicine': return '#10B981';
    case 'custom': return '#F59E0B';
    default: return '#6C63FF';
  }
}

function getIconForType(type: string) {
  const t = type?.toLowerCase() || '';
  if (t.includes('birthday')) return { name: 'gift-outline', color: '#F59E0B', bg: '#FEF3C7' };
  if (t.includes('wedding') || t.includes('anniversary')) return { name: 'heart-outline', color: '#EC4899', bg: '#FCE7F3' };
  if (t.includes('engagement')) return { name: 'ribbon-outline', color: '#3B82F6', bg: '#DBEAFE' };
  if (t.includes('festival')) return { name: 'sparkles-outline', color: '#D97706', bg: '#FEF3C7' };
  if (t.includes('meeting')) return { name: 'people-outline', color: '#10B981', bg: '#D1FAE5' };
  if (t.includes('achievement')) return { name: 'trophy-outline', color: '#8B5CF6', bg: '#EDE9FE' };
  if (t.includes('memory') || t.includes('personal memory')) return { name: 'camera-outline', color: '#6366F1', bg: '#EEF2FF' };
  return { name: 'star-outline', color: '#64748B', bg: '#F1F5F9' };
}

function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return '#EF4444';
    case 'medium':
      return '#F59E0B';
    case 'low':
      return '#10B981';
    default:
      return '#6C63FF';
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
    paddingBottom: 40, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40,
    ...getThemedShadow(theme, 'medium'),
    borderWidth: isDark ? 1 : 0,
    borderColor: theme.border,
  },
  subGreetingText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
    marginBottom: 10,
  },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  headerProgressCol: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    paddingLeft: 10,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statBadgeEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  statBadgeLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  statBadgeValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  quickActionsContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  quickActionsGrid: {
    marginTop: 10,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  actionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 9,
    color: theme.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  checklistCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.2,
    marginBottom: 20,
    ...getThemedShadow(theme, 'soft'),
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  checklistSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  checklistBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checklistBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  checklistProgressBarContainer: {
    marginBottom: 14,
  },
  checklistProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  checklistProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  checklistItemsContainer: {
    gap: 8,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checklistCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistItemLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  checklistCompletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#D1FAE5',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },
  checklistCompletedEmoji: {
    fontSize: 22,
  },
  checklistCompletedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  checklistCompletedDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#A7F3D0' : '#065F46',
    marginTop: 1,
  },
  aiWidgetCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.2,
    marginBottom: 20,
    ...getThemedShadow(theme, 'medium'),
  },
  aiWidgetGradient: {
    padding: 18,
  },
  aiWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiMascotContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF625',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF640',
  },
  aiMascotEmoji: {
    fontSize: 24,
  },
  aiWidgetHeaderText: {
    flex: 1,
  },
  aiWidgetTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  aiWidgetSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 15,
  },
  aiSuggestionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  aiSuggestionsScroll: {
    gap: 8,
    paddingRight: 10,
  },
  aiSuggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiSuggestionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  premiumEmptyCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    marginBottom: 20,
    ...getThemedShadow(theme, 'soft'),
  },
  premiumEmptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  premiumEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  premiumEmptySubtitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  premiumEmptyBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    ...getThemedShadow(theme, 'soft'),
  },
  premiumEmptyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  studyFocusCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    ...getThemedShadow(theme, 'soft'),
  },
  studyFocusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studyFocusIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  studyFocusTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  studyFocusSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  studyFocusDivider: {
    height: 1,
    marginVertical: 12,
  },
  suggestedActionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  suggestedActionsList: {
    gap: 8,
  },
  suggestedActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  suggestedActionText: {
    fontSize: 12,
    fontWeight: '700',
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
  gridRow: { flexDirection: 'row', gap: 12 },
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
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyGoalText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  addGoalBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addGoalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
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
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  snapshotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  snapshotEmoji: {
    fontSize: 12,
  },
  snapshotLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  snapshotDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  overviewGrid: {
    marginBottom: 20,
    gap: 12,
  },
  gridCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  gridCardEmoji: {
    fontSize: 14,
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridCardValue: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 2,
  },
  gridCardSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  recentNoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.2,
    gap: 10,
    marginBottom: 10,
  },
  recentNoteTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  recentNoteDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  insightCard: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  insightText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  fabButton: {
    position: 'absolute',
    bottom: 110,
    right: 25,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  bottomSheetContent: {
    gap: 16,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: theme.border,
  },
  bottomSheetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bottomSheetItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
});
