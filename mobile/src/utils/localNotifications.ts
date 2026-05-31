import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { logNotificationToHistory } from '../store/notificationStore';
import { getDB } from '../services/db';
import { getAgeInfo, getReminderTriggerDate, getSmartNotificationMessage, EventReminder, ReminderType } from './important_day';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const { notificationsEnabled, notificationSound, notificationVibration } = useSettingsStore.getState();
    return {
      shouldShowAlert: notificationsEnabled,
      shouldPlaySound: notificationsEnabled && notificationSound,
      shouldSetBadge: notificationsEnabled,
      shouldShowBanner: notificationsEnabled,
      shouldShowList: notificationsEnabled,
    };
  },
});

export const requestLocalNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
};

export const setupNotificationChannelsAndCategories = async () => {
  if (Platform.OS === 'android') {
    const { notificationSound, notificationVibration } = useSettingsStore.getState();
    const vPattern = notificationVibration ? [0, 250, 250, 250] : [0, 0, 0, 0];
    const enableVib = notificationVibration;
    const enableSound = notificationSound;

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: vPattern,
      lightColor: '#7C4DFF',
      enableVibrate: enableVib,
      sound: enableSound ? 'default' : null,
    });
    
    await Notifications.setNotificationChannelAsync('goals', {
      name: 'Goals & Projects',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: vPattern,
      lightColor: '#00C853',
      enableVibrate: enableVib,
      sound: enableSound ? 'default' : null,
    });

    await Notifications.setNotificationChannelAsync('notes', {
      name: 'Notes',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: vPattern,
      lightColor: '#29B6F6',
      enableVibrate: enableVib,
      sound: enableSound ? 'default' : null,
    });

    await Notifications.setNotificationChannelAsync('special-days', {
      name: 'Special Days',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EC4899',
      enableVibrate: true,
      sound: enableSound ? 'default' : null,
    });

    await Notifications.setNotificationChannelAsync('security', {
      name: 'Security Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#F44336',
      enableVibrate: true,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('system', {
      name: 'System & Daily Planner',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: vPattern,
      lightColor: '#FFB300',
      enableVibrate: enableVib,
      sound: enableSound ? 'default' : null,
    });
  }

  // Setup Categories (Actions)
  await Notifications.setNotificationCategoryAsync('REMINDER_ACTION', [

    {
      identifier: 'SNOOZE_5',
      buttonTitle: 'Snooze 5m',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SNOOZE_15',
      buttonTitle: 'Snooze 15m',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'OPEN',
      buttonTitle: 'Open',
      options: { opensAppToForeground: true },
    }
  ]);
};

export const scheduleLocalReminder = async (
  title: string, 
  body: string, 
  triggerDate: Date, 
  data: Record<string, any> = {},
  channelId: string = 'reminders',
  categoryIdentifier: string = 'REMINDER_ACTION',
  repeatingMode?: 'daily' | 'weekly' | 'yearly' | 'monthly'
) => {
  const { notificationsEnabled, notificationReminders, notificationGoals } = useSettingsStore.getState();
  
  if (!notificationsEnabled) return null;
  if (channelId === 'reminders' && !notificationReminders) return null;
  if (channelId === 'goals' && !notificationGoals) return null;

  const hasPermission = await requestLocalNotificationPermissions();
  if (!hasPermission) {
    console.warn('[LocalNotifications] Permission denied');
    return null;
  }

  // Ensure the date is in the future
  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  // Log to history asynchronously (so it shows in Notification Center)
  logNotificationToHistory(title, body, channelId, data);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data,
        categoryIdentifier,
      },
      trigger: repeatingMode ? (repeatingMode === 'yearly' ? {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: triggerDate.getMonth(),
        day: triggerDate.getDate(),
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        channelId,
      } as any : repeatingMode === 'monthly' ? {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: triggerDate.getDate(),
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        channelId,
      } as any : repeatingMode === 'weekly' ? {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: triggerDate.getDay() + 1, // Expo uses 1 for Sunday
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        channelId,
      } as any : {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        channelId,
      } as any) : {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId,
      } as any,
    });
    return id;
  } catch (error) {
    console.error('[LocalNotifications] Error scheduling notification:', error);
    return null;
  }
};

export const scheduleDailyPlanner = async () => {
  const { notificationsEnabled, notificationDailySummary } = useSettingsStore.getState();
  if (!notificationsEnabled || !notificationDailySummary) return;

  const hasPermission = await requestLocalNotificationPermissions();
  if (!hasPermission) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.find(n => n.content.data?.type === 'daily_planner');
    
    if (existing) {
      return; // Already scheduled
    }

    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-planner', // Ensure single identity
      content: {
        title: '🌅 Good Morning',
        body: 'Check your Daily Planner for upcoming reminders and goals today!',
        sound: true,
        data: { type: 'daily_planner' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
        channelId: 'system',
      } as any,
    });
  } catch (error) {
    console.error('[LocalNotifications] Error scheduling daily planner:', error);
  }
};

export const scheduleSpecialDaysReminders = async () => {
  const { notificationsEnabled, notificationReminders } = useSettingsStore.getState();
  if (!notificationsEnabled || !notificationReminders) return;

  const hasPermission = await requestLocalNotificationPermissions();
  if (!hasPermission) return;

  try {
    const db = getDB();
    const importantDays = await db.getAllAsync('SELECT * FROM ImportantDays WHERE is_deleted = 0');
    console.log("[REMINDER DEBUG] SQLITE ImportantDays Count:", importantDays.length);
    
    // Clear previously scheduled special day reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'special_day') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const event of importantDays as any[]) {
      const isReminderEnabled = event.reminder_enabled === 1 || event.reminder_enabled === true;
      if (!isReminderEnabled || !event.reminder_type) continue;
      
      const ageInfo = getAgeInfo(event.date, event.type);
      const isRecurring = event.is_recurring === 1 || event.is_recurring === true;

      const sendTime = event.reminder_time || '09:00';
      
      const triggerDate = getReminderTriggerDate(
        event.date,
        event.reminder_type as ReminderType,
        event.reminder_value,
        event.reminder_unit as any,
        isRecurring,
        sendTime
      );

      // Calculate days until
      let daysUntil = 0;
      if (event.reminder_type === '1_day') daysUntil = 1;
      else if (event.reminder_type === '3_days') daysUntil = 3;
      else if (event.reminder_type === '1_week') daysUntil = 7;
      else if (event.reminder_type === '2_weeks') daysUntil = 14;
      else if (event.reminder_type === '1_month') daysUntil = 30;
      else if (event.reminder_type === 'custom' && event.reminder_value && event.reminder_unit) {
         if (event.reminder_unit === 'days') daysUntil = event.reminder_value;
         else if (event.reminder_unit === 'weeks') daysUntil = event.reminder_value * 7;
         else if (event.reminder_unit === 'months') daysUntil = event.reminder_value * 30;
      }

      const { notifTitle, notifBody } = getSmartNotificationMessage(
        event.title,
        event.type,
        daysUntil,
        ageInfo
      );

      console.log("[REMINDER DEBUG] NOW", new Date().toISOString());
      console.log("[REMINDER DEBUG] EVENT DATE", event.date);
      console.log("[REMINDER DEBUG] REMINDER TYPE", event.reminder_type);
      console.log("[REMINDER DEBUG] REMINDER TIME", event.reminder_time);
      console.log("[REMINDER DEBUG] COMPUTED TRIGGER", triggerDate);
      console.log("[REMINDER DEBUG] TRIGGER ISO", triggerDate?.toISOString());
      
      console.log(
        "[REMINDER DEBUG] FUTURE CHECK",
        triggerDate.getTime(),
        Date.now(),
        triggerDate.getTime() > Date.now()
      );
      
      if (triggerDate.getTime() > Date.now() && triggerDate.getTime() < Date.now() + 365 * 24 * 60 * 60 * 1000) {
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: notifTitle,
              body: notifBody,
              sound: true,
              data: { type: 'special_day', id: event.id, eventTitle: event.title }
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              channelId: 'special-days',
            } as any,
          });
          console.log("[REMINDER DEBUG] SCHEDULED ID", id);
        } catch (scheduleErr) {
          console.error(`[REMINDER DEBUG] ERROR: Failed to schedule for ${event.title}:`, scheduleErr);
        }
      }
    }
    
    // Dump all scheduled notifications
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(
      "[REMINDER DEBUG] ALL SCHEDULED",
      JSON.stringify(allScheduled, null, 2)
    );
    
  } catch (error) {
    console.error('[LocalNotifications] Error scheduling special days:', error);
  }
};
