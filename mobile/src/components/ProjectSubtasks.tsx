import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius } from '../theme';
import { SubTask } from '../types/projects';

// Helper for haptics
const triggerHaptic = (type: 'success' | 'light' | 'medium') => {
  try {
    if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (type === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else if (type === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  } catch (e) {}
};

interface ProjectSubtasksProps {
  subtasks: SubTask[];
  onChange: (updatedSubtasks: SubTask[]) => void;
}

export const ProjectSubtasks: React.FC<ProjectSubtasksProps> = ({
  subtasks,
  onChange,
}) => {
  const { colors, theme, isDark } = useTheme();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleAddSubtask = () => {
    const trimmedTitle = newSubtaskTitle.trim();
    if (!trimmedTitle) return;

    const newSub: SubTask = {
      id: Date.now().toString(),
      title: trimmedTitle,
      completed: false,
    };

    const updated = [...subtasks, newSub];
    onChange(updated);
    setNewSubtaskTitle('');
    triggerHaptic('medium');
    
    // Auto-focus input after adding
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleToggleSubtask = (id: string | number) => {
    const updated = subtasks.map((st) => {
      if (st.id === id) {
        const nextState = !st.completed;
        triggerHaptic(nextState ? 'success' : 'light');
        return { ...st, completed: nextState };
      }
      return st;
    });
    onChange(updated);
  };

  const handleDeleteSubtask = (id: string | number) => {
    const updated = subtasks.filter((st) => st.id !== id);
    onChange(updated);
    triggerHaptic('light');
  };

  const handleUpdateSubtaskTitle = (id: string | number, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      handleDeleteSubtask(id);
      return;
    }
    const updated = subtasks.map((st) =>
      st.id === id ? { ...st, title: trimmed } : st
    );
    onChange(updated);
  };

  const handleReorderSubtasks = (fromIndex: number, toIndex: number) => {
    const sanitizedToIndex = Math.max(0, Math.min(subtasks.length - 1, toIndex));
    if (sanitizedToIndex === fromIndex) return;

    const updated = [...subtasks];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(sanitizedToIndex, 0, removed);
    onChange(updated);
    triggerHaptic('medium');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Subtasks ({subtasks.length})
      </Text>

      {/* Checklist list */}
      <View style={styles.listContainer}>
        {subtasks.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={[
              styles.emptyContainer,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name="clipboard-outline"
              size={28}
              color={isDark ? '#64748B' : '#94A3B8'}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Break your project into smaller tasks for better productivity.
            </Text>
          </Animated.View>
        ) : (
          subtasks.map((st, index) => (
            <Animated.View
              key={st.id}
              entering={FadeInDown.duration(250)}
              exiting={FadeOut.duration(200)}
              layout={LinearTransition.springify().damping(18).stiffness(120)}
            >
              <SubtaskItemRow
                st={st}
                index={index}
                totalCount={subtasks.length}
                onToggle={handleToggleSubtask}
                onDelete={handleDeleteSubtask}
                onUpdateTitle={handleUpdateSubtaskTitle}
                onReorder={handleReorderSubtasks}
                theme={theme}
                isDark={isDark}
                colors={colors}
              />
            </Animated.View>
          ))
        )}
      </View>

      {/* Add Subtask Input Row */}
      <View
        style={[
          styles.addSubtaskContainer,
          {
            borderColor: theme.border,
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.addSubtaskInput, { color: theme.text }]}
          placeholder="Add a subtask..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={newSubtaskTitle}
          onChangeText={setNewSubtaskTitle}
          onSubmitEditing={handleAddSubtask}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={handleAddSubtask}
          style={[
            styles.addSubtaskBtn,
            {
              backgroundColor: theme.primary,
              opacity: newSubtaskTitle.trim() ? 1 : 0.6,
            },
          ]}
          disabled={!newSubtaskTitle.trim()}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface SubtaskItemRowProps {
  st: SubTask;
  index: number;
  totalCount: number;
  onToggle: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onUpdateTitle: (id: string | number, newTitle: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  theme: any;
  isDark: boolean;
  colors: any;
}

const SubtaskItemRow: React.FC<SubtaskItemRowProps> = ({
  st,
  index,
  totalCount,
  onToggle,
  onDelete,
  onUpdateTitle,
  onReorder,
  theme,
  isDark,
  colors,
}) => {
  const [localTitle, setLocalTitle] = useState(st.title);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Sync internal localTitle if st.title changes externally
  useEffect(() => {
    setLocalTitle(st.title);
  }, [st.title]);

  const handleBlur = () => {
    if (localTitle.trim() !== st.title) {
      onUpdateTitle(st.id, localTitle);
    }
  };

  // Horizontal Swipe gesture to delete
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Only swipe left (negative X translation)
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -120) {
        // Trigger horizontal swipe deletion
        translateX.value = withTiming(-400, { duration: 180 }, () => {
          opacity.value = withTiming(0, { duration: 100 }, () => {
            runOnJS(onDelete)(st.id);
          });
        });
      } else {
        translateX.value = withSpring(0, { damping: 15 });
      }
    });

  // Vertical Drag gesture to reorder (attached exclusively to drag handle)
  const dragGesture = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .failOffsetX([-10, 10])
    .onStart(() => {
      isDragging.value = true;
      runOnJS(triggerHaptic)('light');
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      isDragging.value = false;
      const rowHeight = 48; // approximate height of subtask row
      const offset = Math.round(translateY.value / rowHeight);
      if (offset !== 0) {
        runOnJS(onReorder)(index, index + offset);
      } else {
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const rowAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: withSpring(isDragging.value ? 1.02 : 1, { damping: 15 }) },
      ],
      opacity: opacity.value,
      zIndex: isDragging.value ? 999 : 1,
      elevation: isDragging.value ? 4 : 0,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: isDragging.value ? 4 : 0 },
      shadowOpacity: isDragging.value ? 0.15 : 0,
      shadowRadius: isDragging.value ? 6 : 0,
    };
  });

  const deleteBtnStyle = useAnimatedStyle(() => {
    return {
      opacity: translateX.value < -20 ? 1 : 0,
    };
  });

  return (
    <View style={styles.rowWrapper}>
      {/* Background delete action track revealed on swipe */}
      <View
        style={[
          styles.deleteSwipeTrack,
          {
            backgroundColor: '#FEE2E2', // light red
          },
        ]}
      >
        <Animated.View style={[styles.deleteActionContainer, deleteBtnStyle]}>
          <TouchableOpacity
            style={styles.actionBtnCircle}
            onPress={() => {
              triggerHaptic('light');
              onDelete(st.id);
            }}
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            styles.subtaskItemRow,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            },
            rowAnimatedStyle,
          ]}
        >
          {/* Checkbox button */}
          <TouchableOpacity
            style={styles.subtaskCheck}
            onPress={() => onToggle(st.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={st.completed ? 'checkbox' : 'square-outline'}
              size={20}
              color={st.completed ? theme.primary : isDark ? '#64748B' : '#94A3B8'}
            />
          </TouchableOpacity>

          {/* Title Text Input (Editable) */}
          <TextInput
            style={[
              styles.subtaskTitleInput,
              {
                color: theme.text,
                textDecorationLine: st.completed ? 'line-through' : 'none',
                opacity: st.completed ? 0.6 : 1,
              },
            ]}
            value={localTitle}
            onChangeText={setLocalTitle}
            onBlur={handleBlur}
            onSubmitEditing={handleBlur}
            returnKeyType="done"
          />

          {/* Drag reorder handle */}
          <GestureDetector gesture={dragGesture}>
            <View style={styles.dragHandle}>
              <Ionicons
                name="reorder-two-outline"
                size={22}
                color={isDark ? '#64748B' : '#94A3B8'}
              />
            </View>
          </GestureDetector>

          {/* Delete Icon */}
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onDelete(st.id);
            }}
            style={styles.subtaskDeleteIcon}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color="#EF4444"
              style={{ opacity: 0.8 }}
            />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  listContainer: {
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 16,
  },
  rowWrapper: {
    position: 'relative',
    height: 48,
    marginVertical: 2,
  },
  subtaskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subtaskCheck: {
    padding: 8,
  },
  subtaskTitleInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dragHandle: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtaskDeleteIcon: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Swipe to delete background styles
  deleteSwipeTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  deleteActionContainer: {
    width: 60,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add Subtask Row styling
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingLeft: spacing.sm,
    paddingRight: 4,
    height: 44,
    marginTop: spacing.xs,
  },
  addSubtaskInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  addSubtaskBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
