/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "@/lib/axios";
import { Reminder } from "@/types/Reminder";

export const medicineService = {
  getMedicineReminders: async (params?: { start_date?: string; end_date?: string; upcoming?: boolean }) => {
    const response = await api.get<Reminder[]>("/api/reminders", { 
      params: { type: "medicine", ...params } 
    });
    return response.data;
  },

  createMedicine: async (data: any) => {
    const response = await api.post<Reminder>("/api/reminders", {
      ...data,
      type: "medicine"
    });
    return response.data;
  },

  deleteMedicineSeries: async (seriesId: string) => {
    // We only need to delete one reminder with this series_id, 
    // the backend is configured to delete all matching series_id reminders automatically.
    // So we fetch one reminder of this series and delete it.
    const response = await api.get<Reminder[]>("/api/reminders", { params: { type: "medicine" }});
    const reminderToDelete = response.data.find(r => r.series_id === seriesId || (r.description && r.description.includes(seriesId)));
    if (reminderToDelete) {
      await api.delete(`/api/reminders/${reminderToDelete.id}`);
    }
  },
  
  markComplete: async (id: number, is_completed: boolean) => {
    const response = await api.put<Reminder>(`/api/reminders/${id}`, { is_completed });
    return response.data;
  }
};
