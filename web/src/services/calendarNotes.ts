import api from "@/lib/axios";
import { CalendarNote, CalendarNoteCreate, CalendarNoteUpdate } from "@/types/CalendarNote";

export const calendarNotesService = {
  getNotes: async (params?: { date_str?: string; month?: string }): Promise<CalendarNote[]> => {
    const res = await api.get<CalendarNote[]>("/api/calendar-notes", { params });
    return res.data;
  },

  getNoteById: async (id: number): Promise<CalendarNote> => {
    const res = await api.get<CalendarNote>(`/api/calendar-notes/${id}`);
    return res.data;
  },

  createNote: async (data: CalendarNoteCreate): Promise<CalendarNote> => {
    const res = await api.post<CalendarNote>("/api/calendar-notes", data);
    return res.data;
  },

  updateNote: async (id: number, data: CalendarNoteUpdate): Promise<CalendarNote> => {
    const res = await api.put<CalendarNote>(`/api/calendar-notes/${id}`, data);
    return res.data;
  },

  deleteNote: async (id: number): Promise<void> => {
    await api.delete(`/api/calendar-notes/${id}`);
  },
};
