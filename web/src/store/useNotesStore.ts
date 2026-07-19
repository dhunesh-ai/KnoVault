import { create } from "zustand";
import { Note, Category } from "@/types/Note";
import { toast } from "sonner";
import { notesService } from "@/services/notes";
import { NOTE_CATEGORIES } from "@/constants/noteCategories";

interface NotesState {
  notes: Note[];
  categories: Category[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchNotes: (params?: { search?: string; category?: string }) => Promise<void>;
  fetchCategories: () => Promise<void>;
  createNote: (data: Partial<Note>) => Promise<Note>;
  updateNote: (id: number, data: Partial<Note>) => Promise<Note>;
  deleteNote: (id: number) => Promise<void>;
  toggleFavorite: (id: number, is_favorite: boolean) => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  categories: NOTE_CATEGORIES.map(cat => ({ name: cat.name, count: 0, is_custom: false })),
  isLoading: false,
  isSaving: false,
  error: null,

  fetchNotes: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await notesService.getNotes(params);
      const categories = NOTE_CATEGORIES.map(cat => {
        const count = notes.filter(n => n.category === cat.name || (cat.name === "Secure" && n.is_secure)).length;
        return { name: cat.name, count, is_custom: false };
      });
      set({ notes, categories, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch notes", isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const { notes } = get();
      const categories = NOTE_CATEGORIES.map(cat => {
        const count = notes.filter(n => n.category === cat.name || (cat.name === "Secure" && n.is_secure)).length;
        return { name: cat.name, count, is_custom: false };
      });
      set({ categories });
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  },

  createNote: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newNote = await notesService.createNote(data);
      set((state) => {
        const updatedNotes = [newNote, ...state.notes];
        const categories = NOTE_CATEGORIES.map(cat => {
          const count = updatedNotes.filter(n => n.category === cat.name || (cat.name === "Secure" && n.is_secure)).length;
          return { name: cat.name, count, is_custom: false };
        });
        return {
          notes: updatedNotes,
          categories,
          isSaving: false,
        };
      });
      return newNote;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create note", isSaving: false });
      throw error;
    }
  },

  updateNote: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedNote = await notesService.updateNote(id, data);
      set((state) => {
        const updatedNotes = state.notes.map((note) => (note.id === id ? updatedNote : note));
        const categories = NOTE_CATEGORIES.map(cat => {
          const count = updatedNotes.filter(n => n.category === cat.name || (cat.name === "Secure" && n.is_secure)).length;
          return { name: cat.name, count, is_custom: false };
        });
        return {
          notes: updatedNotes,
          categories,
          isSaving: false,
        };
      });
      return updatedNote;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update note", isSaving: false });
      throw error;
    }
  },

  deleteNote: async (id) => {
    set({ error: null });
    try {
      await notesService.deleteNote(id);
      set((state) => {
        const updatedNotes = state.notes.filter((note) => note.id !== id);
        const categories = NOTE_CATEGORIES.map(cat => {
          const count = updatedNotes.filter(n => n.category === cat.name || (cat.name === "Secure" && n.is_secure)).length;
          return { name: cat.name, count, is_custom: false };
        });
        return {
          notes: updatedNotes,
          categories,
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete note" });
      throw error;
    }
  },

  toggleFavorite: async (id, is_favorite) => {
    try {
      // Optimistic update
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, is_favorite: !is_favorite } : note
        ),
      }));
      await notesService.updateNote(id, { is_favorite: !is_favorite });
    } catch (error) {
      // Revert on failure
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, is_favorite } : note
        ),
      }));
      throw error;
    }
  },

  createCategory: async (name: string) => {
    const newCat = { name, count: 0, is_custom: false };
    return newCat;
  },

  renameCategory: async () => {},

  deleteCategory: async () => {},
}));
