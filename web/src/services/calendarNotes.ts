import api from "@/lib/axios";
import { CalendarNote, CalendarNoteCreate, CalendarNoteUpdate } from "@/types/CalendarNote";

export const calendarNotesService = {
  getCalendarNotes: async (dateStr?: string): Promise<CalendarNote[]> => {
    const response = await api.get<CalendarNote[]>("/api/calendar-notes", {
      params: dateStr ? { date_str: dateStr } : undefined,
    });
    return response.data;
  },

  getCalendarNotesByDate: async (dateVal: string): Promise<CalendarNote[]> => {
    const response = await api.get<CalendarNote[]>(`/api/calendar-notes/date/${dateVal}`);
    return response.data;
  },

  getCalendarNote: async (id: number): Promise<CalendarNote> => {
    const response = await api.get<CalendarNote>(`/api/calendar-notes/${id}`);
    return response.data;
  },

  createCalendarNote: async (data: CalendarNoteCreate): Promise<CalendarNote> => {
    const response = await api.post<CalendarNote>("/api/calendar-notes", data);
    return response.data;
  },

  updateCalendarNote: async (id: number, data: CalendarNoteUpdate): Promise<CalendarNote> => {
    const response = await api.put<CalendarNote>(`/api/calendar-notes/${id}`, data);
    return response.data;
  },

  deleteCalendarNote: async (id: number): Promise<void> => {
    await api.delete(`/api/calendar-notes/${id}`);
  },
};
