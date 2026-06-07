import api from "@/lib/axios";
import { SpecialDay } from "@/types/SpecialDay";

export const specialDaysService = {
  getSpecialDays: async (params?: { skip?: number; limit?: number }) => {
    const response = await api.get<SpecialDay[]>("/api/special-days", { params });
    return response.data;
  },

  getTodaySpecialDays: async () => {
    const response = await api.get<SpecialDay[]>("/api/special-days/today");
    return response.data;
  },

  getSpecialDay: async (id: number) => {
    const response = await api.get<SpecialDay>(`/api/special-days/${id}`);
    return response.data;
  },

  createSpecialDay: async (data: Partial<SpecialDay>) => {
    const response = await api.post<SpecialDay>("/api/special-days", data);
    return response.data;
  },

  updateSpecialDay: async (id: number, data: Partial<SpecialDay>) => {
    const response = await api.put<SpecialDay>(`/api/special-days/${id}`, data);
    return response.data;
  },

  deleteSpecialDay: async (id: number) => {
    await api.delete(`/api/special-days/${id}`);
  },
};
