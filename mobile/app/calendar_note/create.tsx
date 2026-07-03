import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { calendarNotesApi } from '../../src/api/calendar_notes';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, borderRadius } from '../../src/theme';
import { getLocalDateString } from '../../src/utils/date';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import ScreenContainer from '../../src/components/ScreenContainer';

const { width } = Dimensions.get('window');

export default function CreateCalendarNoteScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  const { initialDate, editId } = useLocalSearchParams<{ initialDate?: string; editId?: string }>();
  const isEditing = !!editId;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteDate, setNoteDate] = useState(() => {
    if (initialDate) {
      return new Date(initialDate);
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: existingNote, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['calendar-note', editId],
    queryFn: () => calendarNotesApi.getCalendarNote(Number(editId)),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title);
      setContent(existingNote.content || '');
      if (existingNote.note_date) {
        setNoteDate(new Date(existingNote.note_date));
      }
    }
  }, [existingNote]);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        content: content.trim() || null,
        note_date: getLocalDateString(noteDate),
      };

      if (isEditing) {
        return calendarNotesApi.updateCalendarNote(Number(editId), payload);
      } else {
        return calendarNotesApi.createCalendarNote(payload);
      }
    },
    onSuccess: async () => {
      triggerHaptic();
      await queryClient.invalidateQueries({ queryKey: ['calendar-notes'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      await queryClient.invalidateQueries({ queryKey: ['today-calendar-notes'] });
      if (isEditing) {
        await queryClient.invalidateQueries({ queryKey: ['calendar-note', editId] });
      }
      router.back();
    },
    onError: (err: any) => {
      console.error('[CREATE CALENDAR NOTE ERROR]', err);
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save calendar note');
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for the calendar note.');
      return;
    }
    mutation.mutate();
  };

  const ds = styles(theme, isDark, colors);

  if (isEditing && isLoadingExisting) {
    return (
      <View style={ds.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer style={ds.container}>
      {/* Header */}
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.backBtn}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[ds.headerTitle, { color: theme.text }]}>
          {isEditing ? 'Edit Note' : 'New Calendar Note'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={mutation.isPending}>
          <LinearGradient colors={colors.gradient.primary} style={[ds.saveBtn, mutation.isPending && { opacity: 0.7 }]}>
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={ds.saveText}>{isEditing ? 'Save' : 'Add'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={ds.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Form Card */}
        <View style={ds.formCard}>
          <Text style={ds.label}>Note Title</Text>
          <TextInput
            style={ds.titleInput}
            placeholder="e.g. Submit DAA assignment"
            placeholderTextColor={colors.text.tertiary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[ds.label, { marginTop: 20 }]}>Content / Description (Optional)</Text>
          <TextInput
            style={ds.descInput}
            placeholder="Add note details here..."
            placeholderTextColor={colors.text.tertiary}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Date Selection Card */}
        <View style={ds.formCard}>
          <View style={ds.fieldHeader}>
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
            <Text style={ds.fieldLabel}>Note Date</Text>
          </View>
          <View style={ds.dateTimeRow}>
            <TouchableOpacity 
              style={ds.dateTimeBtn} 
              onPress={() => { triggerHaptic(); setShowDatePicker(true); }}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              <Text style={ds.dateTimeText}>
                {noteDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={noteDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setNoteDate(selectedDate);
            }}
          />
        )}

        {/* Smart Live Preview */}
        <Text style={ds.sectionTitle}>Smart Live Preview</Text>
        <View style={[ds.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View>
            <View style={ds.previewHeader}>
              <Text style={ds.previewCategory}>CALENDAR NOTE 📅</Text>
              <Text style={ds.previewTime}>{noteDate.toLocaleDateString()}</Text>
            </View>
            <Text style={[ds.previewTitle, { color: theme.text }]}>
              {title || 'Untitled Note'}
            </Text>
            <Text style={[ds.previewSub, { color: theme.textSecondary }]} numberOfLines={3}>
              {content || 'No details provided'}
            </Text>
          </View>
        </View>
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...getThemedShadow(theme, 'soft'),
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 25,
  },
  formCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: theme.border,
    padding: 20,
    marginBottom: 20,
    ...getThemedShadow(theme, 'soft'),
  },
  label: {
    ...typography.caption,
    color: theme.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 16,
    color: theme.text,
    borderBottomWidth: 1.2,
    borderBottomColor: theme.border,
    paddingVertical: 8,
  },
  descInput: {
    fontSize: 15,
    color: theme.text,
    minHeight: 80,
    paddingVertical: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
    marginLeft: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 77, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  sectionTitle: {
    ...typography.caption,
    color: theme.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 12,
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 20,
    marginBottom: 40,
    ...getThemedShadow(theme, 'soft'),
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#3B82F6',
  },
  previewTime: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  previewTitle: {
    ...typography.titleLarge,
    fontWeight: '800',
    marginBottom: 6,
  },
  previewSub: {
    fontSize: 13,
    lineHeight: 18,
  },
});
