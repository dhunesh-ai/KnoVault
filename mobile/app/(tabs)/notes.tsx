import React, { useState, useMemo } from 'react';
import SwipeWrapper, { useSwipe } from '../../src/components/SwipeWrapper';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';
import { useNotesStore } from '../../src/store/notesStore';
import { notesApi } from '../../src/api/notes';
import { NoteCard } from '../../src/components/NoteCard';
import { Note } from '../../src/types/notes';
import { SecurityOverlay } from '../../src/components/SecurityOverlay';
import { useTheme } from '../../src/hooks/useTheme';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import { typography, spacing, borderRadius } from '../../src/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { showMicAccessDisabledAlert } from '../../src/utils/micAccessAlert';

const CATEGORIES = [
  'All', 'General', 'Work', 'Personal', 'Study', 'Ideas', 
  'Shopping', 'Health', 'Finance', 'Travel', 'Secure'
];

export default function NotesScreen() {
  const router = useRouter();
  const { colors, theme, isDark } = useTheme();
  const { setSwipeEnabled } = useSwipe();
  const [securityVisible, setSecurityVisible] = useState(false);
  const [pendingNote, setPendingNote] = useState<any>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const queryClient = useQueryClient();
  const { microphoneAccessEnabled } = useSettingsStore();

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: number; is_favorite: boolean }) => {
      return notesApi.updateNote(id, { is_favorite });
    },
    onMutate: async ({ id, is_favorite }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previousNotes = queryClient.getQueryData<Note[]>(['notes']);

      queryClient.setQueryData<Note[]>(['notes'], (old) => {
        if (!old) return [];
        return old.map((note) => {
          if (note.id === id) {
            return { ...note, is_favorite };
          }
          return note;
        });
      });

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const handleToggleFavorite = (note: Note) => {
    toggleFavoriteMutation.mutate({ id: note.id, is_favorite: !note.is_favorite });
  };

  // ── AI Shortcut Animations & Handlers ───────────────────────
  const aiScale = useSharedValue(1);
  const aiOpacity = useSharedValue(1);

  const aiAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: aiScale.value }],
      opacity: aiOpacity.value,
    };
  });

  const triggerImpactHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log('[Haptics Not Available]', e);
    }
  };

  const handleAiPressIn = () => {
    aiScale.value = withSpring(0.9, { damping: 12 });
    aiOpacity.value = withTiming(0.8, { duration: 100 });
  };

  const handleAiPressOut = () => {
    aiScale.value = withSpring(1, { damping: 10 });
    aiOpacity.value = withTiming(1, { duration: 100 });
  };

  const handleAiPress = async () => {
    console.log('[AI BUTTON PRESSED]');
    console.log('[NAVIGATING TO AI TAB]');
    await triggerImpactHaptic();
    router.push('/ai');
  };
  
  const {
    selectedCategory,
    searchQuery,
    setCategory,
    setSearchQuery,
  } = useNotesStore();

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

  const {
    data: notes,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesApi.getNotes(),
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    return notes.filter((note) => {
      if (showFavoritesOnly && !note.is_favorite) return false;
      if (selectedCategory && selectedCategory !== 'All' && note.category !== selectedCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = note.title || '';
        const content = note.content || '';
        const inTitle = title.toLowerCase().includes(query);
        const inContent = content.toLowerCase().includes(query);
        if (!inTitle && !inContent) return false;
      }
      return true;
    });
  }, [notes, selectedCategory, searchQuery, showFavoritesOnly]);

  return (
    <SwipeWrapper currentTab="notes">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Search Bar & AI Button ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={[
            styles.searchContainer, 
            { 
              backgroundColor: theme.card, 
              borderColor: theme.border,
              ...getThemedShadow(theme, 'soft')
            }
          ]}>
            <Ionicons name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search your notes..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            onPress={handleAiPress}
            onPressIn={handleAiPressIn}
            onPressOut={handleAiPressOut}
            accessibilityLabel="Open KnoVault AI"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View style={[styles.aiButton, aiAnimatedStyle]}>
              <LinearGradient
                colors={['#7C4DFF', '#6A5CFF']}
                style={styles.aiButtonGradient}
              >
                <Sparkles size={20} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* ── Horizontal Category Chips ──────────────────────── */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
          onTouchStart={() => setSwipeEnabled(false)}
          onTouchEnd={() => setSwipeEnabled(true)}
          onTouchCancel={() => setSwipeEnabled(true)}
          onMomentumScrollEnd={() => setSwipeEnabled(true)}
        >
          {/* Favorites filter chip */}
          <TouchableOpacity
            style={[
              styles.categoryChip, 
              { 
                backgroundColor: showFavoritesOnly ? '#F59E0B' : theme.card,
                borderColor: showFavoritesOnly ? '#F59E0B' : theme.border,
                flexDirection: 'row',
                alignItems: 'center',
              }
            ]}
            onPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch (e) {}
              setShowFavoritesOnly(!showFavoritesOnly);
            }}
          >
            <Ionicons 
              name={showFavoritesOnly ? "star" : "star-outline"} 
              size={14} 
              color={showFavoritesOnly ? "#FFFFFF" : "#F59E0B"} 
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.categoryText, 
              { color: showFavoritesOnly ? '#FFFFFF' : colors.text.secondary }
            ]}>
              Favorites
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat || (!selectedCategory && cat === 'All');
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip, 
                  { 
                    backgroundColor: isActive ? theme.primary : theme.card,
                    borderColor: isActive ? theme.primary : theme.border,
                  }
                ]}
                onPress={async () => {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (e) {}
                  setCategory(cat === 'All' ? null : cat);
                }}
              >
                <Text style={[
                  styles.categoryText, 
                  { color: isActive ? '#FFFFFF' : colors.text.secondary }
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Masonry/Grid Notes Layout ──────────────────────── */}
      {isLoading && !isRefetching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.notesGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.primary}
            />
          }
        >
          {showFavoritesOnly && (
            <View style={styles.favoritesHeadingContainer}>
              <Text style={[styles.favoritesHeading, { color: theme.text }]}>Your Favorite Notes</Text>
            </View>
          )}

          {filteredNotes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={showFavoritesOnly ? "star-outline" : "document-text-outline"} 
                size={48} 
                color={colors.text.tertiary} 
                style={{ marginBottom: 12 }}
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {showFavoritesOnly ? "No favorite notes yet ⭐" : "No notes found"}
              </Text>
            </View>
          ) : (
            filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onPress={handleNotePress}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          )}
        </ScrollView>
      )}

      <SecurityOverlay 
        visible={securityVisible}
        onAuthenticate={() => handleAuthenticate()}
        onCancel={() => {
          setSecurityVisible(false);
          setPendingNote(null);
        }}
      />

      {/* ── Floating Buttons ────────────────────────────────── */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[
            styles.micFab, 
            { 
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...getThemedShadow(theme, 'medium')
            }
          ]} 
          onPress={() => {
            if (!microphoneAccessEnabled) {
              showMicAccessDisabledAlert();
            } else {
              router.push('/note/voice');
            }
          }}
        >
          <Ionicons name="mic" size={24} color={theme.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.addFab, getThemedShadow(theme, 'strong')]} 
          onPress={() => router.push('/note/create')}
        >
          <LinearGradient
            colors={colors.gradient.primary}
            style={styles.addFabGradient}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 15,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 54,
    borderWidth: 1,
  },
  aiButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  aiButtonGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    marginLeft: 10,
  },
  categoriesWrapper: {
    marginBottom: 20,
  },
  categoriesScroll: {
    paddingHorizontal: 25,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
  },
  categoryText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  favoritesHeadingContainer: {
    width: '100%',
    paddingVertical: 10,
    marginBottom: 10,
  },
  favoritesHeading: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.bodyMedium,
    fontWeight: '600',
    textAlign: 'center',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingBottom: 140,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 110,
    right: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  micFab: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
  },
  addFab: {
    borderRadius: 20,
  },
  addFabGradient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
