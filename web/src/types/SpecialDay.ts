export interface SpecialDay {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  type: string; // birthday, anniversary, engagement, graduation, wedding, custom
  is_recurring: boolean;
  custom_type?: string | null;
  notes?: string | null;
  gift_ideas?: string | null;
  celebration_plans?: string | null;
  reminder_notes?: string | null;
  message_draft?: string | null;
  user_id?: number;
  created_at?: string;
  updated_at?: string;

  // Auto Email Wishes fields
  recipient_email?: string | null;
  auto_send_email: boolean;
  email_subject?: string | null;
  email_message?: string | null;
  email_send_time?: string | null;
  last_email_sent_at?: string | null;
  last_sent_year?: number | null;
}
