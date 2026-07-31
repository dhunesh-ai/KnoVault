import { create } from 'zustand';
import { notificationsApi, WorkspaceNotification } from '../api/notifications';
import { dbQueue } from '../services/db';

// ── Types ────────────────────────────────────────────────────────────

/** Backend workspace notification record */
export type { WorkspaceNotification };

/** Local notification record (SQLite, for local scheduled notifications) */
export interface LocalNotificationRecord {
  id: number;
  title: string;
  body: string;
  category: string;
  payload: string;
  is_read: boolean;
  created_at: string;
}

/** Unified notification record shown in the UI */
export type NotificationRecord =
  | (WorkspaceNotification & { source: 'backend' })
  | (LocalNotificationRecord & { source: 'local'; type?: string; workspace_name?: string | null; message?: string });

// ── State ────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: NotificationRecord[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number, source?: 'backend' | 'local') => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number, source?: 'backend' | 'local') => Promise<void>;
  clearAll: () => Promise<void>;
  pendingRoute: string | null;
  setPendingRoute: (route: string | null) => void;
}

// ── Badge Helper ─────────────────────────────────────────────────────

const updateBadge = async (count: number) => {
  try {
    const { setBadgeCountAsync } = require('expo-notifications');
    await setBadgeCountAsync(count);
  } catch {
    // Ignore if not supported
  }
};

// ── Store ────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  pendingRoute: null,

  setPendingRoute: (route) => set({ pendingRoute: route }),

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      // 1. Fetch from backend (workspace notifications)
      const backendNotifs: (WorkspaceNotification & { source: 'backend' })[] = [];
      try {
        const data = await notificationsApi.getAll();
        data.forEach((n) => backendNotifs.push({ ...n, source: 'backend' }));
      } catch (err) {
        console.warn('[NotificationStore] Backend fetch failed (offline?):', err);
      }

      // 2. Fetch from local SQLite (scheduled reminder notifications)
      const localNotifs: (LocalNotificationRecord & { source: 'local'; type?: string; workspace_name?: string | null; message?: string })[] = [];
      try {
        await dbQueue.write(async (db) => {
          await db.runAsync(
            `DELETE FROM NotificationHistory WHERE 
             title LIKE '%Biometrics%' OR 
             title LIKE '%Keychain%' OR 
             title LIKE '%Session Secured%' OR 
             title LIKE '%Fingerprint%' OR 
             title LIKE '%Device authentication%' OR
             title LIKE '%Keychain initialized%'`
          );
        });

        const rows = await dbQueue.read(async (db) => {
          return db.getAllAsync<any>(
            'SELECT * FROM NotificationHistory ORDER BY created_at DESC LIMIT 50'
          );
        });

        rows.forEach((r) =>
          localNotifs.push({
            ...r,
            is_read: Boolean(r.is_read),
            source: 'local',
          })
        );
      } catch (err) {
        console.warn('[NotificationStore] Local fetch failed:', err);
      }

      // 3. Merge — backend first (newer/more important), then local (filtered to prevent duplicates)
      const backendRelatedIds = new Set<string>();
      backendNotifs.forEach(n => {
        if (n.related_item_id) {
          backendRelatedIds.add(n.related_item_id);
        }
      });

      const filteredLocalNotifs = localNotifs.filter(localNotif => {
        if (!localNotif.payload) return true;
        try {
          const payload = JSON.parse(localNotif.payload);
          if (!payload.type || !payload.id || !payload.reminderType) return true;
          
          let mappedRelatedId = '';
          const offset = payload.reminderType === '5m' ? 5 : 0;
          
          if (payload.type === 'workspace_meeting' || payload.type === 'meeting') {
            mappedRelatedId = `meeting:${payload.id}:reminder:${offset}`;
          } else if (payload.type === 'workspace_event' || payload.type === 'event') {
            mappedRelatedId = `event:${payload.id}:reminder:${offset}`;
          }
          
          if (mappedRelatedId && backendRelatedIds.has(mappedRelatedId)) {
            console.log(`[NotificationStore] Deduplicated local notification: ${mappedRelatedId}`);
            return false;
          }
        } catch (e) {
          // JSON parse failed, keep it
        }
        return true;
      });

      const merged = [...backendNotifs, ...filteredLocalNotifs];

      const unreadCount = merged.filter((n) => !n.is_read).length;
      set({ notifications: merged, unreadCount, isLoading: false });
      updateBadge(unreadCount);
    } catch (error) {
      console.error('[NotificationStore] Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id, source = 'backend') => {
    try {
      if (source === 'backend') {
        await notificationsApi.markRead(id);
      } else {
        await dbQueue.write(async (db) => {
          await db.runAsync('UPDATE NotificationHistory SET is_read = 1 WHERE id = ?', [id]);
        });
      }
      const updated = get().notifications.map((n) =>
        n.id === id && n.source === source ? { ...n, is_read: true } : n
      );
      const unreadCount = updated.filter((n) => !n.is_read).length;
      set({ notifications: updated, unreadCount });
      updateBadge(unreadCount);
    } catch (error) {
      console.error('[NotificationStore] Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      // Mark backend notifications
      await notificationsApi.markAllRead().catch(() => {});
      // Mark local notifications
      try {
        await dbQueue.write(async (db) => {
          await db.runAsync('UPDATE NotificationHistory SET is_read = 1');
        });
      } catch {}

      const updated = get().notifications.map((n) => ({ ...n, is_read: true }));
      set({ notifications: updated, unreadCount: 0 });
      updateBadge(0);
    } catch (error) {
      console.error('[NotificationStore] Failed to mark all as read:', error);
    }
  },

  deleteNotification: async (id, source = 'backend') => {
    try {
      if (source === 'backend') {
        await notificationsApi.deleteOne(id);
      } else {
        await dbQueue.write(async (db) => {
          await db.runAsync('DELETE FROM NotificationHistory WHERE id = ?', [id]);
        });
      }
      const updated = get().notifications.filter(
        (n) => !(n.id === id && n.source === source)
      );
      const unreadCount = updated.filter((n) => !n.is_read).length;
      set({ notifications: updated, unreadCount });
      updateBadge(unreadCount);
    } catch (error) {
      console.error('[NotificationStore] Failed to delete notification:', error);
    }
  },

  clearAll: async () => {
    try {
      await notificationsApi.clearAll().catch(() => {});
      try {
        await dbQueue.write(async (db) => {
          await db.runAsync('DELETE FROM NotificationHistory');
        });
      } catch {}
      set({ notifications: [], unreadCount: 0 });
      updateBadge(0);
    } catch (error) {
      console.error('[NotificationStore] Failed to clear all:', error);
    }
  },
}));

// ── Local Notification Logger ─────────────────────────────────────────

export const logNotificationToHistory = async (
  title: string,
  body: string,
  category: string,
  payload?: any
) => {
  try {
    await dbQueue.write(async (db) => {
      await db.runAsync(
        'INSERT INTO NotificationHistory (title, body, category, payload) VALUES (?, ?, ?, ?)',
        title ?? 'Notification',
        body ?? '',
        category ?? 'system',
        payload ? JSON.stringify(payload) : null
      );
    });
    // Refresh store
    useNotificationStore.getState().fetchNotifications();
  } catch (error) {
    console.error('[NotificationStore] Failed to log notification:', error);
  }
};
