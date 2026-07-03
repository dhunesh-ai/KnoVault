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
import { remindersApi } from '../../src/api/reminders';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';
import { formatLocalDateDisplay, formatLocalTime } from '../../src/utils/date';
import { LinearGradient } from 'expo-linear-gradient';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import ScreenContainer from '../../src/components/ScreenContainer';

export default function ReminderDetailScreen() {
  const { colors, theme, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: reminder, isLoading, error } = useQuery({
    queryKey: ['reminders', id],
    queryFn: async () => {
      console.log(`[DEBUG LOG] Reminder detail requested for ID: ${id}`);
      try {
        const res = await remindersApi.getReminder(Number(id));
        console.log(`[DEBUG LOG] Reminder found status: true, Title: '${res?.title}'`);
        return res;
      } catch (err) {
        console.log(`[DEBUG LOG] Reminder found status: false, Error:`, err);
        throw err;
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      console.log(`[DEBUG LOG] Requesting deletion of reminder ID: ${id}`);
      return remindersApi.deleteReminder(Number(id));
    },
    onSuccess: async () => {
      console.log(`[DEBUG LOG] Reminder ID: ${id} successfully deleted. Invalidating queries...`);
      await queryClient.invalidateQueries({ queryKey: ['reminders'] });
      await queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      console.log(`[DEBUG LOG] Cache invalidations completed. Navigating back.`);
      router.back();
    },
    onError: (err) => {
      console.error(`[DEBUG LOG] Failed to delete reminder ID: ${id}. Error:`, err);
      Alert.alert('Error', 'Failed to delete reminder');
    },
  });

  const toggleCompletedMutation = useMutation({
    mutationFn: () => remindersApi.updateReminder(Number(id), { is_completed: !reminder?.is_completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', id] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update reminder status');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
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

  if (error || !reminder) {
    return (
      <View style={ds.center}>
        <Text style={[ds.errorText, { color: theme.textSecondary }]}>Reminder not found</Text>
        <TouchableOpacity style={[ds.backBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={ds.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Status check logic
  const getStatus = () => {
    if (reminder.is_completed) return { text: 'Completed', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    const dateLimit = new Date(reminder.reminder_date);
    if (Date.now() - dateLimit.getTime() > 30 * 60 * 1000) {
      return { text: 'Missed', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    }
    return { text: 'Active', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
  };
  const statusInfo = getStatus();

  // Parse structured description if possible
  let isMedicine = false;
  let isCustom = false;
  let medDetails: any = null;
  let customDetails: any = null;

  try {
    if (reminder.description && reminder.description.startsWith('{')) {
      const parsed = JSON.parse(reminder.description);
      if (parsed.isMedicine) {
        isMedicine = true;
        medDetails = parsed;
      } else if (parsed.isCustom) {
        isCustom = true;
        customDetails = parsed;
      }
    }
  } catch (e) {
    // Treat as plain text
  }

  const reminderColor = isMedicine 
    ? '#10B981' 
    : isCustom 
    ? '#F59E0B' 
    : getCategoryColor(reminder.type, colors, theme);

  return (
    <ScreenContainer style={ds.container}>
      {/* Header */}
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[ds.headerTitle, { color: theme.text }]}>Details</Text>
        <TouchableOpacity onPress={handleDelete} style={ds.iconBtn}>
          <Ionicons name="trash-outline" size={22} color={colors.accent.rose} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={ds.content} showsVerticalScrollIndicator={false}>
        <View style={[ds.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          
          {/* Badge & Status Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View style={[ds.typeBadge, { backgroundColor: reminderColor + '15', marginBottom: 0 }]}>
              <Text style={[ds.typeText, { color: reminderColor }]}>
                {isMedicine 
                  ? 'MEDICINE course 💊' 
                  : isCustom 
                  ? `${customDetails?.customIcon || '🎯'} ${customDetails?.customName || 'CUSTOM'}`.toUpperCase() 
                  : reminder.type.toUpperCase()
                }
              </Text>
            </View>
            <View style={[ds.typeBadge, { backgroundColor: statusInfo.bg, marginBottom: 0 }]}>
              <Text style={[ds.typeText, { color: statusInfo.color }]}>
                {statusInfo.text.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Medicine Card View */}
          {isMedicine ? (
            <View>
              <Text style={[ds.title, { color: theme.text }]}>{medDetails.medName}</Text>
              
              {/* Pill & Dosage Grid */}
              <View style={ds.badgeGrid}>
                <View style={[ds.badgeItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                  <Text style={[ds.badgeText, { color: theme.text }]}>{medDetails.medType}</Text>
                </View>
                <View style={[ds.badgeItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                  <Text style={[ds.badgeText, { color: theme.text }]}>{medDetails.dosage}</Text>
                </View>
                <View style={[ds.badgeItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                  <Text style={[ds.badgeText, { color: theme.text }]}>{medDetails.foodTiming}</Text>
                </View>
              </View>

              {/* Course Progress Section */}
              <View style={ds.progressSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[ds.progressLabel, { color: theme.textSecondary }]}>Course Progress</Text>
                  <Text style={[ds.progressValue, { color: theme.primary, fontWeight: '800' }]}>
                    Day {reminder.course_day || medDetails.day_number || 1} of {medDetails.total_days || 5}
                  </Text>
                </View>
                <View style={[ds.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
                  <View style={[
                    ds.progressBarFill, 
                    { 
                      backgroundColor: theme.primary,
                      width: `${((reminder.course_day || medDetails.day_number || 1) / (medDetails.total_days || 5)) * 100}%` 
                    }
                  ]} />
                </View>
              </View>

              {/* Schedule Info */}
              <View style={ds.detailSection}>
                <View style={ds.infoRow}>
                  <Ionicons name="repeat-outline" size={20} color={theme.primary} style={ds.infoIcon} />
                  <View>
                    <Text style={ds.infoLabel}>Frequency</Text>
                    <Text style={[ds.infoValue, { color: theme.text }]}>{medDetails.frequency}</Text>
                  </View>
                </View>

                <View style={ds.infoRow}>
                  <Ionicons name="time-outline" size={20} color={theme.primary} style={ds.infoIcon} />
                  <View>
                    <Text style={ds.infoLabel}>Daily Schedule</Text>
                    <Text style={[ds.infoValue, { color: theme.text }]}>
                      {medDetails.timings?.join(', ') || 'None'}
                    </Text>
                  </View>
                </View>

                <View style={ds.infoRow}>
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} style={ds.infoIcon} />
                  <View>
                    <Text style={ds.infoLabel}>Course Period</Text>
                    <Text style={[ds.infoValue, { color: theme.text }]}>
                      {formatLocalDateDisplay(reminder.start_date || reminder.reminder_date)} → {formatLocalDateDisplay(reminder.end_date || reminder.reminder_date)}
                    </Text>
                  </View>
                </View>
              </View>

              {medDetails.notes && (
                <View style={[ds.descriptionSection, { borderTopColor: theme.border }]}>
                  <Text style={[ds.infoLabel, { color: theme.textSecondary }]}>Special Instructions</Text>
                  <Text style={[ds.descriptionText, { color: theme.textSecondary }]}>{medDetails.notes}</Text>
                </View>
              )}
            </View>
          ) : (
            // Standard / Custom View
            <View>
              <Text style={[ds.title, { color: theme.text }]}>{reminder.title}</Text>
              
              <View style={ds.infoRow}>
                <View style={[ds.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                  <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                </View>
                <View>
                  <Text style={[ds.infoLabel, { color: theme.textSecondary }]}>Date</Text>
                  <Text style={[ds.infoValue, { color: theme.text }]}>{formatLocalDateDisplay(reminder.reminder_date)}</Text>
                </View>
              </View>

              <View style={ds.infoRow}>
                <View style={[ds.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                  <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                </View>
                <View>
                  <Text style={[ds.infoLabel, { color: theme.textSecondary }]}>Time</Text>
                  <Text style={[ds.infoValue, { color: theme.text }]}>{formatLocalTime(reminder.reminder_date)}</Text>
                </View>
              </View>

              {isCustom ? (
                customDetails.notes && (
                  <View style={[ds.descriptionSection, { borderTopColor: theme.border }]}>
                    <Text style={[ds.infoLabel, { color: theme.textSecondary }]}>Notes</Text>
                    <Text style={[ds.descriptionText, { color: theme.textSecondary }]}>{customDetails.notes}</Text>
                  </View>
                )
              ) : (
                reminder.description && (
                  <View style={[ds.descriptionSection, { borderTopColor: theme.border }]}>
                    <Text style={[ds.infoLabel, { color: theme.textSecondary }]}>Description</Text>
                    <Text style={[ds.descriptionText, { color: theme.textSecondary }]}>{reminder.description}</Text>
                  </View>
                )
              )}
            </View>
          )}
        </View>

        {/* Toggle Taken Button */}
        <TouchableOpacity 
          style={[ds.actionBtn, { backgroundColor: reminder.is_completed ? 'rgba(16, 185, 129, 0.1)' : theme.primary, borderColor: reminder.is_completed ? '#10B981' : theme.border, borderWidth: 1.2 }]}
          onPress={() => toggleCompletedMutation.mutate()}
        >
          <Ionicons 
            name={reminder.is_completed ? "checkmark-circle" : "ellipse-outline"} 
            size={22} 
            color={reminder.is_completed ? "#10B981" : "#FFFFFF"} 
            style={{ marginRight: 10 }}
          />
          <Text style={[ds.actionText, { color: reminder.is_completed ? "#10B981" : "#FFFFFF", fontWeight: '700' }]}>
            {reminder.is_completed ? "Dose Taken ✓" : "Mark as Taken"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={ds.editBtn}
          onPress={() => router.push({ pathname: '/reminder/create', params: { editId: id } })}
        >
          <LinearGradient colors={colors.gradient.primary} style={ds.editGradient}>
            <Text style={ds.editText}>Edit Reminder</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

function getCategoryColor(type: string, colors: any, theme: any) {
  switch (type.toLowerCase()) {
    case 'meeting': return colors.accent.emerald;
    case 'assignment': return colors.accent.sky;
    case 'event': return colors.accent.violet;
    case 'birthday': return colors.accent.amber;
    default: return theme.primary;
  }
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
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 25,
  },
  badgeItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 15,
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
  progressSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressValue: {
    fontSize: 13,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...getThemedShadow(theme, 'medium'),
  },
  actionText: {
    fontSize: 15,
  },
});
