/**
 * Important Day utility functions for KnoVault
 */

export const getMonthDay = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}-${day}`;
};

/**
 * Calculates days remaining until the important day.
 * If recurring, calculates days to the next annual occurrence.
 * If not recurring, calculates days to the exact date.
 */
export const calculateDaysRemaining = (eventDateStr: string, isRecurring = true) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = new Date(eventDateStr);
  eventDate.setHours(0, 0, 0, 0);

  if (!isRecurring) {
    const diffTime = eventDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Recurring
  const nextOccur = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  if (nextOccur < today) {
    nextOccur.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = nextOccur.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isImportantDayToday = (eventDateStr: string, isRecurring = true) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(eventDateStr);
  eventDate.setHours(0, 0, 0, 0);

  if (!isRecurring) {
    return today.getTime() === eventDate.getTime();
  }

  const todayMD = getMonthDay(today);
  const eventMD = getMonthDay(eventDate);
  return todayMD === eventMD;
};

/**
 * Sorts important days by nearest upcoming occurrence.
 */
export const sortImportantDaysByUpcoming = (importantDays: any[]) => {
  return [...importantDays].sort((a, b) => {
    const dateA = a.date || a.birth_date;
    const isRecA = a.is_recurring !== undefined ? a.is_recurring : true;
    const daysA = calculateDaysRemaining(dateA, isRecA);

    const dateB = b.date || b.birth_date;
    const isRecB = b.is_recurring !== undefined ? b.is_recurring : true;
    const daysB = calculateDaysRemaining(dateB, isRecB);

    if (daysA < 0 && daysB >= 0) return 1;
    if (daysB < 0 && daysA >= 0) return -1;
    return daysA - daysB;
  });
};

// ═══════════════════════════════════════════════════════
// AGE CALCULATION (Birthday-specific)
// ═══════════════════════════════════════════════════════

/**
 * Calculate current age from a birth date string.
 * Returns null if the type is not "Birthday".
 */
export const calculateAge = (birthDateStr: string): number => {
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

/**
 * Calculate the upcoming age (the age they will turn on their next birthday).
 */
export const calculateUpcomingAge = (birthDateStr: string): number => {
  return calculateAge(birthDateStr) + 1;
};

/**
 * Get age info for a birthday event. Returns null for non-birthday types.
 */
export const getAgeInfo = (eventDateStr: string, eventType: string): { currentAge: number; upcomingAge: number } | null => {
  if (eventType.toLowerCase() !== 'birthday') return null;
  const currentAge = calculateAge(eventDateStr);
  const upcomingAge = calculateUpcomingAge(eventDateStr);
  return { currentAge, upcomingAge };
};

// ═══════════════════════════════════════════════════════
// SMART NOTIFICATION MESSAGES
// ═══════════════════════════════════════════════════════

export type ReminderType = 'on_day' | '1_day' | '3_days' | '1_week' | '2_weeks' | '1_month' | 'custom';

export interface EventReminder {
  id?: number;
  eventId: number;
  reminderType: ReminderType;
  customValue?: number;
  customUnit?: 'days' | 'weeks' | 'months';
  sendTime: string; // HH:MM format
}

export const REMINDER_OPTIONS: { label: string; value: ReminderType; description: string }[] = [
  { label: 'On Event Day', value: 'on_day', description: 'At the scheduled time' },
  { label: '1 Day Before', value: '1_day', description: '24 hours before' },
  { label: '3 Days Before', value: '3_days', description: '3 days in advance' },
  { label: '1 Week Before', value: '1_week', description: '7 days in advance' },
  { label: '2 Weeks Before', value: '2_weeks', description: '14 days in advance' },
  { label: '1 Month Before', value: '1_month', description: '30 days in advance' },
  { label: 'Custom', value: 'custom', description: 'Set your own time' },
];

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  'on_day': 'On Event Day',
  '1_day': '1 Day Before',
  '3_days': '3 Days Before',
  '1_week': '1 Week Before',
  '2_weeks': '2 Weeks Before',
  '1_month': '1 Month Before',
  'custom': 'Custom',
};

export type DeliveryType = 'notification' | 'email' | 'both';

export const DELIVERY_OPTIONS: { label: string; value: DeliveryType; icon: string }[] = [
  { label: 'Notification Only', value: 'notification', icon: 'notifications-outline' },
  { label: 'Email Only', value: 'email', icon: 'mail-outline' },
  { label: 'Notification + Email', value: 'both', icon: 'paper-plane-outline' },
];

/**
 * Generate a smart notification message based on event type and timing.
 */
export const getSmartNotificationMessage = (
  title: string,
  eventType: string,
  daysUntil: number,
  ageInfo?: { currentAge: number; upcomingAge: number } | null,
): { notifTitle: string; notifBody: string } => {
  const typeLower = eventType.toLowerCase();
  const isBirthday = typeLower === 'birthday';
  const isAnniversary = typeLower.includes('anniversary');
  const isFestival = typeLower === 'festival';

  if (daysUntil === 0) {
    if (isBirthday && ageInfo) {
      return {
        notifTitle: `🎉 Happy Birthday ${title}!`,
        notifBody: `Today is ${title}'s Birthday! They turn ${ageInfo.upcomingAge} today! 🎂`,
      };
    }
    if (isAnniversary) return { notifTitle: `💍 Happy Anniversary!`, notifBody: `Today is ${title}! Celebrate the love! ❤️` };
    if (isFestival) return { notifTitle: `🎊 Happy ${title}!`, notifBody: `Today is ${title}! Enjoy the celebrations! 🎉` };
    return { notifTitle: `✨ Today: ${title}`, notifBody: `Today is ${title}! Don't forget to celebrate! 🎉` };
  }

  if (daysUntil === 1) {
    if (isBirthday && ageInfo) {
      return {
        notifTitle: `🎂 Birthday Tomorrow!`,
        notifBody: `${title} turns ${ageInfo.upcomingAge} tomorrow! Get ready! 🎁`,
      };
    }
    if (isAnniversary) return { notifTitle: `💍 Anniversary Tomorrow!`, notifBody: `${title} is tomorrow! Make it special! ❤️` };
    if (isFestival) return { notifTitle: `🎊 Festival Tomorrow!`, notifBody: `${title} starts tomorrow! Get prepared! 🎉` };
    return { notifTitle: `✨ Tomorrow: ${title}`, notifBody: `${title} is tomorrow! Don't forget to prepare!` };
  }

  // Generic days before
  const daysText = daysUntil === 7 ? '1 week' : daysUntil === 14 ? '2 weeks' : daysUntil === 30 ? '1 month' : `${daysUntil} days`;
  if (isBirthday && ageInfo) {
    return {
      notifTitle: `🎂 Birthday Reminder`,
      notifBody: `${title} turns ${ageInfo.upcomingAge} in ${daysText}!`,
    };
  }
  if (isAnniversary) return { notifTitle: `💍 Anniversary Reminder`, notifBody: `${title} is in ${daysText}!` };
  if (isFestival) return { notifTitle: `🎊 Festival Reminder`, notifBody: `${title} is in ${daysText}! Start preparing!` };
  return { notifTitle: `✨ Upcoming: ${title}`, notifBody: `${title} is in ${daysText}!` };
};

/**
 * Calculate the trigger date for a reminder given the event date.
 */
export const getReminderTriggerDate = (
  eventDateStr: string,
  reminderType: ReminderType,
  customValue?: number,
  customUnit?: 'days' | 'weeks' | 'months',
  isRecurring = true,
  sendTime?: string, // HH:MM
): Date => {
  const eventDate = new Date(eventDateStr);
  const now = new Date();
  
  // Set the time of the event to the intended sendTime (or default 09:00)
  if (sendTime) {
    const [hours, minutes] = sendTime.split(':').map(Number);
    eventDate.setHours(hours, minutes, 0, 0);
  } else {
    eventDate.setHours(9, 0, 0, 0);
  }

  const applyOffset = (date: Date): Date => {
    const trigger = new Date(date);
    switch (reminderType) {
      case 'on_day':
        break;
      case '1_day':
        trigger.setDate(trigger.getDate() - 1);
        break;
      case '3_days':
        trigger.setDate(trigger.getDate() - 3);
        break;
      case '1_week':
        trigger.setDate(trigger.getDate() - 7);
        break;
      case '2_weeks':
        trigger.setDate(trigger.getDate() - 14);
        break;
      case '1_month':
        trigger.setMonth(trigger.getMonth() - 1);
        break;
      case 'custom':
        if (customValue && customUnit) {
          if (customUnit === 'days') trigger.setDate(trigger.getDate() - customValue);
          else if (customUnit === 'weeks') trigger.setDate(trigger.getDate() - customValue * 7);
          else if (customUnit === 'months') trigger.setMonth(trigger.getMonth() - customValue);
        }
        break;
    }
    return trigger;
  };

  if (isRecurring) {
    // Try this year first
    const candidateThisYear = new Date(now.getFullYear(), eventDate.getMonth(), eventDate.getDate(), eventDate.getHours(), eventDate.getMinutes(), 0, 0);
    const triggerThisYear = applyOffset(candidateThisYear);
    
    if (triggerThisYear.getTime() > now.getTime()) {
      return triggerThisYear;
    }
    
    // If it already passed this year, it must be next year
    const candidateNextYear = new Date(now.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate(), eventDate.getHours(), eventDate.getMinutes(), 0, 0);
    return applyOffset(candidateNextYear);
  } else {
    // Non-recurring
    return applyOffset(eventDate);
  }
};

// Legacy compatibility
export const isSpecialDayToday = isImportantDayToday;
export const isBirthdayToday = isImportantDayToday;
export const sortSpecialDaysByUpcoming = sortImportantDaysByUpcoming;
export const sortBirthdaysByUpcoming = sortImportantDaysByUpcoming;
