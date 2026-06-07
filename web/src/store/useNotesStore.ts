import { create } from "zustand";
import { Note, Category } from "@/types/Note";
import { toast } from "sonner";
import { notesService } from "@/services/notes";

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
  categories: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchNotes: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await notesService.getNotes(params);
      set({ notes, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch notes", isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await notesService.getCategories();
      set({ categories });
    } catch (error) {
      console.error("Failed to fetch categories", error);
      toast.error("Failed to fetch categories. Using defaults.");
      // Fallback to defaults
      const defaults = ["General", "Personal", "Work", "Study", "Finance", "Passwords", "Ideas"];
      const fallbackCats = defaults.map(name => ({
        name,
        count: 0,
        is_custom: false
      }));
      set({ categories: fallbackCats });
    }
  },

  createNote: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newNote = await notesService.createNote(data);
      set((state) => ({
        notes: [newNote, ...state.notes],
        isSaving: false,
      }));
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
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
        isSaving: false,
      }));
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
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
      }));
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
    try {
      const newCat = await notesService.createCategory(name);
      set((state) => {
        // Prevent duplicates in state
        if (state.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
          return state;
        }
        const newCats = [...state.categories, newCat].sort((a, b) => a.name.localeCompare(b.name));
        return { categories: newCats };
      });
      return newCat;
    } catch (error) {
      console.error("Failed to create category", error);
      throw error;
    }
  },

  renameCategory: async (oldName, newName) => {
    try {
      const updatedCat = await notesService.renameCategory(oldName, newName);
      set((state) => ({
        categories: state.categories.map((c) => (c.name === oldName ? updatedCat : c)).sort((a, b) => a.name.localeCompare(b.name)),
        notes: state.notes.map((n) => (n.category === oldName ? { ...n, category: newName } : n))
      }));
    } catch (error) {
      console.error("Failed to rename category", error);
      throw error;
    }
  },

  deleteCategory: async (name) => {
    try {
      await notesService.deleteCategory(name);
      set((state) => ({
        categories: state.categories.filter((c) => c.name !== name),
        notes: state.notes.map((n) => (n.category === name ? { ...n, category: "General" } : n))
      }));
    } catch (error) {
      console.error("Failed to delete category", error);
      throw error;
    }
  },
}));
