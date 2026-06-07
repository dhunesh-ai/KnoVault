import api from "@/lib/axios";
import { Reminder } from "@/types/Reminder";

export const remindersService = {
  getReminders: async (params?: { type?: string; upcoming?: boolean; start_date?: string; end_date?: string; skip?: number; limit?: number }) => {
    const response = await api.get<Reminder[]>("/api/reminders", { params });
    return response.data;
  },

  getUpcomingReminders: async (limit: number = 10) => {
    const response = await api.get<Reminder[]>("/api/reminders/upcoming", { params: { limit } });
    return response.data;
  },

  getReminder: async (id: number) => {
    const response = await api.get<Reminder>(`/api/reminders/${id}`);
    return response.data;
  },

  createReminder: async (data: Partial<Reminder>) => {
    const response = await api.post<Reminder>("/api/reminders", data);
    return response.data;
  },

  updateReminder: async (id: number, data: Partial<Reminder>) => {
    const response = await api.put<Reminder>(`/api/reminders/${id}`, data);
    return response.data;
  },

  deleteReminder: async (id: number) => {
    await api.delete(`/api/reminders/${id}`);
  },
};
