import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarNotesApi } from '../../src/api/calendar_notes';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';
import { formatLocalDateDisplay } from '../../src/utils/date';
import { LinearGradient } from 'expo-linear-gradient';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import ScreenContainer from '../../src/components/ScreenContainer';

export default function CalendarNoteDetailScreen() {
  const { colors, theme, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: note, isLoading, error } = useQuery({
    queryKey: ['calendar-note', id],
    queryFn: async () => {
      console.log(`[DEBUG LOG] Calendar note detail requested for ID: ${id}`);
      return calendarNotesApi.getCalendarNote(Number(id));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      console.log(`[DEBUG LOG] Requesting deletion of calendar note ID: ${id}`);
      return calendarNotesApi.deleteCalendarNote(Number(id));
    },
    onSuccess: async () => {
      console.log(`[DEBUG LOG] Calendar note ID: ${id} successfully deleted. Invalidating queries...`);
      await queryClient.invalidateQueries({ queryKey: ['calendar-notes'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      await queryClient.invalidateQueries({ queryKey: ['today-calendar-notes'] });
      router.back();
    },
    onError: (err) => {
      console.error(`[DEBUG LOG] Failed to delete calendar note ID: ${id}. Error:`, err);
      Alert.alert('Error', 'Failed to delete calendar note');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this calendar note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const ds = styles(theme, isDark, colors);

  if (isLoading) {
    return (
      <View style={ds.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !note) {
    return (
      <View style={ds.center}>
        <Text style={[ds.errorText, { color: theme.textSecondary }]}>Calendar note not found</Text>
        <TouchableOpacity style={[ds.backBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={ds.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenContainer style={ds.container}>
      {/* Header */}
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[ds.headerTitle, { color: theme.text }]}>Calendar Note</Text>
        <TouchableOpacity onPress={handleDelete} style={ds.iconBtn}>
          <Ionicons name="trash-outline" size={22} color={colors.accent.rose} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={ds.content} showsVerticalScrollIndicator={false}>
        <View style={[ds.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Tag row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View style={[ds.typeBadge, { backgroundColor: '#3B82F615', marginBottom: 0 }]}>
              <Text style={[ds.typeText, { color: '#3B82F6' }]}>CALENDAR NOTE</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[ds.title, { color: theme.text }]}>{note.title}</Text>

          {/* Date info row */}
          <View style={ds.infoRow}>
            <View style={[ds.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
            </View>
            <View>
              <Text style={[ds.infoLabel, { color: theme.textSecondary }]}>Date</Text>
              <Text style={[ds.infoValue, { color: theme.text }]}>{formatLocalDateDisplay(note.note_date)}</Text>
            </View>
          </View>

          {/* Description/Content */}
          {note.content ? (
            <View style={[ds.descriptionSection, { borderTopColor: theme.border }]}>
              <Text style={[ds.infoLabel, { color: theme.textSecondary }]}>Content</Text>
              <Text style={[ds.descriptionText, { color: theme.textSecondary }]}>{note.content}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={ds.editBtn}
          onPress={() => router.push({ pathname: '/calendar_note/create', params: { editId: id } })}
        >
          <LinearGradient colors={colors.gradient.primary} style={ds.editGradient}>
            <Text style={ds.editText}>Edit Calendar Note</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  headerTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  iconBtn: {
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
  content: {
    padding: 25,
  },
  card: {
    borderRadius: 30,
    padding: 25,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'medium'),
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 20,
  },
  typeText: {
    ...typography.caption,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    ...typography.displaySmall,
    fontWeight: '800',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  infoLabel: {
    ...typography.caption,
    color: theme.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  descriptionSection: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1.2,
  },
  descriptionText: {
    ...typography.bodyMedium,
    lineHeight: 22,
    marginTop: 8,
  },
  editBtn: {
    marginTop: 30,
    ...getThemedShadow(theme, 'medium'),
  },
  editGradient: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorText: {
    ...typography.bodyLarge,
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
