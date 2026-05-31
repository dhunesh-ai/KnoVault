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
import Animated, { 
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { getFadeInDown } from '../../src/utils/animations';
import { remindersApi } from '../../src/api/reminders';
import { importantDaysApi } from '../../src/api/important_days';
import { scheduleLocalReminder } from '../../src/utils/localNotifications';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, borderRadius } from '../../src/theme';
import { getLocalDateString, formatTimeStringTo12Hour } from '../../src/utils/date';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import ScreenContainer from '../../src/components/ScreenContainer';

const { width } = Dimensions.get('window');

const REMINDER_TYPES = ['Meeting', 'Assignment', 'Birthday', 'Event', 'Medicine', 'Custom'];

// Medicine suggestion presets
const MEDICINE_PRESETS = [
  'Paracetamol', 'Vitamin D', 'Syrup', 'Eye Drops', 'Ointment', 
  'Insulin', 'Tonic', 'Tablet', 'Capsule'
];

const MEDICINE_TYPES = [
  'Tablet 💊', 'Syrup 🧴', 'Injection 💉', 'Drops 👁️', 
  'Ointment 🧴', 'Capsule 💊', 'Tonic 🍯', 'Inhaler 🌬️'
];

const DOSAGE_PRESETS = ['1 tablet', '5ml', '2 capsules', '2 drops', '1 puff'];

const FOOD_TIMINGS = ['Before Food', 'After Food', 'With Food', 'Empty Stomach'];

const FREQUENCIES = [
  'Once Daily', 'Twice Daily', 'Three Times Daily', 'Every X Hours', 
  'Weekly', 'Custom Schedule'
];

const DAILY_TIMINGS = [
  'Morning 🌅', 'Breakfast 🍳', 'Lunch 🍱', 'Evening 🌇', 
  'Dinner 🍽️', 'Night 🌙'
];

const DURATION_PRESETS = ['3 days', '5 days', '1 week', '1 month'];

// Custom presets
const CUSTOM_NAME_PRESETS = [
  'Doctor Appointment', 'Gym Session', 'Water Reminder', 'Prayer Time', 
  'Study Session', 'Interview', 'Travel Plan'
];

const CUSTOM_ICONS = [
  { name: '🩺 Health', icon: 'medical' },
  { name: '📚 Study', icon: 'book' },
  { name: '✈️ Travel', icon: 'airplane' },
  { name: '💧 Water', icon: 'water' },
  { name: '🏋️ Fitness', icon: 'barbell' },
  { name: '🙏 Prayer', icon: 'heart' },
  { name: '🎯 Personal', icon: 'trophy' }
];

export default function CreateReminderScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  const { initialDate, editId } = useLocalSearchParams<{ initialDate?: string; editId?: string }>();
  const isEditing = !!editId;
  const queryClient = useQueryClient();

  // Basic Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Meeting');
  
  // Medicine Fields
  const [medName, setMedName] = useState('');
  const [medType, setMedType] = useState('Tablet 💊');
  const [dosage, setDosage] = useState('1 tablet');
  const [foodTiming, setFoodTiming] = useState('After Food');
  const [frequency, setFrequency] = useState('Once Daily');
  const [selectedTimings, setSelectedTimings] = useState<string[]>(['Breakfast 🍳']);
  const [duration, setDuration] = useState('5 days');
  const [medNotes, setMedNotes] = useState('');
  const [timingTimes, setTimingTimes] = useState<Record<string, string>>({
    'Morning 🌅': '08:00',
    'Breakfast 🍳': '08:30',
    'Lunch 🍱': '13:00',
    'Evening 🌇': '17:00',
    'Dinner 🍽️': '20:30',
    'Night 🌙': '22:00',
  });
  const [activeTimingForTimePicker, setActiveTimingForTimePicker] = useState<string | null>(null);
  const [showTimingTimePicker, setShowTimingTimePicker] = useState(false);

  // Custom Fields
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('🎯 Personal');

  // Date / Time
  const [date, setDate] = useState(() => {
    if (initialDate) {
      return new Date(initialDate);
    }
    return new Date(Date.now() + 60 * 60 * 1000);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Fetch data if editing
  const { data: existingReminder, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['reminders', editId],
    queryFn: () => remindersApi.getReminder(Number(editId)),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingReminder) {
      const rawType = existingReminder.type || 'meeting';
      const matchedType = REMINDER_TYPES.find(t => t.toLowerCase() === rawType.toLowerCase()) || 'Custom';
      setType(matchedType);
      
      if (existingReminder.reminder_date) {
        setDate(new Date(existingReminder.reminder_date));
      }

      // Try to parse structured description
      try {
        if (existingReminder.description && existingReminder.description.startsWith('{')) {
          const parsed = JSON.parse(existingReminder.description);
          if (parsed.isMedicine) {
            setMedName(parsed.medName || '');
            setMedType(parsed.medType || 'Tablet 💊');
            setDosage(parsed.dosage || '1 tablet');
            setFoodTiming(parsed.foodTiming || 'After Food');
            setFrequency(parsed.frequency || 'Once Daily');
            setSelectedTimings(parsed.timings || []);
            if (parsed.timing_times) {
              setTimingTimes(parsed.timing_times);
            }
            setDuration(parsed.duration || '5 days');
            setMedNotes(parsed.notes || '');
            setTitle(parsed.medName || '');
          } else if (parsed.isCustom) {
            setCustomName(parsed.customName || '');
            setCustomIcon(parsed.customIcon || '🎯 Personal');
            setDescription(parsed.notes || '');
            setTitle(existingReminder.title);
          }
        } else {
          // Standard reminder fallback
          setTitle(existingReminder.title);
          setDescription(existingReminder.description || '');
        }
      } catch (e) {
        setTitle(existingReminder.title);
        setDescription(existingReminder.description || '');
      }
    }
  }, [existingReminder]);

  const triggerHaptic = async (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      await Haptics.impactAsync(style);
    } catch (e) {
      console.log('[Haptics Not Available]', e);
    }
  };

  const toggleTiming = (timing: string) => {
    triggerHaptic();
    setSelectedTimings(prev => 
      prev.includes(timing) 
        ? prev.filter(t => t !== timing) 
        : [...prev, timing]
    );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      console.log(isEditing ? '[UPDATE REMINDER]' : '[CREATE REMINDER]');
      
      let finalTitle = title;
      let finalDescription = description;
      let finalType = type.toLowerCase();

      if (type === 'Medicine') {
        finalTitle = `💊 Take ${medName}`;
        finalDescription = JSON.stringify({
          isMedicine: true,
          medName,
          medType,
          dosage,
          foodTiming,
          frequency,
          timings: selectedTimings,
          timing_times: timingTimes,
          duration,
          notes: medNotes
        });
      } else if (type === 'Custom') {
        finalTitle = `${customIcon.split(' ')[0]} ${title || customName}`;
        finalDescription = JSON.stringify({
          isCustom: true,
          customName: customName || title,
          customIcon,
          notes: description
        });
      }

      const payload = {
        title: finalTitle,
        description: finalDescription,
        type: finalType as any,
        custom_type: type === 'Custom' ? customName : null,
        reminder_date: date.toISOString(),
      };
      
      console.log('Payload:', JSON.stringify(payload, null, 2));

      if (isEditing) {
        await remindersApi.updateReminder(Number(editId), payload);
      } else {
        if (type === 'Birthday') {
          await importantDaysApi.createImportantDay({
            title: title,
            type: 'Birthday',
            date: getLocalDateString(date),
            notes: description,
            is_recurring: true
          });
          
          scheduleLocalReminder(
            title, 
            description || "Don't forget to celebrate! 🎉", 
            date, 
            { type: 'special_day' },
            'special_days',
            'REMINDER_ACTION',
            'yearly'
          ).catch(e => console.warn('Notification scheduling failed:', e));

        } else {
          const res = await remindersApi.createReminder(payload);
          
          let repeatingMode: any = undefined;
          if (type === 'Medicine') {
             if (frequency.includes('Daily')) repeatingMode = 'daily';
             else if (frequency.includes('Weekly')) repeatingMode = 'weekly';
             
             console.log("[MEDICINE REMINDER SAVE] Initializing notifications...");
             
             for (const timing of selectedTimings) {
                const timeStr = timingTimes[timing] || '08:00';
                const [hrStr, minStr] = timeStr.split(':');
                const triggerDate = new Date(date);
                triggerDate.setHours(parseInt(hrStr, 10));
                triggerDate.setMinutes(parseInt(minStr, 10));
                triggerDate.setSeconds(0);
                triggerDate.setMilliseconds(0);
                
                const now = new Date();
                
                console.log("[MEDICINE NOTIFICATION SCHEDULE START] Timing:", timing);
                console.log("Current Time:", now.toISOString());
                console.log("Reminder Time:", timeStr);
                console.log("Computed Trigger:", triggerDate.toISOString());
                console.log("Difference In Minutes:", (triggerDate.getTime() - now.getTime()) / 60000);
                
                if (triggerDate.getTime() <= now.getTime()) {
                  if (repeatingMode === 'daily') {
                    // It's a daily alarm, but today's time passed. Roll over to tomorrow for initial trigger.
                    triggerDate.setDate(triggerDate.getDate() + 1);
                    console.log("[TRIGGER FUTURE CHECK] Rolled over to tomorrow:", triggerDate.toISOString());
                  } else {
                    console.log("[TRIGGER FUTURE CHECK] Rejected: Date is in the past and not daily.", triggerDate.getTime(), now.getTime());
                  }
                } else {
                  console.log("[TRIGGER FUTURE CHECK] Valid future date:", triggerDate.toISOString());
                }
                
                try {
                  await scheduleLocalReminder(
                    finalTitle, 
                    type === 'Medicine' ? medNotes : (description || "You have a scheduled reminder."), 
                    triggerDate, 
                    { type: 'reminder', id: res.id || null },
                    'reminders',
                    'REMINDER_ACTION',
                    repeatingMode
                  );
                  console.log("[MEDICINE NOTIFICATION CREATED]");
                  console.log("Title:", finalTitle);
                  console.log("Trigger ISO:", triggerDate.toISOString());
                } catch (e) {
                  console.error("[MEDICINE NOTIFICATION ERROR]", e);
                }
             }
          } else {
            await scheduleLocalReminder(
              finalTitle, 
              description || "You have a scheduled reminder.", 
              date, 
              { type: 'reminder', id: res.id || null },
              'reminders',
              'REMINDER_ACTION',
              repeatingMode
            ).catch(e => console.warn('Notification scheduling failed:', e));
          }
          
          const Notifications = require('expo-notifications');
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          console.log(
            '[ALL SCHEDULED MEDICINE NOTIFICATIONS]',
            JSON.stringify(scheduled.filter((n: any) => n.content.data?.type === 'reminder'), null, 2)
          );
        }
      }
    },
    onSuccess: async () => {
      console.log('[SAVE-REMINDER] Success! Invalidating caches...');
      await queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      await queryClient.invalidateQueries({ queryKey: ['reminders'] });
      router.back();
    },
    onError: (error) => {
      console.error('[SAVE-REMINDER] Error:', error);
      Alert.alert('Error', 'Failed to save reminder.');
    }
  });

  const handleSave = () => {
    if (type === 'Medicine') {
      if (!medName.trim()) {
        Alert.alert('Validation Error', 'Medicine Name is required.');
        return;
      }
      if (!dosage.trim()) {
        Alert.alert('Validation Error', 'Dosage information is required.');
        return;
      }
      if (selectedTimings.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one daily timing.');
        return;
      }
    } else if (type === 'Custom') {
      if (!title.trim() && !customName.trim()) {
        Alert.alert('Validation Error', 'Reminder title or custom category name is required.');
        return;
      }
    } else {
      if (!title.trim()) {
        Alert.alert('Validation Error', 'Reminder Title is required.');
        return;
      }
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate();
  };

  const getReminderIcon = (category: string) => {
    switch (category) {
      case 'Meeting': return 'people';
      case 'Assignment': return 'document';
      case 'Birthday': return 'gift';
      case 'Event': return 'calendar';
      case 'Medicine': return 'medical';
      default: return 'bookmark';
    }
  };

  const ds = styles(theme, isDark, colors);

  if (isEditing && isLoadingExisting) {
    return (
      <ScreenContainer style={[ds.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ScreenContainer>
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
          {isEditing ? 'Edit Reminder' : 'New Reminder'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={mutation.isPending}>
          <LinearGradient colors={colors.gradient.primary} style={[ds.saveBtn, mutation.isPending && { opacity: 0.7 }]}>
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={ds.saveText}>{isEditing ? 'Save' : 'Set'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={ds.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Category Cards / Chips */}
        <Text style={ds.sectionTitle}>Select Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds.chipRow}>
          {REMINDER_TYPES.map(t => {
            const isSelected = type === t;
            const iconName = getReminderIcon(t);
            return (
              <TouchableOpacity 
                key={t} 
                style={[
                  ds.chip, 
                  { backgroundColor: theme.card, borderColor: theme.border },
                  isSelected && ds.chipActive
                ]}
                onPress={() => {
                  triggerHaptic();
                  setType(t);
                }}
              >
                <Ionicons 
                  name={iconName as any} 
                  size={16} 
                  color={isSelected ? '#FFFFFF' : theme.textSecondary} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[
                  ds.chipText, 
                  { color: theme.textSecondary },
                  isSelected && ds.chipTextActive
                ]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ────────── DYNAMIC FORMS ────────── */}

        {/* NORMAL REMINDER FORM */}
        {type !== 'Medicine' && type !== 'Custom' && (
          <Animated.View entering={getFadeInDown(0, 200)} style={ds.formCard}>
            <Text style={ds.label}>Reminder Title</Text>
            <TextInput
              style={ds.titleInput}
              placeholder="e.g. Sync with Design Team"
              placeholderTextColor={colors.text.tertiary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[ds.label, { marginTop: 20 }]}>Description (Optional)</Text>
            <TextInput
              style={ds.descInput}
              placeholder="Add details, links, or notes..."
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Animated.View>
        )}

        {/* MEDICINE REMINDER FORM */}
        {type === 'Medicine' && (
          <Animated.View entering={getFadeInDown(0, 200)}>
            {/* Card 1: Medicine Name & Type */}
            <View style={ds.formCard}>
              <View style={ds.fieldHeader}>
                <Ionicons name="medical-outline" size={18} color={theme.primary} />
                <Text style={ds.fieldLabel}>Medicine Details</Text>
              </View>

              <Text style={ds.subLabel}>Medicine Name</Text>
              <TextInput
                style={ds.titleInput}
                placeholder="e.g. Paracetamol"
                placeholderTextColor={colors.text.tertiary}
                value={medName}
                onChangeText={(text) => {
                  setMedName(text);
                  setTitle(text);
                }}
              />

              {/* Medicine Name Presets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds.presetRow}>
                {MEDICINE_PRESETS.map((preset) => (
                  <TouchableOpacity 
                    key={preset} 
                    style={[ds.presetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                    onPress={() => {
                      triggerHaptic();
                      setMedName(preset);
                      setTitle(preset);
                    }}
                  >
                    <Text style={[ds.presetText, { color: theme.textSecondary }]}>{preset}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[ds.subLabel, { marginTop: 15 }]}>Medicine Type</Text>
              <View style={ds.grid}>
                {MEDICINE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      ds.gridItem,
                      { backgroundColor: theme.background, borderColor: theme.border },
                      medType === t && ds.gridItemActive
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setMedType(t);
                    }}
                  >
                    <Text style={[ds.gridText, { color: theme.textSecondary }, medType === t && ds.gridTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Card 2: Dosage & Food Timing */}
            <View style={ds.formCard}>
              <View style={ds.fieldHeader}>
                <Ionicons name="flask-outline" size={18} color={theme.primary} />
                <Text style={ds.fieldLabel}>Dosage & Food Intake</Text>
              </View>

              <Text style={ds.subLabel}>Dosage</Text>
              <TextInput
                style={ds.titleInput}
                placeholder="e.g. 1 tablet"
                placeholderTextColor={colors.text.tertiary}
                value={dosage}
                onChangeText={setDosage}
              />

              {/* Dosage Presets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds.presetRow}>
                {DOSAGE_PRESETS.map((preset) => (
                  <TouchableOpacity 
                    key={preset} 
                    style={[ds.presetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                    onPress={() => {
                      triggerHaptic();
                      setDosage(preset);
                    }}
                  >
                    <Text style={[ds.presetText, { color: theme.textSecondary }]}>{preset}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[ds.subLabel, { marginTop: 15 }]}>Food Timing</Text>
              <View style={ds.grid}>
                {FOOD_TIMINGS.map((ft) => (
                  <TouchableOpacity
                    key={ft}
                    style={[
                      ds.gridItem,
                      { backgroundColor: theme.background, borderColor: theme.border },
                      foodTiming === ft && ds.gridItemActive
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setFoodTiming(ft);
                    }}
                  >
                    <Text style={[ds.gridText, { color: theme.textSecondary }, foodTiming === ft && ds.gridTextActive]}>
                      {ft}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Card 3: Schedule & Frequency */}
            <View style={ds.formCard}>
              <View style={ds.fieldHeader}>
                <Ionicons name="time-outline" size={18} color={theme.primary} />
                <Text style={ds.fieldLabel}>Frequency & Timings</Text>
              </View>

              <Text style={ds.subLabel}>Frequency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds.presetRow}>
                {FREQUENCIES.map((freq) => (
                  <TouchableOpacity 
                    key={freq} 
                    style={[
                      ds.presetBtn, 
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' },
                      frequency === freq && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setFrequency(freq);
                    }}
                  >
                    <Text style={[
                      ds.presetText, 
                      { color: theme.textSecondary },
                      frequency === freq && { color: '#FFFFFF' }
                    ]}>{freq}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[ds.subLabel, { marginTop: 15 }]}>Daily Timing Selector (Multiple)</Text>
              <View style={ds.grid}>
                {DAILY_TIMINGS.map((dt) => {
                  const isSelected = selectedTimings.includes(dt);
                  return (
                    <TouchableOpacity
                      key={dt}
                      style={[
                        ds.gridItem,
                        { backgroundColor: theme.background, borderColor: theme.border },
                        isSelected && ds.gridItemActive
                      ]}
                      onPress={() => toggleTiming(dt)}
                    >
                      <Text style={[ds.gridText, { color: theme.textSecondary }, isSelected && ds.gridTextActive]}>
                        {dt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedTimings.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={ds.subLabel}>Configure Dose Times</Text>
                  {selectedTimings.map((dt) => {
                    const timeStr = timingTimes[dt] || '08:00';
                    return (
                      <View key={dt} style={ds.timingTimeRow}>
                        <Text style={ds.timingTimeLabel}>{dt}</Text>
                        <TouchableOpacity
                          style={ds.timingTimeButton}
                          onPress={() => {
                            triggerHaptic();
                            setActiveTimingForTimePicker(dt);
                            setShowTimingTimePicker(true);
                          }}
                        >
                          <Ionicons name="time-outline" size={16} color={theme.primary} />
                          <Text style={ds.timingTimeText}>
                            {formatTimeStringTo12Hour(timeStr)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={[ds.subLabel, { marginTop: 15 }]}>Duration Course</Text>
              <TextInput
                style={ds.titleInput}
                placeholder="e.g. 5 days"
                placeholderTextColor={colors.text.tertiary}
                value={duration}
                onChangeText={setDuration}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds.presetRow}>
                {DURATION_PRESETS.map((preset) => (
                  <TouchableOpacity 
                    key={preset} 
                    style={[ds.presetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                    onPress={() => {
                      triggerHaptic();
                      setDuration(preset);
                    }}
                  >
                    <Text style={[ds.presetText, { color: theme.textSecondary }]}>{preset}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Card 4: Additional Notes */}
            <View style={ds.formCard}>
              <View style={ds.fieldHeader}>
                <Ionicons name="chatbubble-outline" size={18} color={theme.primary} />
                <Text style={ds.fieldLabel}>Special Instructions</Text>
              </View>
              <TextInput
                style={ds.descInput}
                placeholder="e.g. Take after breakfast, avoid cold drinks..."
                placeholderTextColor={colors.text.tertiary}
                value={medNotes}
                onChangeText={setMedNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </Animated.View>
        )}

        {/* CUSTOM CATEGORY FORM */}
        {type === 'Custom' && (
          <Animated.View entering={getFadeInDown(0, 200)} style={ds.formCard}>
            <View style={ds.fieldHeader}>
              <Ionicons name="create-outline" size={18} color={theme.primary} />
              <Text style={ds.fieldLabel}>Custom Category Details</Text>
            </View>

            <Text style={ds.subLabel}>Category Name</Text>
            <TextInput
              style={ds.titleInput}
              placeholder="e.g. Water Reminder, Gym Session"
              placeholderTextColor={colors.text.tertiary}
              value={customName}
              onChangeText={(text) => {
                setCustomName(text);
                if (!title) setTitle(text);
              }}
            />

            {/* Custom Name Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds.presetRow}>
              {CUSTOM_NAME_PRESETS.map((preset) => (
                <TouchableOpacity 
                  key={preset} 
                  style={[ds.presetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                  onPress={() => {
                    triggerHaptic();
                    setCustomName(preset);
                    if (!title) setTitle(preset);
                  }}
                >
                  <Text style={[ds.presetText, { color: theme.textSecondary }]}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[ds.subLabel, { marginTop: 15 }]}>Reminder Label / Title</Text>
            <TextInput
              style={ds.titleInput}
              placeholder="e.g. Drink 500ml water"
              placeholderTextColor={colors.text.tertiary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[ds.subLabel, { marginTop: 15 }]}>Select Custom Icon</Text>
            <View style={ds.grid}>
              {CUSTOM_ICONS.map((ci) => (
                <TouchableOpacity
                  key={ci.name}
                  style={[
                    ds.gridItem,
                    { backgroundColor: theme.background, borderColor: theme.border },
                    customIcon === ci.name && ds.gridItemActive
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setCustomIcon(ci.name);
                  }}
                >
                  <Ionicons 
                    name={ci.icon as any} 
                    size={16} 
                    color={customIcon === ci.name ? '#FFFFFF' : theme.textSecondary} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[ds.gridText, { color: theme.textSecondary }, customIcon === ci.name && ds.gridTextActive]}>
                    {ci.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[ds.subLabel, { marginTop: 15 }]}>Notes (Optional)</Text>
            <TextInput
              style={ds.descInput}
              placeholder="Add extra details..."
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Animated.View>
        )}

        {/* ────────── SCHEDULE CARD ────────── */}
        <View style={ds.formCard}>
          <View style={ds.fieldHeader}>
            <Ionicons name="time-outline" size={18} color={theme.primary} />
            <Text style={ds.fieldLabel}>{type === 'Medicine' ? 'Start Date' : 'Alert Schedule'}</Text>
          </View>
          <View style={ds.dateTimeRow}>
            <TouchableOpacity 
              style={[ds.dateTimeBtn, type === 'Medicine' && { flex: 1 }]} 
              onPress={() => { triggerHaptic(); setShowDatePicker(true); }}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              <Text style={ds.dateTimeText}>
                {type === 'Medicine' ? `Starts: ${date.toLocaleDateString()}` : date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {type !== 'Medicine' && (
              <TouchableOpacity style={ds.dateTimeBtn} onPress={() => { triggerHaptic(); setShowTimePicker(true); }}>
                <Ionicons name="time-outline" size={20} color={theme.primary} />
                <Text style={ds.dateTimeText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ────────── SMART LIVE PREVIEW ────────── */}
        <Text style={ds.sectionTitle}>Smart Live Preview</Text>
        <View style={[ds.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {type === 'Medicine' ? (
            <View>
              <View style={ds.previewHeader}>
                <Text style={ds.previewCategory}>MEDICINE SCHEDULE 💊</Text>
                <View style={ds.previewStatus}>
                  <Text style={ds.previewStatusText}>Active Course</Text>
                </View>
              </View>
              <Text style={[ds.previewTitle, { color: theme.text }]}>
                {medName || 'Medicine Name'}
              </Text>
              <Text style={[ds.previewSub, { color: theme.textSecondary }]}>
                {dosage} • {foodTiming}
              </Text>
              <View style={ds.previewTimingRow}>
                <Ionicons name="alarm-outline" size={14} color={theme.primary} />
                <Text style={[ds.previewTimingText, { color: theme.textSecondary }]}>
                  {selectedTimings.length > 0 
                    ? selectedTimings.map(t => `${t.split(' ')[0]} (${formatTimeStringTo12Hour(timingTimes[t] || '08:00')})`).join(' & ')
                    : 'No timings selected'}
                </Text>
              </View>
              <Text style={[ds.previewDuration, { color: theme.primary }]}>
                Course Duration: {duration}
              </Text>
            </View>
          ) : type === 'Custom' ? (
            <View>
              <View style={ds.previewHeader}>
                <Text style={ds.previewCategory}>{customIcon.toUpperCase()}</Text>
                <Text style={ds.previewTime}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={[ds.previewTitle, { color: theme.text }]}>
                {title || customName || 'Untitled Custom Alert'}
              </Text>
              <Text style={[ds.previewSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {description || 'No description provided'}
              </Text>
            </View>
          ) : (
            <View>
              <View style={ds.previewHeader}>
                <Text style={ds.previewCategory}>{type.toUpperCase()}</Text>
                <Text style={ds.previewTime}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={[ds.previewTitle, { color: theme.text }]}>
                {title || 'Untitled Reminder'}
              </Text>
              <Text style={[ds.previewSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {description || 'No description provided'}
              </Text>
            </View>
          )}
        </View>

        {/* Date Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            onChange={(event, selected) => {
              setShowDatePicker(false);
              if (selected) {
                const newDate = new Date(date);
                newDate.setFullYear(selected.getFullYear());
                newDate.setMonth(selected.getMonth());
                newDate.setDate(selected.getDate());
                setDate(newDate);
              }
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            onChange={(event, selected) => {
              setShowTimePicker(false);
              if (selected) {
                const newDate = new Date(date);
                newDate.setHours(selected.getHours());
                newDate.setMinutes(selected.getMinutes());
                newDate.setSeconds(0);
                setDate(newDate);
              }
            }}
          />
        )}
        {showTimingTimePicker && activeTimingForTimePicker && (
          <DateTimePicker
            value={(() => {
              const timeStr = timingTimes[activeTimingForTimePicker] || '08:00';
              const parts = timeStr.split(':');
              const h = parseInt(parts[0]) || 8;
              const m = parseInt(parts[1]) || 0;
              const d = new Date();
              d.setHours(h, m, 0, 0);
              return d;
            })()}
            mode="time"
            onChange={(event, selected) => {
              setShowTimingTimePicker(false);
              if (selected) {
                const h = String(selected.getHours()).padStart(2, '0');
                const m = String(selected.getMinutes()).padStart(2, '0');
                setTimingTimes(prev => ({
                  ...prev,
                  [activeTimingForTimePicker]: `${h}:${m}`
                }));
              }
              setActiveTimingForTimePicker(null);
            }}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  headerTitle: { ...typography.titleMedium, fontWeight: '800' },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  saveBtn: { paddingHorizontal: 25, paddingVertical: 10, borderRadius: 15 },
  saveText: { ...typography.bodyMedium, color: '#FFFFFF', fontWeight: '700' },
  content: { paddingHorizontal: 25 },
  sectionTitle: { 
    ...typography.caption, 
    color: theme.textSecondary, 
    fontWeight: '800', 
    marginTop: 20, 
    marginBottom: 10, 
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  chipRow: { flexDirection: 'row', marginBottom: 15 },
  chip: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 15, 
    marginRight: 10,
    borderWidth: 1.2,
  },
  chipActive: { 
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    ...getThemedShadow(theme, 'medium'),
  },
  chipText: { ...typography.bodySmall, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  formCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1.2,
    borderColor: theme.border,
    ...getThemedShadow(theme, 'soft'),
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  fieldLabel: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: theme.text,
  },
  label: { 
    ...typography.caption, 
    color: theme.textSecondary, 
    fontWeight: '800', 
    marginBottom: 8, 
    textTransform: 'uppercase' 
  },
  subLabel: {
    ...typography.caption,
    color: theme.textSecondary,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  titleInput: { 
    ...typography.bodyLarge, 
    fontWeight: '700', 
    color: theme.text, 
    paddingVertical: 8, 
    borderBottomWidth: 1.2, 
    borderBottomColor: theme.border,
    marginBottom: 8,
  },
  descInput: { 
    ...typography.bodyMedium, 
    color: theme.text, 
    backgroundColor: theme.background, 
    borderRadius: 15, 
    padding: 12, 
    height: 100, 
    textAlignVertical: 'top',
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  presetRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  gridItemActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  gridText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridTextActive: {
    color: '#FFFFFF',
  },
  dateTimeRow: { flexDirection: 'row', gap: 15 },
  dateTimeBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.background, 
    padding: 12, 
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  dateTimeText: { ...typography.bodyMedium, fontWeight: '700', color: theme.text, marginLeft: 10 },
  previewCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.2,
    borderLeftWidth: 6,
    borderLeftColor: theme.primary,
    ...getThemedShadow(theme, 'medium'),
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.primary,
    letterSpacing: 1.2,
  },
  previewStatus: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  previewSub: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  previewTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  previewTimingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewDuration: {
    fontSize: 11,
    fontWeight: '800',
  },
  previewTime: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  timingTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: theme.border,
    marginTop: 8,
  },
  timingTimeLabel: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: theme.text,
  },
  timingTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  timingTimeText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: theme.primary,
  },
});
