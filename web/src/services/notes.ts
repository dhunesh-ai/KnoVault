import api from "@/lib/axios";
import { Note, Category } from "@/types/Note";

export const notesService = {
  getNotes: async (params?: { search?: string; category?: string; note_type?: string; skip?: number; limit?: number }) => {
    const response = await api.get<Note[]>("/api/notes", { params });
    return response.data;
  },

  getNote: async (id: number) => {
    const response = await api.get<Note>(`/api/notes/${id}`);
    return response.data;
  },

  createNote: async (data: Partial<Note>) => {
    const response = await api.post<Note>("/api/notes", data);
    return response.data;
  },

  updateNote: async (id: number, data: Partial<Note>) => {
    const response = await api.put<Note>(`/api/notes/${id}`, data);
    return response.data;
  },

  deleteNote: async (id: number) => {
    await api.delete(`/api/notes/${id}`);
  },

  getCategories: async () => {
    const response = await api.get<Category[]>("/api/notes/categories");
    return response.data;
  },

  createCategory: async (name: string) => {
    const response = await api.post<Category>("/api/notes/categories", { name });
    return response.data;
  },

  renameCategory: async (oldName: string, newName: string) => {
    const response = await api.put<Category>(`/api/notes/categories/${encodeURIComponent(oldName)}`, { new_name: newName });
    return response.data;
  },

  deleteCategory: async (name: string) => {
    await api.delete(`/api/notes/categories/${encodeURIComponent(name)}`);
  },
};
