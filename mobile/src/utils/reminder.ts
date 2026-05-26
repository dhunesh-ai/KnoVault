/**
 * KnoVault — Reminder Parsing Utilities
 *
 * Provides helper functions to normalize and parse reminder titles,
 * subtitles, and categories for UI rendering (e.g., in Upcoming Reminders and Calendar).
 */

import { formatTimeStringTo12Hour } from './date';

export interface ParsableReminder {
  title: string;
  description?: string | null;
  notes?: string | null;
  type?: string;
  custom_type?: string | null;
}

/**
 * Parses the title of a reminder, resolving structured JSON details if present.
 */
export function getReminderTitle(reminder: ParsableReminder | null | undefined): string {
  if (!reminder) return 'Untitled Reminder';
  
  const desc = (reminder.description || reminder.notes || '').trim();
  if (desc.startsWith('{')) {
    try {
      const parsed = JSON.parse(desc);
      if (parsed.isMedicine) {
        return `💊 Take ${parsed.medName || reminder.title || 'Medicine'}`;
      }
      if (parsed.isCustom) {
        const icon = parsed.customIcon ? parsed.customIcon.split(' ')[0] : '🎯';
        return `${icon} ${parsed.customName || reminder.title}`;
      }
    } catch {
      // Degrade gracefully to simple title if parsing fails
    }
  }

  // Fallback to title
  return reminder.title || 'Untitled Reminder';
}

/**
 * Parses the subtitle of a reminder, formatting medicine details or notes.
 */
export function getReminderSubtitle(reminder: ParsableReminder | null | undefined): string {
  if (!reminder) return '';

  const desc = (reminder.description || reminder.notes || '').trim();
  if (desc.startsWith('{')) {
    try {
      const parsed = JSON.parse(desc);
      if (parsed.isMedicine) {
        const parts: string[] = [];
        
        if (parsed.dosage) {
          parts.push(parsed.dosage);
        }
        
        if (parsed.foodTiming) {
          parts.push(parsed.foodTiming);
        }
        
        if (parsed.timings && Array.isArray(parsed.timings) && parsed.timings.length > 0) {
          const cleanTimings = parsed.timings.map((t: string) => t.split(' ')[0]);
          parts.push(cleanTimings.join(' & '));
        } else if (parsed.frequency) {
          parts.push(parsed.frequency);
        }
        
        return parts.join(' • ');
      }
      
      if (parsed.isCustom) {
        return parsed.notes || '';
      }
    } catch {
      // Degrade gracefully if parsing fails
    }
  }

  // If it's a standard text description
  return reminder.description || reminder.notes || '';
}

/**
 * Normalizes the category type of a reminder.
 */
export function getReminderCategory(reminder: ParsableReminder | null | undefined): string {
  if (!reminder) return 'custom';

  const desc = (reminder.description || reminder.notes || '').trim();
  if (desc.startsWith('{')) {
    try {
      const parsed = JSON.parse(desc);
      if (parsed.isMedicine) return 'medicine';
      if (parsed.isCustom) return 'custom';
    } catch {
      // Degrade gracefully
    }
  }

  return (reminder.type || 'custom').toLowerCase().trim();
}

/**
 * Returns a clean summary for medicine timings, e.g. "Breakfast • 8:30 AM".
 */
export function getMedicineSummary(reminder: ParsableReminder | null | undefined): string {
  if (!reminder) return '';
  const desc = (reminder.description || reminder.notes || '').trim();
  if (desc.startsWith('{')) {
    try {
      const parsed = JSON.parse(desc);
      if (parsed.isMedicine) {
        const timing = parsed.timing ? parsed.timing.split(' ')[0] : '';
        let formattedTime = '';
        if (parsed.timing_times && parsed.timing && parsed.timing_times[parsed.timing]) {
          formattedTime = formatTimeStringTo12Hour(parsed.timing_times[parsed.timing]);
        } else if ((reminder as any).reminder_date) {
          const d = new Date((reminder as any).reminder_date);
          formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if ((reminder as any).time) {
          formattedTime = formatTimeStringTo12Hour((reminder as any).time);
        }
        return [timing, formattedTime].filter(Boolean).join(' • ');
      }
    } catch {
      // Degrade gracefully
    }
  }
  return '';
}

/**
 * Returns a beautiful subtitle for medicine cards, e.g. "1 tablet • After Food • Day 2 of 5".
 */
export function formatMedicineSubtitle(reminder: ParsableReminder | null | undefined): string {
  if (!reminder) return '';
  const desc = (reminder.description || reminder.notes || '').trim();
  if (desc.startsWith('{')) {
    try {
      const parsed = JSON.parse(desc);
      if (parsed.isMedicine) {
        const dosage = parsed.dosage || '';
        const food = parsed.foodTiming || '';
        const dayInfo = parsed.day_number && parsed.total_days ? `Day ${parsed.day_number} of ${parsed.total_days}` : '';
        return [dosage, food, dayInfo].filter(Boolean).join(' • ');
      }
    } catch {
      // Degrade gracefully
    }
  }
  return reminder.description || reminder.notes || '';
}

/**
 * Finds and formats the next upcoming dose time from a list of reminders.
 */
export function getNextDoseTime(reminders: ParsableReminder[] | null | undefined): string {
  if (!reminders || reminders.length === 0) return 'No upcoming doses';
  
  const now = new Date();
  const upcomingMeds = reminders
    .filter(r => {
      const category = getReminderCategory(r);
      if (category !== 'medicine') return false;
      const rDate = (r as any).reminder_date ? new Date((r as any).reminder_date) : null;
      return rDate && rDate > now;
    })
    .sort((a, b) => {
      const ad = new Date((a as any).reminder_date).getTime();
      const bd = new Date((b as any).reminder_date).getTime();
      return ad - bd;
    });

  if (upcomingMeds.length === 0) return 'No upcoming doses';
  const next = upcomingMeds[0];
  const title = getReminderTitle(next);
  const time = (next as any).reminder_date 
    ? new Date((next as any).reminder_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  return `Next: ${title} at ${time}`;
}

/**
 * Generates local medication dose occurrences for previews or calendar mockups.
 */
export function generateMedicineOccurrences(
  medName: string,
  duration: string,
  timings: string[],
  timingTimes: Record<string, string>,
  startDate: Date
): Array<{ date: Date; timing: string; time: string }> {
  let durationDays = 5;
  const ds = duration.toLowerCase().trim();
  if (ds.includes('day')) {
    durationDays = parseInt(ds) || 5;
  } else if (ds.includes('week')) {
    durationDays = (parseInt(ds) || 1) * 7;
  } else if (ds.includes('month')) {
    durationDays = (parseInt(ds) || 1) * 30;
  } else {
    durationDays = parseInt(ds) || 5;
  }

  const occurrences: Array<{ date: Date; timing: string; time: string }> = [];

  for (let d = 0; d < durationDays; d++) {
    for (const t of timings) {
      const timeStr = timingTimes[t] || '08:00';
      const parts = timeStr.split(':');
      const hour = parseInt(parts[0]) || 8;
      const minute = parseInt(parts[1]) || 0;

      const occDate = new Date(startDate);
      occDate.setDate(occDate.getDate() + d);
      occDate.setHours(hour, minute, 0, 0);

      occurrences.push({
        date: occDate,
        timing: t,
        time: timeStr
      });
    }
  }

  return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}
