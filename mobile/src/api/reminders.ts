import apiClient from './client';

export interface Reminder {
  id: number;
  title: string;
  description: string | null;
  type: 'Assignment' | 'Meeting' | 'Birthday' | 'Event' | 'medicine' | 'custom' | string;
  custom_type?: string | null;
  reminder_date: string;
  user_id: number;
  
  // Medication course fields
  start_date?: string | null;
  end_date?: string | null;
  timing_label?: string | null;
  dose_index?: number | null;
  course_day?: number | null;
  notification_id?: string | null;
  is_completed?: boolean;
  series_id?: string | null;
}

export const remindersApi = {
  // Query Key: ['upcoming-reminders']
  getUpcomingReminders: async (limit: number = 10) => {
    const url = '/api/reminders/upcoming';
    // console.log("[API REQUEST]", url, { limit });
    const response = await apiClient.get<Reminder[]>(url, { params: { limit } });
    // console.log("[API RESPONSE]", url, response.data.length, "items");
    return response.data;
  },
  
  createReminder: async (data: Partial<Reminder>) => {
    const url = '/api/reminders';
    // console.log("[API REQUEST]", url, data);
    const response = await apiClient.post<Reminder>(url, data);
    // console.log("[API RESPONSE]", url, response.data);
    return response.data;
  },

  getReminders: async (params?: { type?: string; upcoming?: boolean; start_date?: string; end_date?: string }) => {
    const url = '/api/reminders';
    // console.log('[API REQUEST]', url, params);
    const response = await apiClient.get<Reminder[]>(url, { params });
    return response.data;
  },

  getReminder: async (id: number) => {
    const url = `/api/reminders/${id}`;
    const response = await apiClient.get<Reminder>(url);
    return response.data;
  },

  updateReminder: async (id: number, data: Partial<Reminder>) => {
    const url = `/api/reminders/${id}`;
    const response = await apiClient.put<Reminder>(url, data);
    return response.data;
  },

  deleteReminder: async (id: number) => {
    const url = `/api/reminders/${id}`;
    await apiClient.delete(url);
  },
};
