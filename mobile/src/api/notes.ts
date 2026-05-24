/**
 * Kogniva — Notes API Functions
 */
import client from './client';
import type { Note, NoteCreate, NoteUpdate } from '../types/notes';

export const notesApi = {
  /** Fetch notes with optional filters */
  getNotes: async (params?: { category?: string; search?: string; pinned_only?: boolean }): Promise<Note[]> => {
    const response = await client.get<Note[]>('/api/notes', { params });
    return response.data;
  },

  /** Fetch favorite notes */
  getFavorites: async (): Promise<Note[]> => {
    const response = await client.get<Note[]>('/api/notes/favorites');
    return response.data;
  },

  /** Fetch a specific note */
  getNote: async (id: number): Promise<Note> => {
    const response = await client.get<Note>(`/api/notes/${id}`);
    return response.data;
  },

  /** Fetch all used categories */
  getCategories: async (): Promise<string[]> => {
    const response = await client.get<string[]>('/api/notes/categories');
    return response.data;
  },

  /** Create a new note */
  createNote: async (data: NoteCreate): Promise<Note> => {
    const response = await client.post<Note>('/api/notes', data);
    return response.data;
  },

  /** Update an existing note */
  updateNote: async (id: number, data: NoteUpdate): Promise<Note> => {
    const response = await client.put<Note>(`/api/notes/${id}`, data);
    return response.data;
  },

  /** Delete a note */
  deleteNote: async (id: number): Promise<void> => {
    await client.delete(`/api/notes/${id}`);
  },
} as const;
