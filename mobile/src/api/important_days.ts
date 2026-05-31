import apiClient from './client';
import { ReminderType, DeliveryType, EventReminder } from '../utils/important_day';

export interface ImportantDay {
  id: number;
  title: string;
  date: string;
  type: string; // 'Birthday' | 'Wedding Anniversary' | 'Engagement' | 'Festival' | 'Meeting' | 'Achievement' | 'Personal Memory' | 'Custom Event'
  is_recurring: boolean;
  custom_type?: string | null;
  notes?: string | null;
  gift_ideas?: string | null;
  celebration_plans?: string | null;
  reminder_notes?: string | null;
  message_draft?: string | null;
  user_id: number;
  created_at: string;
  
  // Email wish fields
  recipient_email?: string | null;
  phone_number?: string | null;
  relationship?: string | null;
  email_subject?: string | null;
  email_message?: string | null;
  email_enabled?: boolean;
  delivery_type?: DeliveryType;
  send_time?: string | null; // HH:MM format

  // Reminders (stored as JSON string in the API)
  reminders?: EventReminder[] | null;

  // Smart Reminder System fields
  reminder_enabled?: boolean;
  reminder_type?: string | null;
  reminder_value?: number | null;
  reminder_unit?: string | null;
  reminder_time?: string | null;
  notification_ids?: string | null;

  // Legacy fields
  person_name?: string;
  birth_date?: string;
}

export const importantDaysApi = {
  getImportantDays: async () => {
    const url = '/api/important-days';
    const response = await apiClient.get<ImportantDay[]>(url);
    return response.data;
  },
  getImportantDayById: async (id: number) => {
    const url = `/api/important-days/${id}`;
    const response = await apiClient.get<ImportantDay>(url);
    return response.data;
  },
  getTodayImportantDays: async () => {
    const url = '/api/important-days/today';
    const response = await apiClient.get<ImportantDay[]>(url);
    return response.data;
  },
  createImportantDay: async (data: Partial<ImportantDay>) => {
    const response = await apiClient.post<ImportantDay>('/api/important-days', data);
    return response.data;
  },
  updateImportantDay: async (id: number, data: Partial<ImportantDay>) => {
    const response = await apiClient.put<ImportantDay>(`/api/important-days/${id}`, data);
    return response.data;
  },
  deleteImportantDay: async (id: number) => {
    await apiClient.delete(`/api/important-days/${id}`);
  },
};

// Legacy compatibility exports
export type SpecialDay = ImportantDay;
export const specialDaysApi = importantDaysApi;
export type Birthday = ImportantDay;
export const birthdaysApi = importantDaysApi;
