/**
 * KnoVault Browser Notification Service
 */

// Local storage key for notified reminders to prevent duplicate notifications
const NOTIFIED_CACHE_KEY = "knovault_notified_reminder_ids";

function getNotifiedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const cached = localStorage.getItem(NOTIFIED_CACHE_KEY);
    return cached ? new Set(JSON.parse(cached)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveNotifiedId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = getNotifiedIds();
    ids.add(id);
    localStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error("Failed to cache notified reminder ID", e);
  }
}

export const notificationsService = {
  /**
   * Request browser notification permission.
   */
  requestPermission: async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "default";
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.error("Error requesting notification permission", e);
      return "default";
    }
  },

  /**
   * Check if notification permission is granted.
   */
  isGranted: (): boolean => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    return Notification.permission === "granted";
  },

  /**
   * Check if notification permission is blocked/denied.
   */
  isDenied: (): boolean => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    return Notification.permission === "denied";
  },

  /**
   * Show a browser notification.
   */
  showNotification: (
    id: string,
    title: string,
    options?: NotificationOptions
  ): boolean => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    if (Notification.permission !== "granted") {
      return false;
    }

    // Check if already notified
    const notifiedIds = getNotifiedIds();
    if (notifiedIds.has(id)) {
      return false;
    }

    try {
      // Trigger browser notification
      const notification = new Notification(title, {
        icon: "/icon.png",
        badge: "/apple-icon.png",
        silent: false,
        requireInteraction: true,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Cache ID to prevent duplicate trigger
      saveNotifiedId(id);
      return true;
    } catch (e) {
      console.error("Failed to show browser notification", e);
      return false;
    }
  },

  /**
   * Reset notification cache (useful for testing or clearing store).
   */
  clearNotifiedCache: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(NOTIFIED_CACHE_KEY);
  }
};
