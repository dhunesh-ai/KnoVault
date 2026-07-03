import client from './client';

export interface CalendarNote {
  id: number;
  title: string;
  content?: string | null;
  note_date: string; // YYYY-MM-DD
  user_id: number;
  created_at: string;
  updated_at: string;
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

export const calendarNotesApi = {
  getCalendarNotes: async (dateStr?: string): Promise<CalendarNote[]> => {
    const response = await client.get<CalendarNote[]>('/api/calendar-notes', {
      params: dateStr ? { date_str: dateStr } : undefined,
    });
    return response.data;
  },

  getCalendarNotesByDate: async (dateVal: string): Promise<CalendarNote[]> => {
    const response = await client.get<CalendarNote[]>(`/api/calendar-notes/date/${dateVal}`);
    return response.data;
  },

  getCalendarNote: async (id: number): Promise<CalendarNote> => {
    const response = await client.get<CalendarNote>(`/api/calendar-notes/${id}`);
    return response.data;
  },

  createCalendarNote: async (data: CalendarNoteCreate): Promise<CalendarNote> => {
    const response = await client.post<CalendarNote>('/api/calendar-notes', data);
    return response.data;
  },

  updateCalendarNote: async (id: number, data: CalendarNoteUpdate): Promise<CalendarNote> => {
    const response = await client.put<CalendarNote>(`/api/calendar-notes/${id}`, data);
    return response.data;
  },

  deleteCalendarNote: async (id: number): Promise<void> => {
    await client.delete(`/api/calendar-notes/${id}`);
  },
} as const;
