import { create } from "zustand";
import { CalendarNote, CalendarNoteCreate, CalendarNoteUpdate } from "@/types/CalendarNote";
import { calendarNotesService } from "@/services/calendarNotes";

interface CalendarNotesState {
  calendarNotes: CalendarNote[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchCalendarNotes: (params?: { date_str?: string; month?: string }) => Promise<void>;
  createCalendarNote: (data: CalendarNoteCreate) => Promise<CalendarNote>;
  updateCalendarNote: (id: number, data: CalendarNoteUpdate) => Promise<CalendarNote>;
  deleteCalendarNote: (id: number) => Promise<void>;
}

export const useCalendarNotesStore = create<CalendarNotesState>((set, get) => ({
  calendarNotes: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchCalendarNotes: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await calendarNotesService.getNotes(params);
      set({ calendarNotes: notes, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch calendar notes", isLoading: false });
    }
  },

  createCalendarNote: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newNote = await calendarNotesService.createNote(data);
      set((state) => ({
        calendarNotes: [newNote, ...state.calendarNotes],
        isSaving: false,
      }));
      return newNote;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create note", isSaving: false });
      throw error;
    }
  },

  updateCalendarNote: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedNote = await calendarNotesService.updateNote(id, data);
      set((state) => ({
        calendarNotes: state.calendarNotes.map((n) => (n.id === id ? updatedNote : n)),
        isSaving: false,
      }));
      return updatedNote;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update note", isSaving: false });
      throw error;
    }
  },

  deleteCalendarNote: async (id) => {
    set({ error: null });
    const prevNotes = get().calendarNotes;
    // Optimistic delete
    set((state) => ({
      calendarNotes: state.calendarNotes.filter((n) => n.id !== id),
    }));
    try {
      await calendarNotesService.deleteNote(id);
    } catch (error) {
      set({ calendarNotes: prevNotes, error: error instanceof Error ? error.message : "Failed to delete note" });
      throw error;
    }
  },
}));
