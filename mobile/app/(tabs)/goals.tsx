import React, { useState, useEffect } from 'react';
import SwipeWrapper from '../../src/components/SwipeWrapper';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { goalsApi } from '../../src/api/goals';
import { projectsApi } from '../../src/api/projects';
import { GoalItem } from '../../src/components/GoalItem';
import { ProjectItem } from '../../src/components/ProjectItem';
import { ExactProgressRing } from '../../src/components/ExactProgressRing';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeOut, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import { typography, spacing, borderRadius } from '../../src/theme';
import type { ProjectTaskCreate, ProjectTaskUpdate } from '../../src/types/projects';

export default function GoalsScreen() {
  const queryClient = useQueryClient();
  const { colors, theme, isDark } = useTheme();

  const safeHaptic = async (type: 'success' | 'light' | 'medium') => {
    try {
      if (type === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'light') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (type === 'medium') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {
      console.log('[Haptics Not Supported]', e);
    }
  };

  const [activeTab, setActiveTab] = useState<'daily' | 'projects'>('daily');
  const params = useLocalSearchParams<{ tab?: string; openAddProject?: string }>();
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (params.tab === 'projects') {
      setActiveTab('projects');
    } else {
      setActiveTab('daily');
    }
    if (params.openAddProject === 'true') {
      setActiveTab('projects');
      setShowAddProjectForm(true);
    }
  }, [params.tab, params.openAddProject]);

  const indicatorPosition = useSharedValue(0);

  useEffect(() => {
    indicatorPosition.value = withSpring(activeTab === 'daily' ? 0 : 1, {
      damping: 18,
      stiffness: 120,
    });
  }, [activeTab]);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = containerWidth / 2 - 4; // subtracting padding
    const translation = activeTab === 'daily' ? 0 : tabWidth;
    return {
      width: tabWidth || '50%',
      transform: [
        {
          translateX: translation
        }
      ]
    };
  }, [activeTab, containerWidth]);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  // Add Project States
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectPriority, setNewProjectPriority] = useState<string>('Medium');
  const [newProjectDeadlineDays, setNewProjectDeadlineDays] = useState<number | null>(null); // null = No Deadline, 1 = Tomorrow, 3 = 3 days, 7 = 1 week
  const [showAddProjectForm, setShowAddProjectForm] = useState(false);

  // Check if a new day has started on mount
  useEffect(() => {
    const checkNewDay = async () => {
      try {
        const lastDate = await SecureStore.getItemAsync('last_open_date');
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastDate !== todayStr) {
          setShowResetModal(true);
        }
      } catch (e) {
        console.error('Error checking new day:', e);
      }
    };
    checkNewDay();
  }, []);

  const handleStartFresh = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await SecureStore.setItemAsync('last_open_date', todayStr);
      setShowResetModal(false);
      safeHaptic('success');
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
    } catch (e) {
      console.error('Error starting fresh:', e);
    }
  };

  // ── DAILY GOALS QUERIES & MUTATIONS ──
  const {
    data: goals,
    isLoading: isGoalsLoading,
    isRefetching: isGoalsRefetching,
    refetch: refetchGoals,
  } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.getGoals(),
  });

  const { data: stats } = useQuery({
    queryKey: ['goalStats'],
    queryFn: () => goalsApi.getGoalStats(),
  });

  const addGoalMutation = useMutation({
    mutationFn: (title: string) => goalsApi.createGoal({ title }),
    onMutate: async (newTitle) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const previousGoals = queryClient.getQueryData(['goals']);
      
      const tempGoal = { 
        id: Date.now(), 
        title: newTitle, 
        completed: false, 
        goal_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        user_id: 0
      };
      queryClient.setQueryData(['goals'], (old: any) => [tempGoal, ...(old || [])]);
      
      return { previousGoals };
    },
    onSuccess: () => {
      setNewGoalTitle('');
      safeHaptic('medium');
    },
    onError: (err, title, context) => {
      console.error('Add goal failed:', err);
      if (context?.previousGoals) queryClient.setQueryData(['goals'], context.previousGoals);
      Alert.alert('Error', 'Failed to add goal');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
    }
  });

  const handleAddGoal = () => {
    if (newGoalTitle.trim()) {
      addGoalMutation.mutate(newGoalTitle.trim());
    }
  };

  const toggleGoalMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => goalsApi.updateGoal(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      await queryClient.cancelQueries({ queryKey: ['goalStats'] });
      const previousGoals = queryClient.getQueryData(['goals']);
      const previousStats = queryClient.getQueryData(['goalStats']);

      queryClient.setQueryData(['goals'], (old: any) => 
        old?.map((g: any) => g.id === id ? { ...g, completed } : g)
      );

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
    onError: (err, vars, context) => {
      if (context?.previousGoals) queryClient.setQueryData(['goals'], context.previousGoals);
      if (context?.previousStats) queryClient.setQueryData(['goalStats'], context.previousStats);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: number) => goalsApi.deleteGoal(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const previousGoals = queryClient.getQueryData(['goals']);
      queryClient.setQueryData(['goals'], (old: any) => old?.filter((g: any) => g.id !== id));
      return { previousGoals };
    },
    onError: (err, id, context) => {
      if (context?.previousGoals) queryClient.setQueryData(['goals'], context.previousGoals);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
    }
  });

  const editGoalMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => goalsApi.updateGoal(id, { title }),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const previousGoals = queryClient.getQueryData(['goals']);
      queryClient.setQueryData(['goals'], (old: any) => 
        old?.map((g: any) => g.id === id ? { ...g, title } : g)
      );
      return { previousGoals };
    },
    onError: (err, vars, context) => {
      if (context?.previousGoals) queryClient.setQueryData(['goals'], context.previousGoals);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  // ── PROJECTS QUERIES & MUTATIONS ──
  const {
    data: projects,
    isLoading: isProjectsLoading,
    isRefetching: isProjectsRefetching,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getProjects(),
  });

  const addProjectMutation = useMutation({
    mutationFn: (data: ProjectTaskCreate) => projectsApi.createProject(data),
    onSuccess: () => {
      setNewProjectTitle('');
      setNewProjectDesc('');
      setNewProjectPriority('Medium');
      setNewProjectDeadlineDays(null);
      setShowAddProjectForm(false);
      safeHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      console.error('Add project failed:', err);
      Alert.alert('Error', 'Failed to create project');
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectTaskUpdate }) => projectsApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      console.error('Update project failed:', err);
      Alert.alert('Error', 'Failed to update project');
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => projectsApi.deleteProject(id),
    onSuccess: () => {
      safeHaptic('medium');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      console.error('Delete project failed:', err);
      Alert.alert('Error', 'Failed to delete project');
    }
  });

  const handleAddProject = () => {
    if (!newProjectTitle.trim()) {
      Alert.alert('Validation Error', 'Project title is required');
      return;
    }

    let deadlineIso: string | null = null;
    if (newProjectDeadlineDays !== null) {
      const d = new Date();
      d.setDate(d.getDate() + newProjectDeadlineDays);
      deadlineIso = d.toISOString();
    }

    addProjectMutation.mutate({
      title: newProjectTitle.trim(),
      description: newProjectDesc.trim() || null,
      priority: newProjectPriority,
      status: 'Pending',
      progress: 0,
      deadline: deadlineIso,
      subtasks: [],
    });
  };

  const handleRefresh = () => {
    if (activeTab === 'daily') {
      refetchGoals();
    } else {
      refetchProjects();
    }
  };

  const completedCount = goals?.filter(g => g.completed).length || 0;
  const totalCount = goals?.length || 0;
  const activeProjectsCount = projects?.filter(p => !p.completed).length || 0;

  return (
    <SwipeWrapper currentTab="goals">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={activeTab === 'daily' ? isGoalsRefetching : isProjectsRefetching} 
              onRefresh={handleRefresh} 
              tintColor={theme.primary} 
            />
          }
        >
          {/* ── Segmented Tab Switcher ───────────────────────── */}
          <View 
            style={[styles.tabContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            {containerWidth > 0 && (
              <Animated.View style={[
                styles.slidingIndicator, 
                { backgroundColor: theme.primary },
                indicatorStyle
              ]} />
            )}

            <TouchableOpacity
              style={styles.tabButton}
              onPress={async () => {
                await safeHaptic('light');
                setActiveTab('daily');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'daily' ? '#FFFFFF' : theme.textSecondary }
                ]}
              >
                Daily Goals
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.tabButton}
              onPress={async () => {
                await safeHaptic('light');
                setActiveTab('projects');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'projects' ? '#FFFFFF' : theme.textSecondary }
                ]}
              >
                Projects
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'daily' ? (
            // ── DAILY GOALS VIEW ──────────────────────────────
            <View>
              {/* Top Progress Card */}
              <Animated.View entering={FadeInDown.delay(100)} style={styles.topCardContainer}>
                <LinearGradient
                  colors={colors.gradient.primary}
                  style={[styles.topCard, getThemedShadow(theme, 'medium')]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.topCardHeader}>
                    <View>
                      <Text style={styles.topCardTitle}>Daily Goals</Text>
                      <Text style={styles.topCardSubtitle}>Track your daily achievements</Text>
                    </View>
                    <View style={styles.streakBadge}>
                      <Ionicons name="flame" size={16} color={colors.accent.amber} />
                      <Text style={styles.streakText}>{stats?.streak || 0} Days</Text>
                    </View>
                  </View>

                  <View style={styles.progressRow}>
                    <ExactProgressRing 
                      completed={completedCount} 
                      total={totalCount} 
                      size={140} 
                      textColor="#FFFFFF"
                    />
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{completedCount}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalCount}</Text>
                        <Text style={styles.statLabel}>Total Tasks</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Add Goal Field */}
              <View style={styles.inputArea}>
                <View style={[
                  styles.inputContainer, 
                  { 
                    backgroundColor: theme.card, 
                    borderColor: theme.border,
                    ...getThemedShadow(theme, 'soft')
                  }
                ]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Add a new daily goal..."
                    placeholderTextColor={colors.text.tertiary}
                    value={newGoalTitle}
                    onChangeText={setNewGoalTitle}
                    onSubmitEditing={handleAddGoal}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.addBtn, 
                      { backgroundColor: theme.primary },
                      !newGoalTitle.trim() && { backgroundColor: theme.border }
                    ]} 
                    onPress={handleAddGoal}
                    disabled={!newGoalTitle.trim() || addGoalMutation.isPending}
                  >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Goals Checklist Items */}
              <View style={styles.listArea}>
                {isGoalsLoading ? (
                  <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
                ) : goals && goals.length > 0 ? (
                  goals.map((goal) => (
                    <GoalItem
                      key={goal.id}
                      goal={goal}
                      onToggle={(id, completed) => toggleGoalMutation.mutate({ id, completed })}
                      onDelete={(id) => deleteGoalMutation.mutate(id)}
                      onEdit={(id, title) => editGoalMutation.mutate({ id, title })}
                    />
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Plan your day 🌅
                  </Text>
                )}
              </View>
            </View>
          ) : (
            // ── PROJECTS VIEW ─────────────────────────────────
            <View>
              {/* Projects Overview Card */}
              <Animated.View entering={FadeInDown.delay(100)} style={styles.topCardContainer}>
                <LinearGradient
                  colors={isDark ? ['#1e1b4b', '#311042'] : ['#8B5CF6', '#C084FC']}
                  style={[styles.topCard, getThemedShadow(theme, 'medium')]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.topCardHeader}>
                    <View>
                      <Text style={styles.topCardTitle}>Active Projects</Text>
                      <Text style={styles.topCardSubtitle}>Track your long-term roadmap</Text>
                    </View>
                    <View style={[styles.streakBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                      <Ionicons name="rocket-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.streakText}>{activeProjectsCount} Active</Text>
                    </View>
                  </View>

                  <View style={styles.progressRow}>
                    <View style={styles.projectStatsBox}>
                      <Text style={styles.projectStatValue}>{projects?.length || 0}</Text>
                      <Text style={styles.projectStatLabel}>Total Projects</Text>
                    </View>
                    <View style={styles.projectStatsBox}>
                      <Text style={styles.projectStatValue}>
                        {projects?.filter(p => p.completed).length || 0}
                      </Text>
                      <Text style={styles.projectStatLabel}>Completed</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Add Project Toggle & Form */}
              <View style={styles.inputArea}>
                {!showAddProjectForm ? (
                  <TouchableOpacity
                    style={[
                      styles.addProjectToggleBtn,
                      { backgroundColor: theme.card, borderColor: theme.border, ...getThemedShadow(theme, 'soft') },
                    ]}
                    onPress={() => setShowAddProjectForm(true)}
                  >
                    <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
                    <Text style={[styles.addProjectToggleText, { color: theme.primary }]}>
                      Create New Project
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Animated.View
                    entering={FadeInUp.duration(200)}
                    style={[
                      styles.projectFormContainer,
                      { backgroundColor: theme.card, borderColor: theme.border, ...getThemedShadow(theme, 'medium') },
                    ]}
                  >
                    <View style={styles.formHeader}>
                      <Text style={[styles.formTitle, { color: theme.text }]}>New Project</Text>
                      <TouchableOpacity onPress={() => setShowAddProjectForm(false)}>
                        <Ionicons name="close" size={22} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={[styles.formInput, { color: theme.text, borderColor: theme.border }]}
                      placeholder="Project Title"
                      placeholderTextColor={colors.text.tertiary}
                      value={newProjectTitle}
                      onChangeText={setNewProjectTitle}
                    />

                    <TextInput
                      style={[
                        styles.formInput,
                        styles.formTextArea,
                        { color: theme.text, borderColor: theme.border },
                      ]}
                      placeholder="Description (Optional)"
                      placeholderTextColor={colors.text.tertiary}
                      value={newProjectDesc}
                      onChangeText={setNewProjectDesc}
                      multiline
                      numberOfLines={3}
                    />

                    {/* Priority Selector */}
                    <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Priority</Text>
                    <View style={styles.prioRow}>
                      {['Low', 'Medium', 'High'].map((prio) => (
                        <TouchableOpacity
                          key={prio}
                          style={[
                            styles.prioBtn,
                            { borderColor: theme.border },
                            newProjectPriority === prio && {
                              backgroundColor: theme.primary + '15',
                              borderColor: theme.primary,
                            },
                          ]}
                          onPress={() => setNewProjectPriority(prio)}
                        >
                          <Text
                            style={[
                              styles.prioBtnText,
                              { color: theme.textSecondary },
                              newProjectPriority === prio && { color: theme.primary, fontWeight: '700' },
                            ]}
                          >
                            {prio}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Deadline Quick Select */}
                    <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Deadline</Text>
                    <View style={styles.prioRow}>
                      {[
                        { label: 'None', val: null },
                        { label: 'Tomorrow', val: 1 },
                        { label: '3 Days', val: 3 },
                        { label: '1 Week', val: 7 },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.label}
                          style={[
                            styles.prioBtn,
                            { borderColor: theme.border },
                            newProjectDeadlineDays === item.val && {
                              backgroundColor: theme.primary + '15',
                              borderColor: theme.primary,
                            },
                          ]}
                          onPress={() => setNewProjectDeadlineDays(item.val)}
                        >
                          <Text
                            style={[
                              styles.prioBtnText,
                              { color: theme.textSecondary },
                              newProjectDeadlineDays === item.val && { color: theme.primary, fontWeight: '700' },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[styles.submitProjectBtn, { backgroundColor: theme.primary }]}
                      onPress={handleAddProject}
                      disabled={addProjectMutation.isPending}
                    >
                      <Text style={styles.submitProjectBtnText}>Create Project</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>

              {/* Projects List */}
              <View style={styles.listArea}>
                {isProjectsLoading ? (
                  <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
                ) : projects && projects.length > 0 ? (
                  projects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      onUpdate={(id, data) => updateProjectMutation.mutate({ id, data })}
                      onDelete={(id) => deleteProjectMutation.mutate(id)}
                    />
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Start your first long-term project 🚀
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── MORNING RESET MODAL ── */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeInDown.delay(100)}
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border, ...getThemedShadow(theme, 'medium') },
            ]}
          >
            <Text style={styles.modalEmoji}>🌅</Text>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Day Started</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              "Let's crush today's goals!"
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={handleStartFresh}
            >
              <Text style={styles.modalButtonText}>Start Fresh</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 25,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1.2,
    position: 'relative',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  topCardContainer: {
    padding: 25,
  },
  topCard: {
    borderRadius: 35,
    padding: 25,
  },
  topCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  topCardTitle: {
    ...typography.titleLarge,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  topCardSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  streakText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsContainer: {
    flex: 1,
    marginLeft: 20,
    gap: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.titleLarge,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: '60%',
    alignSelf: 'center',
  },
  projectStatsBox: {
    flex: 1,
    alignItems: 'center',
  },
  projectStatValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  projectStatLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
  },
  inputArea: {
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingLeft: 20,
    paddingRight: 6,
    height: 58,
    borderWidth: 1.2,
  },
  input: {
    flex: 1,
    ...typography.bodyLarge,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addProjectToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 8,
  },
  addProjectToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  projectFormContainer: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
    fontSize: 14,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  prioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  prioBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prioBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitProjectBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitProjectBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  listArea: {
    paddingHorizontal: 25,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 40,
  },
  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    padding: 30,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
