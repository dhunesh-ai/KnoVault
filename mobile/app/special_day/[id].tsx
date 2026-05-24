import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importantDaysApi } from '../../src/api/important_days';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';
import { formatLocalDateDisplay } from '../../src/utils/date';
import { calculateDaysRemaining, isImportantDayToday } from '../../src/utils/important_day';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { getThemedShadow } from '../../src/components/ThemedComponents';

const { width } = Dimensions.get('window');

export default function SpecialDayDetailScreen() {
  const { colors, theme, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  console.log("[SPECIAL DAY DETAILS OPEN]", id);

  const { data: importantDay, isLoading, error } = useQuery({
    queryKey: ['important-days', id],
    queryFn: () => importantDaysApi.getImportantDayById(Number(id)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => importantDaysApi.deleteImportantDay(Number(id)),
    onSuccess: () => {
      console.log("[SPECIAL DAY DELETE] Success", id);
      queryClient.invalidateQueries({ queryKey: ['important-days'] });
      queryClient.invalidateQueries({ queryKey: ['today-important-days'] });
      queryClient.invalidateQueries({ queryKey: ['special-days'] });
      queryClient.invalidateQueries({ queryKey: ['today-special-days'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      router.back();
    },
    onError: (err) => {
      console.error("[SPECIAL DAY DELETE] Error", err);
      Alert.alert('Error', 'Failed to delete special day');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete ${importantDay?.title}?`,
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

  if (error || !importantDay) {
    return (
      <View style={ds.center}>
        <Ionicons name="alert-circle-outline" size={60} color={theme.textSecondary} />
        <Text style={[ds.errorText, { color: theme.textSecondary }]}>Event not found</Text>
        <TouchableOpacity style={[ds.backBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={ds.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysRemaining = calculateDaysRemaining(importantDay.date, importantDay.is_recurring);
  const isToday = isImportantDayToday(importantDay.date, importantDay.is_recurring);

  const emojiMap: Record<string, string> = {
    'birthday': '🎂',
    'wedding anniversary': '💍',
    'engagement': '💎',
    'festival': '🎊',
    'meeting': '🤝',
    'achievement': '🏆',
    'personal memory': '📸',
    'custom event': '✨',
  };
  const eventTypeLower = (importantDay.type || 'birthday').toLowerCase();
  const mainEmoji = emojiMap[eventTypeLower] || '✨';

  const InfoCard = ({ icon, title, value, color }: { icon: string; title: string; value: string | null; color: string }) => {
    if (!value) return null;
    return (
      <Animated.View entering={FadeInDown.delay(100)} style={[ds.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[ds.infoIconBox, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <View style={ds.infoContent}>
          <Text style={[ds.infoTitle, { color: theme.textSecondary }]}>{title}</Text>
          <Text style={[ds.infoValue, { color: theme.text }]}>{value}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={ds.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={isDark ? ['#101A2E', '#081120'] : ['#F5F3FF', '#FFFFFF']}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={ds.header}>
          <TouchableOpacity onPress={() => router.back()} style={ds.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[ds.headerTitle, { color: theme.text }]}>Event Profile</Text>
          <TouchableOpacity onPress={handleDelete} style={ds.headerBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.accent.rose} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={ds.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <Animated.View entering={FadeInUp} style={ds.profileSection}>
            <View style={ds.avatarWrapper}>
              <LinearGradient
                colors={colors.gradient.primary}
                style={ds.avatarGradient}
              >
                <Text style={ds.avatarInitial}>{mainEmoji}</Text>
              </LinearGradient>
              {isToday && (
                <View style={[ds.todayBadge, { backgroundColor: colors.accent.rose }]}>
                  <Text style={ds.todayBadgeText}>🎉 Today</Text>
                </View>
              )}
            </View>
            <Text style={[ds.personName, { color: theme.text }]}>{importantDay.title}</Text>
            <Text style={[ds.birthDate, { color: theme.textSecondary }]}>
              {formatLocalDateDisplay(importantDay.date)} ({importantDay.type})
            </Text>
            {!importantDay.is_recurring && (
              <View style={[ds.oneTimeTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                <Text style={[ds.oneTimeTagText, { color: theme.textSecondary }]}>One-Time Event</Text>
              </View>
            )}
            
            <View style={ds.countdownContainer}>
              <View style={[ds.countdownBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[ds.countdownNumber, { color: colors.accent.violet }]}>
                  {isToday ? '🎉' : daysRemaining < 0 ? 'Passed' : daysRemaining}
                </Text>
                <Text style={[ds.countdownLabel, { color: theme.textSecondary }]}>
                  {isToday ? "It's Celebration Time!" : daysRemaining < 0 ? 'Event Date Passed' : 'Days Remaining'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Planning Sections */}
          <View style={ds.planningGrid}>
            <InfoCard 
              icon="gift-outline" 
              title="Gift / Idea Notes" 
              value={importantDay.gift_ideas || null} 
              color={colors.accent.rose} 
            />
            <InfoCard 
              icon="color-palette-outline" 
              title="Celebration / Action Plans" 
              value={importantDay.celebration_plans || null} 
              color={colors.accent.amber} 
            />
            <InfoCard 
              icon="notifications-outline" 
              title="Reminder Notes" 
              value={importantDay.reminder_notes || null} 
              color={colors.accent.sky} 
            />
            <InfoCard 
              icon="chatbubble-outline" 
              title="Message Draft / Congratulation text" 
              value={importantDay.message_draft || null} 
              color={colors.accent.emerald} 
            />
            <InfoCard 
              icon="document-text-outline" 
              title="Additional Notes" 
              value={importantDay.notes || null} 
              color={colors.accent.violet} 
            />
          </View>

          {/* Empty State for Planning */}
          {(!importantDay.gift_ideas && !importantDay.celebration_plans && !importantDay.reminder_notes && !importantDay.message_draft && !importantDay.notes) && (
            <View style={ds.emptyPlanning}>
              <Text style={[ds.emptyPlanningText, { color: theme.textSecondary }]}>No planning details yet. Tap edit to add planning details!</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Floating Action Buttons */}
        <View style={ds.actionContainer}>
          <TouchableOpacity 
            style={ds.editBtn}
            onPress={() => router.push({
              pathname: '/special_days/create',
              params: { editId: importantDay.id }
            })}
          >
            <LinearGradient colors={colors.gradient.primary} style={ds.editGradient}>
              <Ionicons name="pencil" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={ds.editText}>Edit Event</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    zIndex: 10,
  },
  headerTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: theme.border,
    ...getThemedShadow(theme, 'soft'),
  },
  scrollContent: {
    paddingBottom: 150,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 25,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    ...getThemedShadow(theme, 'medium'),
  },
  avatarInitial: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  todayBadge: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    ...getThemedShadow(theme, 'soft'),
  },
  todayBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  personName: {
    ...typography.displaySmall,
    fontWeight: '900',
    textAlign: 'center',
  },
  birthDate: {
    ...typography.bodyLarge,
    marginTop: 5,
    fontWeight: '600',
  },
  oneTimeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  oneTimeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countdownContainer: {
    marginTop: 25,
    width: '100%',
  },
  countdownBox: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  countdownLabel: {
    ...typography.caption,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planningGrid: {
    paddingHorizontal: 25,
    marginTop: 30,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1.2,
    ...getThemedShadow(theme, 'soft'),
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoTitle: {
    ...typography.caption,
    fontWeight: '800',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
    lineHeight: 20,
  },
  emptyPlanning: {
    paddingHorizontal: 40,
    marginTop: 20,
    alignItems: 'center',
  },
  emptyPlanningText: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actionContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 30,
    left: 25,
    right: 25,
  },
  editBtn: {
    ...getThemedShadow(theme, 'medium'),
  },
  editGradient: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  errorText: {
    ...typography.bodyLarge,
    marginTop: 15,
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 15,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
