import { create } from 'zustand';
import { getDB } from '../services/db';

export interface NotificationRecord {
  id: number;
  title: string;
  body: string;
  category: string;
  payload: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: NotificationRecord[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  pendingRoute: string | null;
  setPendingRoute: (route: string | null) => void;
}

const updateBadge = async (count: number) => {
  try {
    const { setBadgeCountAsync } = require('expo-notifications');
    await setBadgeCountAsync(count);
  } catch (e) {
    // Ignore if not supported
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pendingRoute: null,
  
  setPendingRoute: (route: string | null) => set({ pendingRoute: route }),

  fetchNotifications: async () => {
    try {
      const db = getDB();
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM NotificationHistory ORDER BY created_at DESC'
      );
      
      const parsed = rows.map(r => ({
        ...r,
        is_read: Boolean(r.is_read)
      }));
      
      const unreadCount = parsed.filter((r: any) => !r.is_read).length;
      set({ notifications: parsed, unreadCount });
      updateBadge(unreadCount);
    } catch (error) {
      console.error('[NotificationStore] Failed to fetch notifications:', error);
    }
  },

  markAsRead: async (id: number) => {
    try {
      const db = getDB();
      await db.runAsync('UPDATE NotificationHistory SET is_read = 1 WHERE id = ?', [id]);
      
      const updated = get().notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      );
      
      const unreadCount = updated.filter(r => !r.is_read).length;
      set({ notifications: updated, unreadCount });
      updateBadge(unreadCount);
    } catch (error) {
      console.error('[NotificationStore] Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      const db = getDB();
      await db.runAsync('UPDATE NotificationHistory SET is_read = 1');
      
      const updated = get().notifications.map(n => ({ ...n, is_read: true }));
      
      set({ notifications: updated, unreadCount: 0 });
      updateBadge(0);
    } catch (error) {
      console.error('[NotificationStore] Failed to mark all as read:', error);
    }
  },

  deleteNotification: async (id: number) => {
    try {
      const db = getDB();
      await db.runAsync('DELETE FROM NotificationHistory WHERE id = ?', [id]);
      
      const updated = get().notifications.filter(n => n.id !== id);
      
      const unreadCount = updated.filter(r => !r.is_read).length;
      set({ notifications: updated, unreadCount });
      updateBadge(unreadCount);
    } catch (error) {
      console.error('[NotificationStore] Failed to delete notification:', error);
    }
  },

  clearAll: async () => {
    try {
      const db = getDB();
      await db.runAsync('DELETE FROM NotificationHistory');
      
      set({ notifications: [], unreadCount: 0 });
      updateBadge(0);
    } catch (error) {
      console.error('[NotificationStore] Failed to clear notifications:', error);
    }
  }
}));

export const logNotificationToHistory = async (
  title: string, 
  body: string, 
  category: string, 
  payload?: any
) => {
  try {
    const db = getDB();
    await db.runAsync(
      'INSERT INTO NotificationHistory (title, body, category, payload) VALUES (?, ?, ?, ?)',
      [title, body, category, payload ? JSON.stringify(payload) : null]
    );
    // Trigger UI update if needed
    useNotificationStore.getState().fetchNotifications();
  } catch (error) {
    console.error('[NotificationStore] Failed to log notification:', error);
  }
};
