/**
 * Kogniva — Notes API Functions
 */
import { storageManager } from '../services/storageManager';
import type { Note, NoteCreate, NoteUpdate } from '../types/notes';

export const notesApi = {
  /** Fetch notes with optional filters */
  getNotes: async (params?: { category?: string; search?: string; pinned_only?: boolean }): Promise<Note[]> => {
    return storageManager.getNotes(params);
  },

  /** Fetch favorite notes */
  getFavorites: async (): Promise<Note[]> => {
    const notes = await storageManager.getNotes();
    return notes.filter(n => n.is_favorite);
  },

  /** Fetch a specific note */
  getNote: async (id: number): Promise<Note> => {
    return storageManager.getNote(id);
  },

  /** Fetch all used categories */
  getCategories: async (): Promise<string[]> => {
    const notes = await storageManager.getNotes();
    const categories = notes.map(n => n.category || 'General');
    return Array.from(new Set(categories));
  },

  /** Create a new note */
  createNote: async (data: NoteCreate): Promise<Note> => {
    return storageManager.createNote(data);
  },

  /** Update an existing note */
  updateNote: async (id: number, data: NoteUpdate): Promise<Note> => {
    return storageManager.updateNote(id, data);
  },

  /** Delete a note */
  deleteNote: async (id: number): Promise<void> => {
    await storageManager.deleteNote(id);
  },
} as const;
