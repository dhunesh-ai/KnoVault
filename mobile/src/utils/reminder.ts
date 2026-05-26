/**
 * KnoVault — Reminder Parsing Utilities
 *
 * Provides helper functions to normalize and parse reminder titles,
 * subtitles, and categories for UI rendering (e.g., in Upcoming Reminders and Calendar).
 */

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
          // Clean timing names, e.g. "Breakfast 🍳" -> "Breakfast"
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
