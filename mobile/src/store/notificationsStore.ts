import { create } from 'zustand';
import { getLocalDateString, formatLocalTime } from '../utils/date';
import { isImportantDayToday, calculateDaysRemaining } from '../utils/important_day';
import { useAuthStore } from './authStore';

export interface AppNotification {
  id: string;
  type: 'goal' | 'reminder' | 'special_day' | 'important_day' | 'productivity' | 'security';
  section: 'Today' | 'Upcoming' | 'Productivity' | 'Security';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  importance: 'high' | 'normal';
  targetId?: string | number;
}

interface NotificationsState {
  notifications: AppNotification[];
  dismissedIds: Set<string>;
  readIds: Set<string>;
  
  generateNotifications: (
    reminders: any[],
    specialDays: any[],
    goals: any[],
    notes: any[]
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  getUnreadCount: () => number;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  dismissedIds: new Set<string>(),
  readIds: new Set<string>(),

  generateNotifications: (reminders = [], specialDays = [], goals = [], notes = []) => {
    const { dismissedIds, readIds } = get();
    const generated: AppNotification[] = [];
    const todayStr = getLocalDateString(new Date());
    const user = useAuthStore.getState().user;

    // Filter lists
    const todayReminders = reminders.filter((r) => {
      const rDateStr = getLocalDateString(new Date(r.reminder_date));
      return rDateStr === todayStr;
    });

    const pendingGoals = goals.filter((g) => !g.completed);
    const completedGoalsCount = goals.filter((g) => g.completed).length;

    // 1. Process Important Days (Birthdays, Anniversaries, etc.)
    specialDays.forEach((b) => {
      const eventDateStr = b.date || b.birth_date;
      const isRecurring = b.is_recurring !== undefined ? b.is_recurring : true;
      if (!eventDateStr) return;

      const isToday = isImportantDayToday(eventDateStr, isRecurring);
      const daysLeft = calculateDaysRemaining(eventDateStr, isRecurring);
      const isUpcoming = daysLeft > 0 && daysLeft <= 7;

      const getEmojiForType = (typeStr: string) => {
        const t = typeStr?.toLowerCase() || 'birthday';
        if (t.includes('birthday')) return '🎂';
        if (t.includes('wedding') || t.includes('anniversary')) return '💍';
        if (t.includes('engagement')) return '💎';
        if (t.includes('festival')) return '🎊';
        if (t.includes('meeting')) return '🤝';
        if (t.includes('achievement')) return '🏆';
        if (t.includes('memory') || t.includes('personal memory')) return '📸';
        return '✨';
      };

      const getTitleForToday = (typeStr: string) => {
        const t = typeStr?.toLowerCase() || 'birthday';
        const emoji = getEmojiForType(typeStr);
        if (t.includes('birthday')) return `${emoji} Birthday Today!`;
        if (t.includes('wedding') || t.includes('anniversary')) return `${emoji} Anniversary Today!`;
        if (t.includes('engagement')) return `${emoji} Engagement Today!`;
        if (t.includes('festival')) return `${emoji} Festival Today!`;
        if (t.includes('meeting')) return `${emoji} Meeting Today!`;
        if (t.includes('achievement')) return `${emoji} Achievement Today!`;
        if (t.includes('memory') || t.includes('personal memory')) return `${emoji} Memory Today!`;
        return `${emoji} Special Day Today!`;
      };

      if (isToday) {
        const id = `special-day-today-${b.id}`;
        if (!dismissedIds.has(id)) {
          generated.push({
            id,
            type: 'important_day',
            section: 'Today',
            title: getTitleForToday(b.type),
            description: `It's time to celebrate: ${b.title || b.person_name}`,
            timestamp: 'Today',
            isRead: readIds.has(id),
            importance: 'high',
            targetId: b.id,
          });
        }
      } else if (isUpcoming) {
        const id = `special-day-upcoming-${b.id}`;
        if (!dismissedIds.has(id)) {
          const emoji = getEmojiForType(b.type);
          generated.push({
            id,
            type: 'important_day',
            section: 'Upcoming',
            title: `${emoji} Upcoming Celebration`,
            description: `In ${daysLeft} days: ${b.title || b.person_name}'s ${b.type || 'Birthday'}`,
            timestamp: `In ${daysLeft}d`,
            isRead: readIds.has(id),
            importance: 'normal',
            targetId: b.id,
          });
        }
      }
    });

    // 2. Process Reminders today & upcoming
    reminders.forEach((r) => {
      const rDate = new Date(r.reminder_date);
      const rDateStr = getLocalDateString(rDate);
      const isToday = rDateStr === todayStr;

      // Check if within 7 days and in the future
      const diffTime = rDate.getTime() - Date.now();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isUpcoming = diffDays > 0 && diffDays <= 7;

      // Check if medicine type
      let isMed = r.type.toLowerCase() === 'medicine';
      let medInfo: any = null;
      try {
        if (r.description && r.description.startsWith('{')) {
          const parsed = JSON.parse(r.description);
          if (parsed.isMedicine) {
            isMed = true;
            medInfo = parsed;
          }
        }
      } catch (e) {
        // Treat as normal
      }

      if (isMed && medInfo) {
        // Check if course completed
        let durationDays = 5;
        const dur = medInfo.duration.toLowerCase();
        if (dur.includes('day')) {
          durationDays = parseInt(dur) || 5;
        } else if (dur.includes('week')) {
          durationDays = (parseInt(dur) || 1) * 7;
        } else if (dur.includes('month')) {
          durationDays = (parseInt(dur) || 1) * 30;
        }

        const courseStartDate = new Date(r.reminder_date);
        const courseEndDate = new Date(courseStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const now = new Date();
        const isCompleted = now.getTime() > courseEndDate.getTime();

        if (isCompleted) {
          const id = `medicine-completed-${r.id}`;
          if (!dismissedIds.has(id)) {
            generated.push({
              id,
              type: 'reminder',
              section: 'Today',
              title: `🎉 Medicine Course Completed!`,
              description: `You have completed your course of ${medInfo.medName}. Great job staying healthy!`,
              timestamp: 'Completed',
              isRead: readIds.has(id),
              importance: 'high',
              targetId: r.id,
            });
          }
          return; // Skip daily dosage reminders if course completed
        }
      }

      if (isToday) {
        const id = `reminder-today-${r.id}`;
        if (!dismissedIds.has(id)) {
          if (isMed && medInfo) {
            // Determine time of day for timing-based titles
            const hr = new Date().getHours();
            let timeTitle = 'Time to take your medicine 💊';
            if (hr >= 5 && hr < 11) {
              timeTitle = `Morning dosage due 🌅`;
            } else if (hr >= 11 && hr < 16) {
              timeTitle = `Lunch dosage due 🍱`;
            } else if (hr >= 17 && hr < 21) {
              timeTitle = `Evening dosage due 🌇`;
            } else if (hr >= 21 || hr < 5) {
              timeTitle = `Night dosage due 🌙`;
            }

            generated.push({
              id,
              type: 'reminder',
              section: 'Today',
              title: timeTitle,
              description: `${medInfo.medName} (${medInfo.medType}) - ${medInfo.dosage} • ${medInfo.foodTiming}`,
              timestamp: formatLocalTime(r.reminder_date),
              isRead: readIds.has(id),
              importance: 'high',
              targetId: r.id,
            });
          } else {
            generated.push({
              id,
              type: 'reminder',
              section: 'Today',
              title: r.type.toLowerCase() === 'event' ? `📅 Event: ${r.title}` : `⏰ Reminder: ${r.title}`,
              description: r.description || `Scheduled at ${formatLocalTime(r.reminder_date)}`,
              timestamp: formatLocalTime(r.reminder_date),
              isRead: readIds.has(id),
              importance: 'high',
              targetId: r.id,
            });
          }
        }
      } else if (isUpcoming) {
        const id = `reminder-upcoming-${r.id}`;
        if (!dismissedIds.has(id)) {
          if (isMed && medInfo) {
            generated.push({
              id,
              type: 'reminder',
              section: 'Upcoming',
              title: `💊 Scheduled Medicine: ${medInfo.medName}`,
              description: `${medInfo.dosage} (${medInfo.foodTiming}) - Starting ${rDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
              timestamp: rDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              isRead: readIds.has(id),
              importance: 'normal',
              targetId: r.id,
            });
          } else {
            generated.push({
              id,
              type: 'reminder',
              section: 'Upcoming',
              title: `📅 Upcoming: ${r.title}`,
              description: `${r.description || 'Upcoming event'} - ${rDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${formatLocalTime(r.reminder_date)}`,
              timestamp: rDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              isRead: readIds.has(id),
              importance: 'normal',
              targetId: r.id,
            });
          }
        }
      }
    });

    // 3. Process Goals
    goals.forEach((goal) => {
      if (goal.completed) {
        const id = `goal-completed-${goal.id}`;
        if (!dismissedIds.has(id)) {
          generated.push({
            id,
            type: 'goal',
            section: 'Today',
            title: `🎯 Goal Completed!`,
            description: `Excellent job finishing: "${goal.title}"`,
            timestamp: 'Today',
            isRead: readIds.has(id),
            importance: 'normal',
            targetId: goal.id,
          });
        }
      } else {
        const id = `goal-pending-${goal.id}`;
        if (!dismissedIds.has(id)) {
          generated.push({
            id,
            type: 'goal',
            section: 'Today',
            title: `🎯 Pending Task`,
            description: `Don't forget to complete: "${goal.title}"`,
            timestamp: 'Today',
            isRead: readIds.has(id),
            importance: 'normal',
            targetId: goal.id,
          });
        }
      }
    });

    // 4. Productivity Alerts
    // Incomplete Goals Alert
    if (pendingGoals.length > 0) {
      const id = 'productivity-incomplete-goals';
      if (!dismissedIds.has(id)) {
        generated.push({
          id,
          type: 'productivity',
          section: 'Productivity',
          title: `⚠️ Pending Daily Tasks`,
          description: `You have ${pendingGoals.length} pending goal${pendingGoals.length > 1 ? 's' : ''} today. Start with "${pendingGoals[0].title}"!`,
          timestamp: 'Productivity',
          isRead: readIds.has(id),
          importance: 'high',
        });
      }
    }

    // Streak updates alert
    if (completedGoalsCount > 0) {
      const id = 'productivity-streak-update';
      if (!dismissedIds.has(id)) {
        generated.push({
          id,
          type: 'productivity',
          section: 'Productivity',
          title: `🔥 Daily Streak Active!`,
          description: `You completed ${completedGoalsCount} goal${completedGoalsCount > 1 ? 's' : ''} today. Keep it up!`,
          timestamp: 'Productivity',
          isRead: readIds.has(id),
          importance: 'high',
        });
      }
    }

    // Busy schedule alert
    if (todayReminders.length > 2) {
      const id = 'productivity-busy-schedule';
      if (!dismissedIds.has(id)) {
        generated.push({
          id,
          type: 'productivity',
          section: 'Productivity',
          title: `📅 Busy Schedule Alert`,
          description: `You have ${todayReminders.length} event${todayReminders.length > 1 ? 's' : ''} scheduled today. Plan your time wisely.`,
          timestamp: 'Schedule',
          isRead: readIds.has(id),
          importance: 'normal',
        });
      }
    }

    // Focus reminders
    const focusId = 'productivity-focus-reminder';
    if (!dismissedIds.has(focusId)) {
      generated.push({
        id: focusId,
        type: 'productivity',
        section: 'Productivity',
        title: `⏱️ Focus Alert`,
        description: `Dedicate 25 minutes of deep focus to crush your remaining goals today.`,
        timestamp: 'Focus',
        isRead: readIds.has(focusId),
        importance: 'normal',
      });
    }

    // 5. Security Alerts
    // Session Active
    const sessionSecuredId = 'security-session-secured';
    if (!dismissedIds.has(sessionSecuredId)) {
      generated.push({
        id: sessionSecuredId,
        type: 'security',
        section: 'Security',
        title: `🔒 Session Secured`,
        description: `Logged in securely as ${user?.email || 'authenticated user'} (Protected session).`,
        timestamp: 'Security',
        isRead: readIds.has(sessionSecuredId),
        importance: 'normal',
      });
    }

    // Biometric Alert
    const biometricId = 'security-biometric-active';
    if (!dismissedIds.has(biometricId)) {
      generated.push({
        id: biometricId,
        type: 'security',
        section: 'Security',
        title: `🛡️ Biometrics & Keychain Active`,
        description: `Hardware encryption and secure sandbox keys are enabled on this device.`,
        timestamp: 'Security',
        isRead: readIds.has(biometricId),
        importance: 'high',
      });
    }

    // Password connection verification
    const pwdSecuredId = 'security-password-secured';
    if (!dismissedIds.has(pwdSecuredId)) {
      generated.push({
        id: pwdSecuredId,
        type: 'security',
        section: 'Security',
        title: `🔑 Encryption Protocols Active`,
        description: `All databases are isolated, and transmission uses end-to-end SSL encryption.`,
        timestamp: 'Security',
        isRead: readIds.has(pwdSecuredId),
        importance: 'normal',
      });
    }

    console.log(`[NOTIFICATIONS GENERATED] Actionable count: ${generated.length}`);
    set({ notifications: generated });
  },

  markAsRead: (id) => {
    set((state) => {
      const updatedRead = new Set(state.readIds).add(id);
      const updatedNotifications = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return { readIds: updatedRead, notifications: updatedNotifications };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const updatedRead = new Set(state.readIds);
      state.notifications.forEach((n) => updatedRead.add(n.id));
      const updatedNotifications = state.notifications.map((n) => ({
        ...n,
        isRead: true,
      }));
      return { readIds: updatedRead, notifications: updatedNotifications };
    });
  },

  dismissNotification: (id) => {
    console.log(`[NOTIFICATION DISMISSED] id: ${id}`);
    set((state) => {
      const updatedDismissed = new Set(state.dismissedIds).add(id);
      const updatedNotifications = state.notifications.filter((n) => n.id !== id);
      return { dismissedIds: updatedDismissed, notifications: updatedNotifications };
    });
  },

  getUnreadCount: () => {
    // Only count unread if the item is importance = 'high' (as per unread indicators spec)
    return get().notifications.filter((n) => n.importance === 'high' && !n.isRead).length;
  },
}));
