import apiClient from './client';

export interface ScheduledEmail {
  id: number;
  recipient_email: string;
  subject: string;
  body: string;
  send_datetime: string;
  timezone: string;
  status: 'scheduled' | 'sending' | 'sent' | 'failed';
  error_message?: string | null;
  retry_count: number;
  sent_at?: string | null;
  created_at: string;
  important_day_id?: number | null;
  user_id: number;
}

export const scheduledEmailsApi = {
  getScheduledEmails: async () => {
    const response = await apiClient.get<ScheduledEmail[]>('/api/scheduled-emails');
    return response.data;
  },
  deleteScheduledEmail: async (id: number) => {
    await apiClient.delete(`/api/scheduled-emails/${id}`);
  },
};
