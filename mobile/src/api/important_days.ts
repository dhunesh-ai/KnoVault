import apiClient from './client';

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
  
  // Legacy fields
  person_name?: string;
  birth_date?: string;
}

export const importantDaysApi = {
  getImportantDays: async () => {
    const url = '/api/important-days';
    // console.log("[IMPORTANT DAY API REQUEST]", url);
    const response = await apiClient.get<ImportantDay[]>(url);
    // console.log("[IMPORTANT DAY API RESPONSE]", response.data);
    return response.data;
  },
  getImportantDayById: async (id: number) => {
    const url = `/api/important-days/${id}`;
    // console.log("[IMPORTANT DAY API REQUEST]", url);
    const response = await apiClient.get<ImportantDay>(url);
    // console.log("[IMPORTANT DAY API RESPONSE]", response.data);
    return response.data;
  },
  getTodayImportantDays: async () => {
    const url = '/api/important-days/today';
    // console.log("[IMPORTANT DAY API REQUEST]", url);
    const response = await apiClient.get<ImportantDay[]>(url);
    // console.log("[IMPORTANT DAY API RESPONSE]", response.data);
    return response.data;
  },
  createImportantDay: async (data: Partial<ImportantDay>) => {
    // console.log("[IMPORTANT DAY CREATE REQUEST]", data);
    const response = await apiClient.post<ImportantDay>('/api/important-days', data);
    return response.data;
  },
  updateImportantDay: async (id: number, data: Partial<ImportantDay>) => {
    // console.log("[IMPORTANT DAY UPDATE REQUEST]", id, data);
    const response = await apiClient.put<ImportantDay>(`/api/important-days/${id}`, data);
    return response.data;
  },
  deleteImportantDay: async (id: number) => {
    // console.log("[IMPORTANT DAY DELETE REQUEST]", id);
    await apiClient.delete(`/api/important-days/${id}`);
  },
};

// Legacy compatibility exports
export type SpecialDay = ImportantDay;
export const specialDaysApi = importantDaysApi;
export type Birthday = ImportantDay;
export const birthdaysApi = importantDaysApi;
