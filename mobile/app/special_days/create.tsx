import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { importantDaysApi } from '../../src/api/important_days';
import { useTheme } from '../../src/hooks/useTheme';
import { typography } from '../../src/theme';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import ScreenContainer from '../../src/components/ScreenContainer';

const CELEBRATION_TYPES = [
  { label: '🎂 Birthday', value: 'Birthday' },
  { label: '💍 Anniversary', value: 'Wedding Anniversary' },
  { label: '💎 Engagement', value: 'Engagement' },
  { label: '🎊 Festival', value: 'Festival' },
  { label: '🤝 Meeting', value: 'Meeting' },
  { label: '🏆 Achievement', value: 'Achievement' },
  { label: '📸 Memory', value: 'Personal Memory' },
  { label: '✨ Custom', value: 'Custom Event' },
];

export default function CreateSpecialDayScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId: string }>();
  const isEditing = !!editId;
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [giftIdeas, setGiftIdeas] = useState('');
  const [celebrationPlans, setCelebrationPlans] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState('Birthday');
  const [customType, setCustomType] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);

  const getPlaceholdersForType = (currentType: string) => {
    const t = currentType.toLowerCase();
    if (t.includes('birthday')) {
      return {
        gift: "What would they love for their birthday?",
        plans: "Dinner party, weekend getaway, cake delivery...",
        reminder: "Buy cake 3 days before, send morning text...",
        draft: "Happy Birthday! Wishing you a fantastic year ahead! 🎂✨",
      };
    }
    if (t.includes('wedding') || t.includes('anniversary')) {
      return {
        gift: "Traditional/modern gift or special surprise?",
        plans: "Romantic dinner, renewing vows, anniversary trip...",
        reminder: "Book restaurant 2 weeks early, order flowers...",
        draft: "Happy Anniversary! Cheers to many more years of love and happiness! ❤️🥂",
      };
    }
    if (t.includes('festival')) {
      return {
        gift: "Sweets, traditional clothes, festive decor...",
        plans: "Family gathering, prayers, decoration, cooking...",
        reminder: "Clean house weekend before, order festival items...",
        draft: "Wishing you and your family a very happy and blessed festival! 🪔🎉",
      };
    }
    if (t.includes('meeting')) {
      return {
        gift: "Meeting agenda, notes, slides, printouts...",
        plans: "Discuss projects, goals, sync up team...",
        reminder: "Send calendar invite 1 day before, prepare notes...",
        draft: "Looking forward to our meeting today! 🤝",
      };
    }
    if (t.includes('achievement')) {
      return {
        gift: "Trophy, plaque, reward, celebration lunch...",
        plans: "Award ceremony, announcement post, sharing with team...",
        reminder: "Post on LinkedIn, congratulate on Slack/Teams...",
        draft: "Huge congratulations on this incredible achievement! So well deserved! 🏆⭐",
      };
    }
    return {
      gift: "Any gift ideas or preparation lists?",
      plans: "What are the plans for this special day?",
      reminder: "Any milestone reminders or prep work?",
      draft: "Best wishes for this special day! Hope it's wonderful! 🎉",
    };
  };

  const placeholders = getPlaceholdersForType(type);

  const { data: existingDay, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['important-days', editId],
    queryFn: () => importantDaysApi.getImportantDayById(Number(editId)),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingDay) {
      setTitle(existingDay.title || existingDay.person_name || '');
      setNotes(existingDay.notes || '');
      setGiftIdeas(existingDay.gift_ideas || '');
      setCelebrationPlans(existingDay.celebration_plans || '');
      setReminderNotes(existingDay.reminder_notes || '');
      setMessageDraft(existingDay.message_draft || '');
      setDate(new Date(existingDay.date || existingDay.birth_date || new Date()));
      setType(existingDay.type || 'Birthday');
      setCustomType(existingDay.custom_type || '');
      setIsRecurring(existingDay.is_recurring !== undefined ? existingDay.is_recurring : true);
    }
  }, [existingDay]);

  const mutation = useMutation({
    mutationFn: async () => {
      const importantDayData = {
        title,
        date: date.toISOString().split('T')[0],
        type,
        is_recurring: isRecurring,
        custom_type: type === 'Custom Event' ? customType : null,
        notes,
        gift_ideas: giftIdeas,
        celebration_plans: celebrationPlans,
        reminder_notes: reminderNotes,
        message_draft: messageDraft,
      };

      if (isEditing) {
        console.log("[SPECIAL DAY UPDATE]", editId, importantDayData);
        await importantDaysApi.updateImportantDay(Number(editId), importantDayData);
      } else {
        console.log("[SPECIAL DAY CREATE]", importantDayData);
        await importantDaysApi.createImportantDay(importantDayData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['important-days'] });
      queryClient.invalidateQueries({ queryKey: ['important-days', editId] });
      queryClient.invalidateQueries({ queryKey: ['today-important-days'] });
      queryClient.invalidateQueries({ queryKey: ['special-days'] });
      queryClient.invalidateQueries({ queryKey: ['today-special-days'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      router.back();
    },
    onError: (error) => {
      console.error('Error saving special day:', error);
      Alert.alert('Error', 'Failed to save special day. Please try again.');
    }
  });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter a title or event name.');
      return;
    }
    if (type === 'Custom Event' && !customType.trim()) {
      Alert.alert('Missing Info', 'Please specify your custom event type.');
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={ds.header}>
          <TouchableOpacity onPress={() => router.back()} style={ds.backBtn}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={ds.headerTitle}>{isEditing ? 'Edit Special Day' : 'Add Special Day'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={mutation.isPending}>
            <LinearGradient 
              colors={colors.gradient.primary} 
              style={[ds.saveBtn, mutation.isPending && { opacity: 0.7 }]}
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={ds.saveText}>{isEditing ? 'Save' : 'Add'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={ds.content} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={ds.illustrationBox}>
            <View style={ds.iconCircle}>
              <Ionicons name={isEditing ? "pencil" : "sparkles-outline"} size={40} color={theme.primary} />
            </View>
          </View>

          <Text style={ds.label}>Event Title / Name</Text>
          <TextInput
            style={ds.input}
            placeholder="e.g. John's Birthday, Team Review Meeting"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={ds.label}>Event Type</Text>
          <View style={ds.chipsContainer}>
            {CELEBRATION_TYPES.map((item) => {
              const isSelected = type === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[ds.chip, isSelected && ds.chipSelected]}
                  onPress={() => setType(item.value)}
                >
                  <Text style={[ds.chipText, isSelected && ds.chipTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {type === 'Custom Event' && (
            <>
              <Text style={ds.label}>Specify Custom Type</Text>
              <TextInput
                style={ds.inputField}
                placeholder="e.g. Graduation, Housewarming"
                value={customType}
                onChangeText={setCustomType}
                placeholderTextColor={colors.text.tertiary}
              />
            </>
          )}

          <View style={ds.switchRow}>
            <View>
              <Text style={ds.switchLabel}>Recurring Event</Text>
              <Text style={ds.switchSubLabel}>Repeat this celebration every year</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={isRecurring ? '#7C3AED' : '#F3F4F6'}
            />
          </View>

          <Text style={ds.label}>When is it?</Text>
          <TouchableOpacity 
            style={ds.datePickerBtn} 
            onPress={() => setShowDatePicker(true)}
          >
            <View style={ds.dateIconBox}>
               <Ionicons name="calendar" size={22} color={theme.primary} />
            </View>
            <View>
              <Text style={ds.dateValue}>
                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <Text style={ds.dateHint}>Tap to change</Text>
            </View>
          </TouchableOpacity>

          <Text style={ds.label}>Gift/Idea Notes</Text>
          <TextInput
            style={ds.inputField}
            placeholder={placeholders.gift}
            value={giftIdeas}
            onChangeText={setGiftIdeas}
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={ds.label}>Celebration/Action Plans</Text>
          <TextInput
            style={ds.inputField}
            placeholder={placeholders.plans}
            value={celebrationPlans}
            onChangeText={setCelebrationPlans}
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={ds.label}>Reminder Notes</Text>
          <TextInput
            style={ds.inputField}
            placeholder={placeholders.reminder}
            value={reminderNotes}
            onChangeText={setReminderNotes}
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={ds.label}>Message Draft / Congratulation text</Text>
          <TextInput
            style={ds.textArea}
            placeholder={placeholders.draft}
            value={messageDraft}
            onChangeText={setMessageDraft}
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.text.tertiary}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 800, animated: true });
              }, 150);
            }}
          />

          <Text style={ds.label}>Additional Notes</Text>
          <TextInput
            style={ds.textArea}
            placeholder="Any other details..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.text.tertiary}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 150);
            }}
          />
          
          <View style={{ height: 100 }} />

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (selected) setDate(selected);
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  headerTitle: { ...typography.titleMedium, fontWeight: '800', color: theme.text },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  saveBtn: { paddingHorizontal: 25, paddingVertical: 10, borderRadius: 15 },
  saveText: { ...typography.bodyMedium, color: '#FFFFFF', fontWeight: '700' },
  content: { paddingHorizontal: 25 },
  illustrationBox: {
    alignItems: 'center',
    marginVertical: 30,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: isDark ? '#1C2638' : colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    ...getThemedShadow(theme, 'soft'),
  },
  label: { 
    ...typography.caption, 
    color: theme.textSecondary, 
    fontWeight: '800', 
    marginTop: 25, 
    marginBottom: 10, 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: { 
    ...typography.titleLarge, 
    fontWeight: '800', 
    color: theme.text, 
    paddingBottom: 12, 
    borderBottomWidth: 1.2, 
    borderBottomColor: theme.border,
  },
  inputField: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: theme.text,
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 16,
    marginTop: 5,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.card,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  chipSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: 20,
    borderRadius: 22,
    marginTop: 20,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  switchSubLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: 20,
    borderRadius: 22,
    marginTop: 5,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  dateIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1.2,
    borderColor: theme.border,
    ...getThemedShadow(theme, 'soft'),
  },
  dateValue: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: theme.text,
  },
  dateHint: {
    ...typography.caption,
    color: theme.textSecondary,
    marginTop: 2,
  },
  textArea: { 
    ...typography.bodyMedium, 
    color: theme.text, 
    backgroundColor: theme.card, 
    borderRadius: 22, 
    padding: 20, 
    height: 120, 
    textAlignVertical: 'top',
    marginTop: 5,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
});
