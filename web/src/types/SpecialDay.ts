export type SpecialDayType =
  | "Birthday"
  | "Wedding Anniversary"
  | "Engagement"
  | "Festival"
  | "Meeting"
  | "Achievement"
  | "Personal Memory"
  | "Custom Event"
  | string;

export interface SpecialDay {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  type: SpecialDayType;
  is_recurring: boolean;
  custom_type?: string | null;
  notes?: string | null;
  gift_ideas?: string | null;
  celebration_plans?: string | null;
  reminder_notes?: string | null;
  message_draft?: string | null;

  // Contact / Person fields
  recipient_email?: string | null;
  phone_number?: string | null;
  relationship?: string | null;

  // Smart Reminder System fields
  reminder_enabled?: boolean;
  reminder_type?: string | null; // 'on_day' | '1_day' | '3_days' | '1_week' | '2_weeks' | '1_month' | 'custom'
  reminder_value?: number | null;
  reminder_unit?: string | null; // 'days' | 'weeks' | 'months'
  reminder_time?: string | null;

  // Auto Email Wishes fields
  auto_send_email: boolean;
  email_subject?: string | null;
  email_message?: string | null;
  email_send_time?: string | null;
  last_email_sent_at?: string | null;
  last_sent_year?: number | null;
  timezone?: string | null;
  email_status?: string | null;
  email_retry_count?: number;

  // Extended planning fields
  location?: string | null;
  emoji?: string | null;
  event_image?: string | null;
  favorite_color?: string | null;
  checklist?: string | null; // Serialized JSON or newline text
  budget?: string | null;
  links?: string | null;
  attachments?: string | null;

  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledEmail {
  id: number;
  recipient_email: string;
  subject: string;
  body: string;
  send_datetime: string;
  timezone: string;
  status: "scheduled" | "sending" | "sent" | "failed" | "cancelled" | string;
  error_message?: string | null;
  retry_count: number;
  user_id: number;
  important_day_id?: number | null;
  created_at: string;
}
