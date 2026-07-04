import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store/settingsStore';
import { getThemedShadow } from './ThemedComponents';
import { typography, spacing, borderRadius } from '../theme';
import { ProjectTask, SubTask } from '../types/projects';
import { ProjectSubtasks } from './ProjectSubtasks';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ProjectItemProps {
  project: ProjectTask;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({ project, onUpdate, onDelete }) => {
  const { colors, theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project.title);
  const [editedDesc, setEditedDesc] = useState(project.description || '');
  const { animationsEnabled } = useSettingsStore();

  const progressAnim = useSharedValue(project.progress / 100);

  useEffect(() => {
    progressAnim.value = animationsEnabled ? withTiming(project.progress / 100, { duration: 300 }) : project.progress / 100;
  }, [project.progress, animationsEnabled]);

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
      // console.log('[Haptics Not Supported]', e);
    }
  };

  const toggleExpand = () => {
    if (animationsEnabled) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsExpanded(!isExpanded);
  };

  const handleSaveInfo = () => {
    if (editedTitle.trim()) {
      onUpdate(project.id, { title: editedTitle.trim(), description: editedDesc.trim() });
      setIsEditingTitle(false);
    }
  };

  const handleStatusChange = (status: string) => {
    onUpdate(project.id, { status });
    safeHaptic('medium');
  };

  const handlePriorityChange = (priority: string) => {
    onUpdate(project.id, { priority });
    safeHaptic('medium');
  };

  const getPriorityColor = (prio: string) => {
    switch (prio.toLowerCase()) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return theme.primary;
    }
  };

  const getStatusColor = (statusVal: string) => {
    switch (statusVal.toLowerCase()) {
      case 'completed':
        return '#10B981';
      case 'review':
        return '#8B5CF6';
      case 'in progress':
        return '#3B82F6';
      default:
        return isDark ? '#64748B' : '#94A3B8';
    }
  };

  const progressBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressAnim.value * 100}%`,
    };
  });

  const formattedDate = project.deadline
    ? new Date(project.deadline).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          ...getThemedShadow(theme, 'soft'),
        },
      ]}
    >
      {/* ── HEADER (Visible Collapsed & Expanded) ── */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {isEditingTitle ? (
            <TextInput
              style={[styles.titleInput, { color: theme.text }]}
              value={editedTitle}
              onChangeText={setEditedTitle}
              onBlur={handleSaveInfo}
              autoFocus
              onSubmitEditing={handleSaveInfo}
            />
          ) : (
            <Text
              style={[
                styles.title,
                { color: theme.text },
                project.completed && styles.completedText,
              ]}
              onLongPress={() => setIsEditingTitle(true)}
            >
              {project.title}
            </Text>
          )}

          {/* Priority & Status Row */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(project.priority) + '15' },
              ]}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor(project.priority) },
                ]}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: getPriorityColor(project.priority) },
                ]}
              >
                {project.priority}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(project.status) + '15' },
              ]}
            >
              <Text
                style={[styles.badgeText, { color: getStatusColor(project.status) }]}
              >
                {project.status}
              </Text>
            </View>

            {formattedDate && (
              <View style={styles.dateBadge}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={isDark ? '#94A3B8' : '#64748B'}
                />
                <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                  {formattedDate}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={isDark ? '#64748B' : '#94A3B8'}
        />
      </TouchableOpacity>

      {/* ── PROGRESS BAR ── */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: theme.primary },
              progressBarAnimatedStyle,
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
          {project.progress}%
        </Text>
      </View>

      {/* ── EXPANDED DETAILS ── */}
      {isExpanded && (
        <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
          {/* Description */}
          <View style={styles.descSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.descInput,
                {
                  color: theme.text,
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
              placeholder="Add a detailed description..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={editedDesc}
              onChangeText={setEditedDesc}
              onBlur={handleSaveInfo}
              multiline
            />
          </View>

          {/* Subtasks */}
          <ProjectSubtasks
            subtasks={project.subtasks || []}
            onChange={(updatedSubtasks) => {
              onUpdate(project.id, { subtasks: updatedSubtasks });
            }}
          />

          {/* Project Control Selectors */}
          <View style={styles.controlRow}>
            {/* Status Selector */}
            <View style={styles.controlItem}>
              <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>
                Status
              </Text>
              <View style={styles.chipList}>
                {['Pending', 'In Progress', 'Review', 'Completed'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.controlChip,
                      { borderColor: theme.border },
                      project.status === s && {
                        backgroundColor: getStatusColor(s) + '20',
                        borderColor: getStatusColor(s),
                      },
                    ]}
                    onPress={() => handleStatusChange(s)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.textSecondary },
                        project.status === s && { color: getStatusColor(s), fontWeight: '700' },
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority Selector */}
            <View style={[styles.controlItem, { marginTop: 12 }]}>
              <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>
                Priority
              </Text>
              <View style={styles.chipList}>
                {['Low', 'Medium', 'High'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.controlChip,
                      { borderColor: theme.border },
                      project.priority === p && {
                        backgroundColor: getPriorityColor(p) + '20',
                        borderColor: getPriorityColor(p),
                      },
                    ]}
                    onPress={() => handlePriorityChange(p)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.textSecondary },
                        project.priority === p && { color: getPriorityColor(p), fontWeight: '700' },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Delete Project Button */}
          <TouchableOpacity
            style={styles.deleteProjectBtn}
            onPress={() => onDelete(project.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteProjectText}>Delete Project</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    ...typography.bodyLarge,
    fontWeight: '800',
    marginBottom: 6,
  },
  titleInput: {
    ...typography.bodyLarge,
    fontWeight: '800',
    marginBottom: 6,
    padding: 0,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  descSection: {
    marginBottom: spacing.md,
  },
  descInput: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    height: 64,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  subtasksSection: {
    marginBottom: spacing.md,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  subtaskCheck: {
    marginRight: spacing.sm,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  subtaskDelete: {
    padding: 6,
  },
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingLeft: spacing.sm,
    paddingRight: 4,
    height: 40,
    marginTop: spacing.xs,
  },
  addSubtaskInput: {
    flex: 1,
    fontSize: 13,
  },
  addSubtaskBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlRow: {
    marginBottom: spacing.md,
  },
  controlItem: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  controlChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.2,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteProjectText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
