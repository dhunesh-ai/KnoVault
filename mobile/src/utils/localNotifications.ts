import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { logNotificationToHistory } from '../store/notificationStore';
import { dbQueue } from '../services/db';
import { networkConcurrencyQueue } from './concurrencyQueue';
import { getAgeInfo, getReminderTriggerDate, getSmartNotificationMessage, EventReminder, ReminderType } from './important_day';
import { workspacesApi, WorkspaceMeeting, WorkspaceEvent } from '../api/workspaces';

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

export const requestLocalNotificationPermissions = async (request: boolean = false) => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted' && request) {
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

    await Notifications.setNotificationChannelAsync('workspace-alerts', {
      name: 'Workspace Alerts & Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C4DFF',
      enableVibrate: true,
      sound: 'default',
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
    const importantDays = await dbQueue.read(async (db) => {
      return db.getAllAsync('SELECT * FROM ImportantDays WHERE is_deleted = 0');
    });
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

export const cancelWorkspaceMeetingNotifications = async (meetingId: number) => {
  console.log(`[LocalNotifications] Cancelling notifications for meeting ${meetingId}`);
  await Notifications.cancelScheduledNotificationAsync(`workspace_meeting_5m_${meetingId}`);
  await Notifications.cancelScheduledNotificationAsync(`workspace_meeting_start_${meetingId}`);
};

export const cancelWorkspaceEventNotifications = async (eventId: number) => {
  console.log(`[LocalNotifications] Cancelling notifications for event ${eventId}`);
  await Notifications.cancelScheduledNotificationAsync(`workspace_event_5m_${eventId}`);
  await Notifications.cancelScheduledNotificationAsync(`workspace_event_start_${eventId}`);
};

export const scheduleWorkspaceMeetingNotifications = async (meeting: WorkspaceMeeting, workspaceName: string) => {
  const nowMs = Date.now();
  const date = new Date(meeting.date);
  const reminderTime = new Date(date.getTime() - 5 * 60 * 1000);
  const startTime = date;

  if (reminderTime.getTime() > nowMs) {
    await Notifications.scheduleNotificationAsync({
      identifier: `workspace_meeting_5m_${meeting.id}`,
      content: {
        title: '📹 Meeting Reminder',
        body: `Meeting "${meeting.title}" in "${workspaceName}" starts in 5 minutes.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'workspace_meeting',
          id: meeting.id,
          workspaceId: meeting.workspace_id,
          reminderType: '5m',
          date: meeting.date,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
        channelId: 'workspace-alerts',
      } as any,
    });
    console.log(`[LocalNotifications] Scheduled 5m reminder for meeting ${meeting.id} at ${reminderTime}`);
  }

  if (startTime.getTime() > nowMs) {
    await Notifications.scheduleNotificationAsync({
      identifier: `workspace_meeting_start_${meeting.id}`,
      content: {
        title: '📹 Meeting Started',
        body: `Meeting "${meeting.title}" in "${workspaceName}" is starting now!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'workspace_meeting',
          id: meeting.id,
          workspaceId: meeting.workspace_id,
          reminderType: 'start',
          date: meeting.date,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: startTime,
        channelId: 'workspace-alerts',
      } as any,
    });
    console.log(`[LocalNotifications] Scheduled start notification for meeting ${meeting.id} at ${startTime}`);
  }
};

export const scheduleWorkspaceEventNotifications = async (event: WorkspaceEvent, workspaceName: string) => {
  const nowMs = Date.now();
  const date = new Date(event.date);
  const reminderTime = new Date(date.getTime() - 5 * 60 * 1000);
  const startTime = date;

  if (reminderTime.getTime() > nowMs) {
    await Notifications.scheduleNotificationAsync({
      identifier: `workspace_event_5m_${event.id}`,
      content: {
        title: '📅 Event Reminder',
        body: `Event "${event.title}" (${event.type}) in "${workspaceName}" starts in 5 minutes.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'workspace_event',
          id: event.id,
          workspaceId: event.workspace_id,
          reminderType: '5m',
          date: event.date,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
        channelId: 'workspace-alerts',
      } as any,
    });
    console.log(`[LocalNotifications] Scheduled 5m reminder for event ${event.id} at ${reminderTime}`);
  }

  if (startTime.getTime() > nowMs) {
    await Notifications.scheduleNotificationAsync({
      identifier: `workspace_event_start_${event.id}`,
      content: {
        title: '📅 Event Started',
        body: `Event "${event.title}" (${event.type}) in "${workspaceName}" is starting now!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'workspace_event',
          id: event.id,
          workspaceId: event.workspace_id,
          reminderType: 'start',
          date: event.date,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: startTime,
        channelId: 'workspace-alerts',
      } as any,
    });
    console.log(`[LocalNotifications] Scheduled start notification for event ${event.id} at ${startTime}`);
  }
};

export const syncWorkspaceNotifications = async () => {
  try {
    console.log('[SyncWorkspaceNotifications] Starting local notification synchronization...');
    const workspaces = await workspacesApi.getWorkspaces();
    
    const upcomingMeetingIds = new Set<number>();
    const upcomingEventIds = new Set<number>();
    const nowMs = Date.now();

    const meetingsToSchedule: { meeting: WorkspaceMeeting; wsName: string }[] = [];
    const eventsToSchedule: { event: WorkspaceEvent; wsName: string }[] = [];

    for (const ws of workspaces) {
      await networkConcurrencyQueue.add(async () => {
        try {
          const meetings = await workspacesApi.getMeetings(ws.id);
          for (const meeting of meetings) {
            const dateMs = new Date(meeting.date).getTime();
            // Keep meetings in the future or started in the last 10 minutes
            if (dateMs > nowMs - 10 * 60 * 1000) {
              upcomingMeetingIds.add(meeting.id);
              meetingsToSchedule.push({ meeting, wsName: ws.name });
            }
          }
        } catch (e) {
          console.warn(`[SyncWorkspaceNotifications] Failed to fetch meetings for workspace ${ws.id}`, e);
        }

        try {
          const events = await workspacesApi.getEvents(ws.id);
          for (const event of events) {
            const dateMs = new Date(event.date).getTime();
            if (dateMs > nowMs - 10 * 60 * 1000) {
              upcomingEventIds.add(event.id);
              eventsToSchedule.push({ event, wsName: ws.name });
            }
          }
        } catch (e) {
          console.warn(`[SyncWorkspaceNotifications] Failed to fetch events for workspace ${ws.id}`, e);
        }
      });
    }

    // Get all scheduled notifications on the device
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    // 1. Cancel obsolete/deleted workspace reminders
    for (const notif of scheduled) {
      const id = notif.identifier;
      if (id.startsWith('workspace_meeting_')) {
        const match = id.match(/workspace_meeting_(?:5m|start)_(\d+)/);
        if (match) {
          const meetingId = parseInt(match[1], 10);
          if (!upcomingMeetingIds.has(meetingId)) {
            console.log(`[SyncWorkspaceNotifications] Cancelling obsolete meeting reminder: ${id}`);
            await Notifications.cancelScheduledNotificationAsync(id);
          }
        }
      } else if (id.startsWith('workspace_event_')) {
        const match = id.match(/workspace_event_(?:5m|start)_(\d+)/);
        if (match) {
          const eventId = parseInt(match[1], 10);
          if (!upcomingEventIds.has(eventId)) {
            console.log(`[SyncWorkspaceNotifications] Cancelling obsolete event reminder: ${id}`);
            await Notifications.cancelScheduledNotificationAsync(id);
          }
        }
      }
    }

    // 2. Schedule/Reschedule upcoming meetings
    for (const { meeting, wsName } of meetingsToSchedule) {
      const date = new Date(meeting.date);
      const reminderTime = new Date(date.getTime() - 5 * 60 * 1000);
      const startTime = date;

      // 5-minute reminder
      if (reminderTime.getTime() > nowMs) {
        const identifier = `workspace_meeting_5m_${meeting.id}`;
        const existing = scheduled.find(n => n.identifier === identifier);
        const shouldSchedule = !existing || existing.content.data?.date !== meeting.date || existing.content.body?.indexOf(meeting.title) === -1;
        if (shouldSchedule) {
          await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: '📹 Meeting Reminder',
              body: `Meeting "${meeting.title}" in "${wsName}" starts in 5 minutes.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: {
                type: 'workspace_meeting',
                id: meeting.id,
                workspaceId: meeting.workspace_id,
                reminderType: '5m',
                date: meeting.date,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: reminderTime,
              channelId: 'workspace-alerts',
            } as any,
          });
        }
      }

      // Start time
      if (startTime.getTime() > nowMs) {
        const identifier = `workspace_meeting_start_${meeting.id}`;
        const existing = scheduled.find(n => n.identifier === identifier);
        const shouldSchedule = !existing || existing.content.data?.date !== meeting.date || existing.content.body?.indexOf(meeting.title) === -1;
        if (shouldSchedule) {
          await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: '📹 Meeting Started',
              body: `Meeting "${meeting.title}" in "${wsName}" is starting now!`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: {
                type: 'workspace_meeting',
                id: meeting.id,
                workspaceId: meeting.workspace_id,
                reminderType: 'start',
                date: meeting.date,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: startTime,
              channelId: 'workspace-alerts',
            } as any,
          });
        }
      }
    }

    // 3. Schedule/Reschedule upcoming events
    for (const { event, wsName } of eventsToSchedule) {
      const date = new Date(event.date);
      const reminderTime = new Date(date.getTime() - 5 * 60 * 1000);
      const startTime = date;

      // 5-minute reminder
      if (reminderTime.getTime() > nowMs) {
        const identifier = `workspace_event_5m_${event.id}`;
        const existing = scheduled.find(n => n.identifier === identifier);
        const shouldSchedule = !existing || existing.content.data?.date !== event.date || existing.content.body?.indexOf(event.title) === -1;
        if (shouldSchedule) {
          await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: '📅 Event Reminder',
              body: `Event "${event.title}" (${event.type}) in "${wsName}" starts in 5 minutes.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: {
                type: 'workspace_event',
                id: event.id,
                workspaceId: event.workspace_id,
                reminderType: '5m',
                date: event.date,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: reminderTime,
              channelId: 'workspace-alerts',
            } as any,
          });
        }
      }

      // Start time
      if (startTime.getTime() > nowMs) {
        const identifier = `workspace_event_start_${event.id}`;
        const existing = scheduled.find(n => n.identifier === identifier);
        const shouldSchedule = !existing || existing.content.data?.date !== event.date || existing.content.body?.indexOf(event.title) === -1;
        if (shouldSchedule) {
          await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: '📅 Event Started',
              body: `Event "${event.title}" (${event.type}) in "${wsName}" is starting now!`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: {
                type: 'workspace_event',
                id: event.id,
                workspaceId: event.workspace_id,
                reminderType: 'start',
                date: event.date,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: startTime,
              channelId: 'workspace-alerts',
            } as any,
          });
        }
      }
    }

    console.log('[SyncWorkspaceNotifications] Local notification synchronization completed successfully.');
  } catch (error) {
    console.error('[SyncWorkspaceNotifications] Error:', error);
  }
};

export const syncRemindersNotifications = async () => {
  const { notificationsEnabled, notificationReminders } = useSettingsStore.getState();
  if (!notificationsEnabled || !notificationReminders) return;

  const hasPermission = await requestLocalNotificationPermissions();
  if (!hasPermission) return;

  try {
    const nowIso = new Date().toISOString();
    
    // Fetch future active reminders
    const activeReminders = await dbQueue.read(async (db) => {
      return db.getAllAsync(
        'SELECT * FROM Reminders WHERE is_deleted = 0 AND is_completed = 0 AND reminder_date > ? ORDER BY reminder_date ASC LIMIT 50',
        [nowIso]
      );
    });
    console.log("[LocalNotifications] Active future reminders count:", activeReminders.length);

    // Get all scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    // Cancel existing scheduled notifications of type 'reminder'
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // Schedule fresh notifications for future active reminders
    for (const reminder of activeReminders as any[]) {
      const triggerDate = new Date(reminder.reminder_date);
      if (triggerDate.getTime() <= Date.now()) continue;

      let title = reminder.title;
      let body = reminder.description || "You have a scheduled reminder.";

      const descStr = (reminder.description || "").trim();
      if (descStr.startsWith("{")) {
        try {
          const parsed = JSON.parse(descStr);
          if (parsed.isMedicine) {
            const medName = parsed.medName || reminder.title;
            const dosage = parsed.dosage ? ` • ${parsed.dosage}` : "";
            const foodTiming = parsed.foodTiming ? ` • ${parsed.foodTiming}` : "";
            const timingLabel = parsed.timing ? ` [${parsed.timing.split(" ")[0]}]` : "";

            title = `💊 Take ${medName}${timingLabel}`;
            body = `Time to take your medication:${dosage}${foodTiming}. ${parsed.notes || ""}`;
          } else if (parsed.isCustom) {
            const customIcon = parsed.customIcon ? parsed.customIcon.split(" ")[0] : "🎯";
            const customName = parsed.customName || reminder.title;
            title = `${customIcon} ${customName}`;
            body = parsed.notes || "Custom reminder schedule alert.";
          }
        } catch (e) {
          // Graceful fallback
        }
      }

      try {
        const notifId = await scheduleLocalReminder(
          title,
          body,
          triggerDate,
          { type: 'reminder', id: reminder.remote_id || reminder.id },
          'reminders',
          'REMINDER_ACTION'
        );
        if (notifId) {
          await dbQueue.write(async (db) => {
            await db.runAsync('UPDATE Reminders SET notification_id = ? WHERE id = ?', [notifId, reminder.id]);
          });
        }
      } catch (scheduleErr) {
        console.error(`[LocalNotifications] Failed to schedule reminder for ${reminder.title}:`, scheduleErr);
      }
    }
    console.log('[LocalNotifications] Reminders notifications sync completed.');
  } catch (error) {
    console.error('[LocalNotifications] Error syncing reminders notifications:', error);
  }
};

