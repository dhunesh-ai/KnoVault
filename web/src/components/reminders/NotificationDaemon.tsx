"use client";

import { useEffect, useRef } from "react";
import { useRemindersStore } from "@/store/useRemindersStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { notificationsService } from "@/services/notifications";
import { toast } from "sonner";
import { isPast, differenceInMinutes } from "date-fns";
import Cookies from "js-cookie";
import { getApiBaseUrl } from "@/lib/axios";

export function NotificationDaemon() {
  const { reminders, fetchReminders } = useRemindersStore();
  const { notificationsEnabled, setNotificationsEnabled } = useSettingsStore();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const initializedRef = useRef(false);
  const isWsConnectedRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);

  // 1. Initial Permission Request Banner/Toast on Mount
  useEffect(() => {
    if (typeof window === "undefined" || initializedRef.current) return;
    initializedRef.current = true;

    // Check if permission is default and notifications are not enabled yet
    if ("Notification" in window && Notification.permission === "default" && !notificationsEnabled) {
      // Show custom premium toast to prompt user
      toast("Enable KnoVault Notifications?", {
        description: "Get real-time browser alerts for upcoming reminders, meetings, and medicine schedules.",
        duration: 10000,
        action: {
          label: "Enable",
          onClick: async () => {
            const permission = await notificationsService.requestPermission();
            if (permission === "granted") {
              setNotificationsEnabled(true);
              toast.success("Notifications enabled successfully!");
            } else if (permission === "denied") {
              toast.error("Notification permissions blocked.");
            }
          },
        },
      });
    } else if ("Notification" in window && Notification.permission === "granted" && !notificationsEnabled) {
      // Keep state in sync if user already granted permission in browser settings
      setNotificationsEnabled(true);
    } else if ("Notification" in window && Notification.permission !== "granted" && notificationsEnabled) {
      // Keep state in sync if permission was revoked
      setNotificationsEnabled(false);
    }
  }, [notificationsEnabled, setNotificationsEnabled]);

  // 2. Background Scheduler (Runs every 30 seconds)
  useEffect(() => {
    if (!notificationsEnabled || !notificationsService.isGranted()) {
      return;
    }

    const checkReminders = () => {
      const now = new Date();

      reminders.forEach((reminder) => {
        if (reminder.is_completed) return;

        const reminderDate = new Date(reminder.reminder_date);
        
        // Only trigger for reminders occurring now or within the last 5 minutes
        const diffMin = differenceInMinutes(now, reminderDate);
        const isActive = isPast(reminderDate) && diffMin >= 0 && diffMin <= 5;

        if (isActive) {
          let title = reminder.title;
          let body = reminder.description || "You have a scheduled reminder.";

          // Parse structured details
          const descStr = (reminder.description || "").trim();
          if (descStr.startsWith("{")) {
            try {
              const parsed = JSON.parse(descStr);
              if (parsed.isMedicine) {
                const medName = parsed.medName || reminder.title;
                const dosage = parsed.dosage ? ` • ${parsed.dosage}` : "";
                const foodTiming = parsed.foodTiming ? ` • ${parsed.foodTiming}` : "";
                const timingLabel = parsed.timing ? ` [${parsed.timing.split(" ")[0]}]` : "";

                title = `💊 Take ${medName}${timingLabel}`;
                body = `Time to take your medication:${dosage}${foodTiming}. ${parsed.notes || ""}`;
              } else if (parsed.isCustom) {
                const customIcon = parsed.customIcon ? parsed.customIcon.split(" ")[0] : "🎯";
                const customName = parsed.customName || reminder.title;
                title = `${customIcon} ${customName}`;
                body = parsed.notes || "Custom reminder schedule alert.";
              }
            } catch (e) {
              // Graceful fallback to default title/body
            }
          }

          // Trigger browser notification
          const notificationKey = `${reminder.id}-${reminder.reminder_date}`;
          notificationsService.showNotification(notificationKey, title, {
            body,
            tag: notificationKey,
          });
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, [reminders, notificationsEnabled]);

  // 3. Background Polling Fallback (Runs every 20 seconds only when WebSocket is offline and user is authenticated)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const pollInterval = setInterval(() => {
      if (!isWsConnectedRef.current) {
        console.log("[WS Web Client] Polling fallback: WebSocket offline, fetching reminders...");
        fetchReminders();
      }
    }, 20000);

    return () => clearInterval(pollInterval);
  }, [fetchReminders, isAuthenticated, user]);

  // 4. Real-Time WebSocket Connection Lifecycle
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Do NOT connect if auth check is loading, user is not authenticated, or no user object exists
    if (isLoading || !isAuthenticated || !user) {
      if (socketRef.current) {
        console.log("[WS Web Client] User unauthenticated or logged out. Closing WS connection.");
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
        socketRef.current = null;
      }
      isWsConnectedRef.current = false;
      return;
    }

    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectDelay = 2000;
    const maxReconnectDelay = 30000;

    const connectWS = () => {
      const token = Cookies.get("user_token");
      if (!token) {
        console.log("[WS Web Client] No active user_token cookie found. Skipping WS connection.");
        isWsConnectedRef.current = false;
        return;
      }

      // Prevent duplicate connection attempts if already open or connecting
      if (socketRef.current && (socketRef.current.readyState === WebSocket.CONNECTING || socketRef.current.readyState === WebSocket.OPEN)) {
        return;
      }

      const baseUrl = getApiBaseUrl();
      const wsUrl = baseUrl.replace(/^http/, "ws") + `/api/sync/ws?token=${encodeURIComponent(token)}`;
      console.log(`[WS Web Client] Connecting to sync stream: ${wsUrl}`);

      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log(`[WS Web Client] Connection established for User #${user.id} (${user.email}).`);
          isWsConnectedRef.current = true;
          reconnectDelay = 2000;
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[WS Web Client] Sync message received:", data);
            if (data.event === "reminders_changed") {
              toast.info("Reminders updated on another device. Syncing...", { duration: 2000 });
              fetchReminders();
            }
          } catch (err) {
            console.warn("[WS Web Client] Error parsing sync event data:", err);
          }
        };

        socket.onclose = (event) => {
          isWsConnectedRef.current = false;
          socketRef.current = null;

          // If closed due to policy/authentication failure (1008 / 4001 / 1003), DO NOT reconnect
          if (event.code === 1008 || event.code === 4001 || event.code === 1003) {
            console.log(`[WS Web Client] Connection closed by server due to authentication policy violation (code: ${event.code}). Stopping reconnect attempts.`);
            return;
          }

          console.log(`[WS Web Client] Connection closed (code: ${event.code}). Scheduling reconnect...`);
          scheduleReconnect();
        };

        socket.onerror = (err) => {
          console.warn("[WS Web Client] WebSocket state notice/warning:", err);
          isWsConnectedRef.current = false;
        };
      } catch (err) {
        console.warn("[WS Web Client] Exception creating WebSocket instance:", err);
        isWsConnectedRef.current = false;
      }
    };

    const scheduleReconnect = () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        if (!isAuthenticated || !user) return;
        console.log(`[WS Web Client] Reconnecting attempt after ${reconnectDelay}ms...`);
        connectWS();
        reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
      }, reconnectDelay);
    };

    connectWS();

    const handleOnline = () => {
      console.log("[WS Web Client] Network online. Refreshing reminders and verifying WS...");
      fetchReminders();
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        connectWS();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
        socketRef.current = null;
      }
      isWsConnectedRef.current = false;
    };
  }, [fetchReminders, isAuthenticated, user, isLoading]);

  return null;
}
