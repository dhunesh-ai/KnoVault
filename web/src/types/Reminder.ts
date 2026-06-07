export interface Reminder {
  id: number;
  title: string;
  description?: string | null;
  type: string; // 'meeting', 'assignment', 'event', 'birthday', 'medicine', 'custom'
  custom_type?: string | null;
  reminder_date: string; // ISO date string
  is_completed: boolean;
  user_id?: number;
  series_id?: string | null;
  created_at: string;
  updated_at: string;
}
