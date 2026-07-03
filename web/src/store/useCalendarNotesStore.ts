import { create } from "zustand";
import { CalendarNote, CalendarNoteCreate, CalendarNoteUpdate } from "@/types/CalendarNote";
import { calendarNotesService } from "@/services/calendarNotes";

interface CalendarNotesState {
  notes: CalendarNote[];
  todayNotes: CalendarNote[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchCalendarNotes: (dateStr?: string) => Promise<void>;
  fetchTodayCalendarNotes: () => Promise<void>;
  createCalendarNote: (data: CalendarNoteCreate) => Promise<CalendarNote>;
  updateCalendarNote: (id: number, data: CalendarNoteUpdate) => Promise<CalendarNote>;
  deleteCalendarNote: (id: number) => Promise<void>;
}

export const useCalendarNotesStore = create<CalendarNotesState>((set, get) => ({
  notes: [],
  todayNotes: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchCalendarNotes: async (dateStr) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await calendarNotesService.getCalendarNotes(dateStr);
      set({ notes, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch calendar notes", isLoading: false });
    }
  },

  fetchTodayCalendarNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
      const todayNotes = await calendarNotesService.getCalendarNotesByDate(todayStr);
      set({ todayNotes, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch today's notes", isLoading: false });
    }
  },

  createCalendarNote: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newNote = await calendarNotesService.createCalendarNote(data);
      const todayStr = new Date().toLocaleDateString("en-CA");
      set((state) => ({
        notes: [newNote, ...state.notes],
        todayNotes: newNote.note_date === todayStr 
          ? [newNote, ...state.todayNotes] 
          : state.todayNotes,
        isSaving: false,
      }));
      return newNote;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create calendar note", isSaving: false });
      throw error;
    }
  },

  updateCalendarNote: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedNote = await calendarNotesService.updateCalendarNote(id, data);
      const todayStr = new Date().toLocaleDateString("en-CA");
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updatedNote : n)),
        todayNotes: updatedNote.note_date === todayStr
          ? state.todayNotes.some(n => n.id === id)
            ? state.todayNotes.map((n) => (n.id === id ? updatedNote : n))
            : [updatedNote, ...state.todayNotes]
          : state.todayNotes.filter((n) => n.id !== id),
        isSaving: false,
      }));
      return updatedNote;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update calendar note", isSaving: false });
      throw error;
    }
  },

  deleteCalendarNote: async (id) => {
    set({ error: null });
    try {
      await calendarNotesService.deleteCalendarNote(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        todayNotes: state.todayNotes.filter((n) => n.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete calendar note" });
      throw error;
    }
  },
}));
