import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  interpolate,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius } from '../theme';
import { Goal } from '../types/goals';
import { useSettingsStore } from '../store/settingsStore';
import { getThemedShadow } from './ThemedComponents';

interface GoalItemProps {
  goal: Goal;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, title: string) => void;
}

export const GoalItem: React.FC<GoalItemProps> = ({ goal, onToggle, onDelete, onEdit }) => {
  const { colors, theme, isDark } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(goal.title);

  const progress = useSharedValue(goal.completed ? 1 : 0);
  const checkboxScale = useSharedValue(1);
  const { animationsEnabled } = useSettingsStore();

  useEffect(() => {
    progress.value = animationsEnabled ? withTiming(goal.completed ? 1 : 0, { duration: 250 }) : (goal.completed ? 1 : 0);
  }, [goal.completed, animationsEnabled]);

  const triggerHaptic = async (isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      // console.log('[Haptics not supported/enabled]', e);
    }
  };

  const handleToggle = () => {
    const nextCompleted = !goal.completed;
    checkboxScale.value = animationsEnabled ? withSequence(
      withTiming(0.85, { duration: 100 }),
      withTiming(1.1, { duration: 100 }),
      withTiming(1, { duration: 100 })
    ) : 1;
    
    // console.log(`[GOAL TOGGLED] GoalId: ${goal.id}, Title: "${goal.title}", nextCompletedState: ${nextCompleted}`);
    triggerHaptic(nextCompleted);
    onToggle(goal.id, nextCompleted);
  };

  const handleSave = () => {
    if (editedTitle.trim()) {
      onEdit(goal.id, editedTitle.trim());
      setIsEditing(false);
    }
  };

  // Checkbox wrapper animates background color & scale
  const checkboxAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', theme.primary]
    );
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [theme.primary, theme.primary]
    );

    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: checkboxScale.value }],
    };
  });

  // Checkmark scale and opacity inside the checkbox
  const checkmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [{ scale: progress.value }],
    };
  });

  // Text color & opacity animation
  const textAnimatedStyle = useAnimatedStyle(() => {
    const textColor = interpolateColor(
      progress.value,
      [0, 1],
      [theme.text, isDark ? '#64748B' : '#94A3B8']
    );
    return {
      color: textColor,
      opacity: interpolate(progress.value, [0, 1], [1, 0.65]),
    };
  });

  // Custom strike-through line animation
  const strikeThroughAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
      opacity: progress.value,
    };
  });

  return (
    <View style={[
      styles.container, 
      {
        backgroundColor: goal.completed 
          ? (isDark ? '#0D1625' : '#F8FAFC')
          : theme.card,
        borderColor: theme.border,
        ...getThemedShadow(theme, 'soft')
      },
      goal.completed && styles.containerCompleted
    ]}>
      <TouchableOpacity 
        style={styles.checkboxContainer}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.checkbox, checkboxAnimatedStyle]}>
          <Animated.View style={checkmarkAnimatedStyle}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
      
      <View style={styles.content}>
        {isEditing ? (
          <TextInput
            style={[styles.editInput, { color: theme.text }]}
            value={editedTitle}
            onChangeText={setEditedTitle}
            onBlur={handleSave}
            autoFocus
            onSubmitEditing={handleSave}
          />
        ) : (
          <View style={styles.textWrapper}>
            <Animated.Text 
              style={[styles.title, textAnimatedStyle]}
              onPress={() => setIsEditing(true)}
            >
              {goal.title}
            </Animated.Text>
            {/* Smooth Strike Line */}
            <Animated.View 
              style={[
                styles.strikeLine, 
                strikeThroughAnimatedStyle, 
                { backgroundColor: isDark ? '#475569' : '#CBD5E1' }
              ]} 
            />
          </View>
        )}
      </View>

      <TouchableOpacity onPress={() => onDelete(goal.id)} style={styles.deleteButton} activeOpacity={0.6}>
        <Ionicons name="trash-outline" size={18} color={isDark ? '#64748B' : colors.text.tertiary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1.2,
  },
  containerCompleted: {
    opacity: 0.85,
  },
  checkboxContainer: {
    padding: 12,
    marginRight: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  textWrapper: {
    alignSelf: 'flex-start',
    position: 'relative',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleSmall,
    fontWeight: '600',
    paddingVertical: 2,
  },
  strikeLine: {
    position: 'absolute',
    height: 1.8,
    left: 0,
    right: 0,
    top: '50%',
  },
  editInput: {
    ...typography.titleSmall,
    padding: 0,
  },
  deleteButton: {
    padding: 8,
  },
});
