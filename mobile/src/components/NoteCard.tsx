import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { getThemedShadow } from './ThemedComponents';
import { typography, spacing, borderRadius } from '../theme';
import { Note } from '../types/notes';
import { formatRelativeTime } from '../utils/date';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onToggleFavorite?: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onPress, onToggleFavorite }) => {
  const { colors, theme, isDark } = useTheme();

  const isSecure = note.is_secure || note.category === 'Secure';
  const starScale = useSharedValue(1);

  useEffect(() => {
    // When is_favorite status changes, trigger a small scale pop
    starScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 120 }),
      withSpring(1, { damping: 8, stiffness: 120 })
    );
  }, [note.is_favorite]);

  const starAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: starScale.value }],
    };
  });

  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log('[Haptics Not Available]', e);
    }
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: isSecure && isDark 
        ? '#121A2A' // Darker for secure note in dark mode
        : theme.card,
      borderColor: note.is_favorite
        ? '#F59E0B' // Amber border for favorites
        : (isSecure 
          ? (isDark ? 'rgba(124, 77, 255, 0.4)' : '#DDD6FE') 
          : theme.border),
      borderWidth: note.is_favorite ? 1.5 : 1.2,
      ...getThemedShadow(theme, note.is_favorite ? 'medium' : (isSecure ? 'medium' : 'soft')),
      ...(note.is_favorite ? {
        shadowColor: '#F59E0B',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
      } : (isSecure && isDark ? {
        shadowColor: '#7C4DFF',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
      } : {}))
    }
  ];

  return (
    <TouchableOpacity 
      style={cardStyle} 
      onPress={() => onPress(note)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[
          styles.tag, 
          { backgroundColor: isSecure ? 'rgba(124, 77, 255, 0.15)' : `${theme.primary}12` }
        ]}>
          <Text style={[styles.tagText, { color: isSecure ? '#8B5CF6' : theme.primary }]}>
            {note.category}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isSecure && (
            <View style={[styles.lockIcon, { backgroundColor: isDark ? '#1C2638' : '#F1F5F9' }]}>
              <Ionicons name="lock-closed" size={12} color={isDark ? '#A78BFA' : '#7C4DFF'} />
            </View>
          )}
          {onToggleFavorite && (
            <TouchableOpacity 
              style={[styles.starButton, { marginLeft: 8 }]}
              onPress={async (e) => {
                e.stopPropagation();
                await triggerHaptic();
                onToggleFavorite(note);
              }}
            >
              <Animated.View style={starAnimatedStyle}>
                <Ionicons 
                  name={note.is_favorite ? "star" : "star-outline"} 
                  size={16} 
                  color={note.is_favorite ? "#F59E0B" : (isDark ? '#64748B' : '#94A3B8')} 
                />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{note.title}</Text>
      <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={3}>
        {isSecure ? '••••••••••••••••' : note.content}
      </Text>
      
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.dateContainer}>
          <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
          <Text style={styles.dateText}>{formatRelativeTime(note.updated_at || note.created_at)}</Text>
        </View>
        {isSecure && (
          <View style={[
            styles.secureBadge, 
            { backgroundColor: isDark ? '#2E1A47' : '#F5F3FF' }
          ]}>
            <Text style={[styles.secureText, { color: isDark ? '#C4B5FD' : '#7C4DFF' }]}>SECURE</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 15,
    width: '48%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'none',
  },
  lockIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.titleSmall,
    fontWeight: '800',
    marginBottom: 6,
  },
  preview: {
    ...typography.bodySmall,
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    ...typography.caption,
    color: '#A1A1AA',
    marginLeft: 4,
    fontSize: 10,
    textTransform: 'none',
  },
  secureBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  secureText: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 8,
  },
});
