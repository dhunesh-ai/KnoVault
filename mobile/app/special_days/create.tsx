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
import apiClient from '../../src/api/client';
import { REMINDER_OPTIONS } from '../../src/utils/important_day';
import { scheduleSpecialDaysReminders } from '../../src/utils/localNotifications';
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

  // Reminder State
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderType, setReminderType] = useState('1_day');
  const [reminderValue, setReminderValue] = useState('1');
  const [reminderUnit, setReminderUnit] = useState('days');
  const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Auto Email Wishes State
  const [autoSendEmail, setAutoSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSendTime, setEmailSendTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showEmailTimePicker, setShowEmailTimePicker] = useState(false);
  const [isGeneratingWish, setIsGeneratingWish] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailSuccess, setTestEmailSuccess] = useState(false);

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

      setReminderEnabled(existingDay.reminder_enabled === true || (existingDay as any).reminder_enabled === 1);
      setReminderType(existingDay.reminder_type || '1_day');
      setReminderValue(existingDay.reminder_value ? existingDay.reminder_value.toString() : '1');
      setReminderUnit(existingDay.reminder_unit || 'days');
      if (existingDay.reminder_time) {
        const [hours, minutes] = existingDay.reminder_time.split(':').map(Number);
        const t = new Date();
        t.setHours(hours, minutes, 0, 0);
        setReminderTime(t);
      }

      setAutoSendEmail(existingDay.auto_send_email === true);
      setRecipientEmail(existingDay.recipient_email || '');
      setEmailSubject(existingDay.email_subject || '');
      setEmailMessage(existingDay.email_message || '');
      if (existingDay.email_send_time) {
        const [hours, minutes] = existingDay.email_send_time.split(':').map(Number);
        const t = new Date();
        t.setHours(hours, minutes, 0, 0);
        setEmailSendTime(t);
      }
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
        reminder_enabled: reminderEnabled,
        reminder_type: reminderType,
        reminder_value: reminderType === 'custom' ? parseInt(reminderValue) || 1 : null,
        reminder_unit: reminderType === 'custom' ? reminderUnit : null,
        reminder_time: `${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime.getMinutes().toString().padStart(2, '0')}`,
        auto_send_email: autoSendEmail,
        recipient_email: autoSendEmail ? recipientEmail : null,
        email_subject: autoSendEmail ? emailSubject : null,
        email_message: autoSendEmail ? emailMessage : null,
        email_send_time: `${emailSendTime.getHours().toString().padStart(2, '0')}:${emailSendTime.getMinutes().toString().padStart(2, '0')}`,
        timezone: autoSendEmail ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') : null,
      };

      if (isEditing) {
        console.log("[SPECIAL DAY UPDATE]", editId, importantDayData);
        await importantDaysApi.updateImportantDay(Number(editId), importantDayData);
      } else {
        console.log("[SPECIAL DAY CREATE]", importantDayData);
        await importantDaysApi.createImportantDay(importantDayData);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['important-days'] });
      queryClient.invalidateQueries({ queryKey: ['important-days', editId] });
      queryClient.invalidateQueries({ queryKey: ['today-important-days'] });
      queryClient.invalidateQueries({ queryKey: ['special-days'] });
      queryClient.invalidateQueries({ queryKey: ['today-special-days'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      const { syncWorkspace } = require('../../src/services/sync');
      await syncWorkspace();
      
      scheduleSpecialDaysReminders();
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
    if (autoSendEmail) {
      if (!recipientEmail.trim()) {
        Alert.alert('Missing Info', 'Please enter a recipient email.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        Alert.alert('Invalid Email', 'Please enter a valid recipient email address.');
        return;
      }
      if (!emailSubject.trim()) {
        Alert.alert('Missing Info', 'Please enter an email subject.');
        return;
      }
      if (!emailMessage.trim()) {
        Alert.alert('Missing Info', 'Please enter an email message.');
        return;
      }
    }
    mutation.mutate();
  };

  const handleGenerateWish = async () => {
    const personName = title || 'Recipient';
    setIsGeneratingWish(true);
    try {
      const response = await apiClient.post<{ subject: string; message: string }>('/api/important-days/generate-wish', {
        type,
        person_name: personName,
        custom_type: type === 'Custom Event' ? customType : null,
      });
      if (response.data) {
        setEmailSubject(response.data.subject || '');
        setEmailMessage(response.data.message || '');
      }
    } catch (error) {
      console.log('[Generate Wish Fallback] API failed or offline, using local templates:', error);
      
      const senderName = 'Your Friend';
      const recip = personName;
      const t = type.toLowerCase();
      const customT = (customType || '').toLowerCase();
      
      let category = 'custom';
      if (t.includes('birthday') || customT.includes('birthday')) {
        category = 'birthday';
      } else if (t.includes('anniversary') || customT.includes('anniversary')) {
        category = 'anniversary';
      } else if (t.includes('graduation') || customT.includes('graduation')) {
        category = 'graduation';
      } else if (t.includes('wedding') || customT.includes('wedding')) {
        category = 'wedding';
      } else if (t.includes('job') || customT.includes('job') || t.includes('work') || customT.includes('work')) {
        category = 'new_job';
      } else if (t.includes('promotion') || customT.includes('promotion')) {
        category = 'promotion';
      } else if (t.includes('friendship') || customT.includes('friendship')) {
        category = 'friendship';
      } else if (t.includes('mother') || customT.includes('mother')) {
        category = 'mother';
      } else if (t.includes('father') || customT.includes('father')) {
        category = 'father';
      } else if (t.includes('valentin') || customT.includes('valentin')) {
        category = 'valentine';
      }
      
      const localTemplates: Record<string, { subject: string; message: string }[]> = {
        birthday: [
          { 
            subject: `Happy Birthday, ${recip}! 🎉`, 
            message: `Dear ${recip},\n\nWishing you a day filled with happiness, success, laughter, and unforgettable memories.\n\nMay this year bring new opportunities, great health, and endless joy.\n\nHave an amazing birthday!\n\nWarm wishes,\n${senderName}` 
          },
          { 
            subject: `Wishing you a wonderful Birthday, ${recip}! 🎂✨`, 
            message: `Dear ${recip},\n\nOn this special day, I hope you are surrounded by joy, laughter, and the people you love.\n\nMay the year ahead be filled with achievements, peace, and beautiful moments.\n\nEnjoy your special day to the fullest!\n\nBest regards,\n${senderName}` 
          }
        ],
        anniversary: [
          { 
            subject: `Happy Anniversary, ${recip}! ❤️🥂`, 
            message: `Dear ${recip},\n\nWishing you another year of love, companionship, and beautiful moments together.\n\nMay your bond grow stronger with each passing day.\n\nHappy Anniversary!\n\nWarm wishes,\n${senderName}` 
          }
        ],
        graduation: [
          { 
            subject: `Happy Graduation, ${recip}! 🎓🌟`, 
            message: `Dear ${recip},\n\nHuge congratulations on your graduation! Your hard work, dedication, and resilience have paid off.\n\nWishing you the absolute best as you step into this exciting new chapter of life.\n\nWarm wishes,\n${senderName}` 
          }
        ],
        wedding: [
          { 
            subject: `Congratulations on your Wedding, ${recip}! 💍❤️`, 
            message: `Dear ${recip},\n\nWishing you a lifetime of love, happiness, and beautiful memories as you begin this new journey together.\n\nCongratulations on your wedding day!\n\nWarm wishes,\n${senderName}` 
          }
        ],
        new_job: [
          { 
            subject: `Congratulations on your New Job, ${recip}! 💼🚀`, 
            message: `Dear ${recip},\n\nSo thrilled to hear about your new job! This is a fantastic step forward in your career.\n\nWishing you immense success, great collaborations, and personal growth.\n\nWarm wishes,\n${senderName}` 
          }
        ],
        promotion: [
          { 
            subject: `Congratulations on your Promotion, ${recip}! 🏆📈`, 
            message: `Dear ${recip},\n\nHuge congratulations on your well-deserved promotion! Your leadership, hard work, and dedication continue to make a huge impact.\n\nWarm wishes,\n${senderName}` 
          }
        ],
        friendship: [
          { 
            subject: `Happy Friendship Day, ${recip}! 🤝✨`, 
            message: `Dear ${recip},\n\nHappy Friendship Day! Thank you for being such an incredible friend. Wishing you a day as wonderful and bright as our friendship.\n\nWarm wishes,\n${senderName}` 
          }
        ],
        mother: [
          { 
            subject: `Happy Mother's Day, ${recip}! 🌸❤️`, 
            message: `Dear ${recip},\n\nWishing you a beautiful and relaxing Mother's Day! Thank you for your infinite love and care.\n\nWarm wishes,\n${senderName}` 
          }
        ],
        father: [
          { 
            subject: `Happy Father's Day, ${recip}! 👔⭐`, 
            message: `Dear ${recip},\n\nWishing you a very Happy Father's Day! Thank you for being a constant pillar of strength and support.\n\nWarm wishes,\n${senderName}` 
          }
        ],
        valentine: [
          { 
            subject: `Happy Valentine's Day, ${recip}! ❤️🌹`, 
            message: `Dear ${recip},\n\nHappy Valentine's Day! Wishing you a day filled with sweetness, warmth, and love.\n\nWith all my love,\n${senderName}` 
          }
        ],
        custom: [
          { 
            subject: `Warm wishes on your special day, ${recip}! 🎉✨`, 
            message: `Dear ${recip},\n\nSending you my warmest thoughts and celebration wishes on this special occasion.\n\nHave a great celebration!\n\nWarm wishes,\n${senderName}` 
          }
        ]
      };
      
      const list = localTemplates[category] || localTemplates.custom;
      const selected = list[Math.floor(Math.random() * list.length)];
      setEmailSubject(selected.subject);
      setEmailMessage(selected.message);
    } finally {
      setIsGeneratingWish(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!recipientEmail.trim()) {
      Alert.alert('Missing Info', 'Please enter a recipient email first.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid recipient email.');
      return;
    }

    const finalSubject = emailSubject.trim() || 'KnoVault Test Email';
    const finalMessage = emailMessage.trim() || 'This is a test email sent from KnoVault Special Days module.';

    setIsSendingTestEmail(true);
    setTestEmailSuccess(false);
    try {
      await apiClient.post('/api/important-days/send-test-email', {
        recipient_email: recipientEmail,
        email_subject: finalSubject,
        email_message: finalMessage,
      });
      setTestEmailSuccess(true);
      Alert.alert('Success', 'Test email sent successfully!');
      setTimeout(() => setTestEmailSuccess(false), 4000);
    } catch (error: any) {
      console.error('Error sending test email:', error);
      let errorMsg = 'Failed to send test email. Please check your Brevo configuration.';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.message) {
        errorMsg = error.message;
      }
      Alert.alert('Error Sending Test Email', errorMsg);
    } finally {
      setIsSendingTestEmail(false);
    }
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

          {/* CARD 1: CORE EVENT DETAILS */}
          <View style={ds.cardContainer}>
            <Text style={ds.cardTitle}>Event Details</Text>
            <Text style={ds.cardSubtitle}>Configure the core details of your celebration event</Text>

            <Text style={[ds.label, { marginTop: 10 }]}>Event Title / Name</Text>
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

            <View style={ds.switchLine}>
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
          </View>

          {/* CARD 2: REMINDER SETTINGS */}
          <View style={ds.cardContainer}>
            <View style={ds.switchLine}>
              <View>
                <Text style={ds.cardTitle}>Enable Reminder</Text>
                <Text style={ds.switchSubLabel}>Get notified before the event takes place</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={reminderEnabled ? '#7C3AED' : '#F3F4F6'}
              />
            </View>

            {reminderEnabled && (
              <>
                <View style={ds.divider} />
                <Text style={[ds.label, { marginTop: 0 }]}>Reminder Timing</Text>
                <View style={ds.chipsContainer}>
                  {REMINDER_OPTIONS.map((item) => {
                    const isSelected = reminderType === item.value;
                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[ds.chip, isSelected && ds.chipSelected]}
                        onPress={() => setReminderType(item.value)}
                      >
                        <Text style={[ds.chipText, isSelected && ds.chipTextSelected]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {reminderType === 'custom' && (
                  <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                    <TextInput
                      style={[ds.inputField, { flex: 1, marginRight: 10, backgroundColor: theme.background }]}
                      keyboardType="numeric"
                      value={reminderValue}
                      onChangeText={setReminderValue}
                      placeholderTextColor={colors.text.tertiary}
                    />
                    <View style={{ flex: 2, flexDirection: 'row' }}>
                      {['days', 'weeks', 'months'].map(unit => (
                        <TouchableOpacity
                          key={unit}
                          style={[ds.chip, reminderUnit === unit && ds.chipSelected, { marginBottom: 0, paddingHorizontal: 12, marginRight: 5 }]}
                          onPress={() => setReminderUnit(unit)}
                        >
                          <Text style={[ds.chipText, reminderUnit === unit && ds.chipTextSelected, { fontSize: 12 }]}>{unit}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <Text style={[ds.label, { marginTop: 15 }]}>Time</Text>
                <TouchableOpacity 
                  style={[ds.datePickerBtn, { marginTop: 0, padding: 15 }]} 
                  onPress={() => setShowTimePicker(true)}
                >
                  <View style={[ds.dateIconBox, { width: 36, height: 36 }]}>
                     <Ionicons name="time-outline" size={18} color={theme.primary} />
                  </View>
                  <Text style={ds.dateValue}>
                    {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* CARD 3: AUTO SEND EMAIL WISHES */}
          <View style={ds.cardContainer}>
            <View style={ds.switchLine}>
              <View>
                <Text style={ds.cardTitle}>Auto Send Email Wishes</Text>
                <Text style={ds.switchSubLabel}>Automatically email wishes on this day</Text>
              </View>
              <Switch
                value={autoSendEmail}
                onValueChange={setAutoSendEmail}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={autoSendEmail ? '#7C3AED' : '#F3F4F6'}
              />
            </View>

            {autoSendEmail && (
              <>
                <View style={ds.divider} />
                
                <Text style={[ds.label, { marginTop: 0 }]}>Recipient Email</Text>
                <TextInput
                  style={[ds.inputField, { backgroundColor: theme.background }]}
                  placeholder="e.g. contact@example.com"
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.text.tertiary}
                />

                <View style={ds.timezoneContainer}>
                  <Ionicons name="earth-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={ds.timezoneText}>
                    Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'} (Auto-detected)
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 5 }}>
                  <Text style={[ds.label, { marginTop: 0 }]}>Email Content</Text>
                  <TouchableOpacity 
                    style={[
                      ds.generateBtn, 
                      isGeneratingWish && { opacity: 0.7 }
                    ]} 
                    onPress={handleGenerateWish}
                    disabled={isGeneratingWish}
                  >
                    <LinearGradient 
                      colors={['#8B5CF6', '#EC4899']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }} 
                      style={ds.generateGradient}
                    >
                      {isGeneratingWish ? (
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                      ) : (
                        <Ionicons name="sparkles" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                      )}
                      <Text style={ds.generateText}>
                        {isGeneratingWish ? 'Generating...' : '✨ Generate Wish'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[ds.inputField, { marginTop: 5, backgroundColor: theme.background }]}
                  placeholder="Email Subject"
                  value={emailSubject}
                  onChangeText={setEmailSubject}
                  placeholderTextColor={colors.text.tertiary}
                />

                <TextInput
                  style={[ds.textArea, { marginTop: 10, height: 100, backgroundColor: theme.background }]}
                  placeholder="Email Message Body..."
                  value={emailMessage}
                  onChangeText={setEmailMessage}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.text.tertiary}
                />

                <Text style={[ds.label, { marginTop: 15 }]}>Send Time</Text>
                <TouchableOpacity 
                  style={[ds.datePickerBtn, { marginTop: 5, padding: 15 }]} 
                  onPress={() => setShowEmailTimePicker(true)}
                >
                  <View style={[ds.dateIconBox, { width: 36, height: 36 }]}>
                     <Ionicons name="time-outline" size={18} color={theme.primary} />
                  </View>
                  <Text style={ds.dateValue}>
                    {emailSendTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                {testEmailSuccess && (
                  <View style={[ds.successAlert, { backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderColor: colors.text.success }]}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.text.success} style={{ marginRight: 8 }} />
                    <Text style={[ds.successAlertText, { color: isDark ? '#34D399' : '#065F46' }]}>
                      Test email sent successfully!
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={[
                    ds.testEmailBtn, 
                    isSendingTestEmail && { opacity: 0.6 },
                    !recipientEmail.trim() && ds.btnDisabled
                  ]} 
                  onPress={handleSendTestEmail}
                  disabled={isSendingTestEmail || !recipientEmail.trim()}
                >
                  {isSendingTestEmail ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons 
                        name="mail-unread-outline" 
                        size={18} 
                        color={recipientEmail.trim() ? theme.primary : theme.textSecondary} 
                        style={{ marginRight: 8 }} 
                      />
                      <Text style={[
                        ds.testEmailText, 
                        { color: recipientEmail.trim() ? theme.primary : theme.textSecondary }
                      ]}>
                        Send Test Email
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* CARD 4: ADDITIONAL PLANNING DETAILS */}
          <View style={ds.cardContainer}>
            <Text style={ds.cardTitle}>Planning & Ideas</Text>
            <Text style={ds.cardSubtitle}>Keep track of gifts, celebration schedules, and congratulation drafts</Text>

            <Text style={[ds.label, { marginTop: 10 }]}>Gift/Idea Notes</Text>
            <TextInput
              style={[ds.inputField, { backgroundColor: theme.background }]}
              placeholder={placeholders.gift}
              value={giftIdeas}
              onChangeText={setGiftIdeas}
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={ds.label}>Celebration/Action Plans</Text>
            <TextInput
              style={[ds.inputField, { backgroundColor: theme.background }]}
              placeholder={placeholders.plans}
              value={celebrationPlans}
              onChangeText={setCelebrationPlans}
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={ds.label}>Reminder Notes</Text>
            <TextInput
              style={[ds.inputField, { backgroundColor: theme.background }]}
              placeholder={placeholders.reminder}
              value={reminderNotes}
              onChangeText={setReminderNotes}
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={ds.label}>Message Draft / Congratulation text</Text>
            <TextInput
              style={[ds.textArea, { backgroundColor: theme.background }]}
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
              style={[ds.textArea, { backgroundColor: theme.background }]}
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
          </View>
          
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

          {showTimePicker && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selected) => {
                setShowTimePicker(false);
                if (selected) setReminderTime(selected);
              }}
            />
          )}

          {showEmailTimePicker && (
            <DateTimePicker
              value={emailSendTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selected) => {
                setShowEmailTimePicker(false);
                if (selected) setEmailSendTime(selected);
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
    marginTop: 20, 
    marginBottom: 8, 
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
    backgroundColor: theme.background,
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
  switchLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
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
    maxWidth: '85%',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 16,
    borderRadius: 18,
    marginTop: 5,
    marginBottom: 15,
    borderWidth: 1.2,
    borderColor: theme.border,
  },
  dateIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.card,
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
  cardContainer: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    borderWidth: 1.2,
    borderColor: theme.border,
    ...getThemedShadow(theme, 'soft'),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
    marginBottom: 15,
  },
  divider: {
    height: 1.2,
    backgroundColor: theme.border,
    marginVertical: 15,
  },
  generateBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    ...getThemedShadow(theme, 'soft'),
  },
  generateGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  testEmailBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  testEmailText: {
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    borderColor: theme.border,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F3F4F6',
  },
  timezoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 4,
  },
  timezoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
  },
  successAlertText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
