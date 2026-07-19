import { create } from "zustand";
import { Note } from "@/types/Note";
import { notesService } from "@/services/notes";
import api from "@/lib/axios";

interface SecureNotesState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  isUnlocked: boolean;
  unlockSession: (password: string) => Promise<boolean>;
  lockSession: () => void;
  fetchSecureNotes: (search?: string) => Promise<void>;
  createSecureNote: (data: Partial<Note>) => Promise<Note>;
  updateSecureNote: (id: number, data: Partial<Note>) => Promise<Note>;
  deleteSecureNote: (id: number) => Promise<void>;
  toggleFavorite: (id: number, is_favorite: boolean) => Promise<void>;
}

export const useSecureNotesStore = create<SecureNotesState>((set) => ({
  notes: [],
  isLoading: false,
  error: null,
  isUnlocked: false,

  unlockSession: async (password: string) => {
    try {
      // Verify password using dedicated secure notes verification endpoint
      await api.post("/api/secure-notes/verify-password", { password });
      set({ isUnlocked: true, error: null });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Invalid password";
      set({ error: msg });
      return false;
    }
  },

  lockSession: () => {
    set({ isUnlocked: false, notes: [] });
  },

  fetchSecureNotes: async (search) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await notesService.getNotes({ search });
      // Filter secure notes (backend ensures they are decrypted if auth token is valid)
      const secureNotes = notes.filter((n) => n.is_secure || n.category === "Secure");
      set({ notes: secureNotes, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch secure notes", isLoading: false });
    }
  },

  createSecureNote: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newNote = await notesService.createNote({ ...data, is_secure: true, category: "Secure" });
      set((state) => ({
        notes: [newNote, ...state.notes],
        isLoading: false,
      }));
      return newNote;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create secure note", isLoading: false });
      throw error;
    }
  },

  updateSecureNote: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedNote = await notesService.updateNote(id, { ...data, is_secure: true, category: "Secure" });
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
        isLoading: false,
      }));
      return updatedNote;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update secure note", isLoading: false });
      throw error;
    }
  },

  deleteSecureNote: async (id) => {
    set({ error: null });
    try {
      await notesService.deleteNote(id);
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete secure note" });
      throw error;
    }
  },

  toggleFavorite: async (id, is_favorite) => {
    try {
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, is_favorite: !is_favorite } : note
        ),
      }));
      await notesService.updateNote(id, { is_favorite: !is_favorite });
    } catch (error) {
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, is_favorite } : note
        ),
      }));
      throw error;
    }
  },
}));
