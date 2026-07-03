export interface CalendarNote {
  id: number;
  title: string;
  content?: string | null;
  note_date: string; // YYYY-MM-DD
  user_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface CalendarNoteCreate {
  title: string;
  content?: string | null;
  note_date: string; // YYYY-MM-DD
}

export interface CalendarNoteUpdate {
  title?: string;
  content?: string | null;
  note_date?: string; // YYYY-MM-DD
}
