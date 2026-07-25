import api from "@/lib/axios";
import { SpecialDay, ScheduledEmail } from "@/types/SpecialDay";

export const specialDaysService = {
  getSpecialDays: async (params?: { skip?: number; limit?: number }) => {
    const response = await api.get<SpecialDay[]>("/api/important-days", { params });
    return response.data;
  },

  getTodaySpecialDays: async () => {
    const response = await api.get<SpecialDay[]>("/api/important-days/today");
    return response.data;
  },

  getSpecialDay: async (id: number) => {
    const response = await api.get<SpecialDay>(`/api/important-days/${id}`);
    return response.data;
  },

  createSpecialDay: async (data: Partial<SpecialDay> & { schedule_for_tomorrow?: boolean }) => {
    const response = await api.post<SpecialDay>("/api/important-days", data);
    return response.data;
  },

  updateSpecialDay: async (id: number, data: Partial<SpecialDay> & { schedule_for_tomorrow?: boolean }) => {
    const response = await api.put<SpecialDay>(`/api/important-days/${id}`, data);
    return response.data;
  },

  deleteSpecialDay: async (id: number) => {
    await api.delete(`/api/important-days/${id}`);
  },

  generateWish: async (data: { type: string; person_name: string; custom_type?: string | null }) => {
    const response = await api.post<{ subject: string; message: string }>("/api/important-days/generate-wish", data);
    return response.data;
  },

  sendTestEmail: async (data: { recipient_email: string; email_subject?: string; email_message?: string }) => {
    const response = await api.post<{ message: string }>("/api/important-days/send-test-email", data);
    return response.data;
  },

  getScheduledEmails: async () => {
    const response = await api.get<ScheduledEmail[]>("/api/scheduled-emails");
    return response.data;
  },

  deleteScheduledEmail: async (id: number) => {
    await api.delete(`/api/scheduled-emails/${id}`);
  },
};
