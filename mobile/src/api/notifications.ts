/**
 * KnoVault — Workspace Notifications API
 */
import client from './client';

export interface WorkspaceNotification {
  id: number;
  user_id: number;
  workspace_id: number | null;
  workspace_name: string | null;
  title: string;
  message: string;
  type: string;
  related_item_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  /** Fetch all notifications for the current user */
  getAll: async (): Promise<WorkspaceNotification[]> => {
    const response = await client.get<WorkspaceNotification[]>('/api/notifications');
    return response.data;
  },

  /** Mark a single notification as read */
  markRead: async (id: number): Promise<void> => {
    await client.put(`/api/notifications/${id}/read`);
  },

  /** Mark all notifications as read */
  markAllRead: async (): Promise<void> => {
    await client.put('/api/notifications/read-all');
  },

  /** Delete a single notification */
  deleteOne: async (id: number): Promise<void> => {
    await client.delete(`/api/notifications/${id}`);
  },

  /** Clear all notifications */
  clearAll: async (): Promise<void> => {
    await client.delete('/api/notifications/clear-all');
  },
};
