export interface CalendarNote {
  id: number;
  title: string;
  content?: string | null;
  note_date: string; // YYYY-MM-DD
  color?: string | null;
  is_pinned?: boolean;
  is_all_day?: boolean;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarNoteCreate {
  title: string;
  content?: string | null;
  note_date: string;
  color?: string | null;
  is_pinned?: boolean;
  is_all_day?: boolean;
}

export interface CalendarNoteUpdate {
  title?: string;
  content?: string | null;
  note_date?: string;
  color?: string | null;
  is_pinned?: boolean;
  is_all_day?: boolean;
}
