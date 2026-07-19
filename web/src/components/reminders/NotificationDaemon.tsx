"use client";

import { useEffect, useRef } from "react";
import { useRemindersStore } from "@/store/useRemindersStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { notificationsService } from "@/services/notifications";
import { toast } from "sonner";
import { format, isPast, differenceInMinutes } from "date-fns";
import Cookies from "js-cookie";
import { API_BASE_URL } from "@/lib/axios";

export function NotificationDaemon() {
  const { reminders, fetchReminders } = useRemindersStore();
  const { notificationsEnabled, setNotificationsEnabled } = useSettingsStore();
  const initializedRef = useRef(false);

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
          // Use unique key combination of reminder.id + reminder_date to support recurrences/series uniquely
          const notificationKey = `${reminder.id}-${reminder.reminder_date}`;
          notificationsService.showNotification(notificationKey, title, {
            body,
            tag: notificationKey,
          });
        }
      });
    };

    // Run check immediately, then schedule interval
    checkReminders();
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, [reminders, notificationsEnabled]);

  // 3. WebSocket Real-Time Synchronization
  const isWsConnectedRef = useRef(false);

  // Background Polling Fallback (Runs every 20 seconds only when WebSocket is offline)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (!isWsConnectedRef.current) {
        console.log("[WS Web Client] Polling fallback: WebSocket offline, fetching reminders...");
        fetchReminders();
      }
    }, 20000);

    return () => clearInterval(pollInterval);
  }, [fetchReminders]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectDelay = 2000;
    const maxReconnectDelay = 30000;

    const connectWS = () => {
      const token = Cookies.get("user_token");
      if (!token) {
        console.warn("[WS Web Client] No user_token cookie found. Skipping WS connection.");
        isWsConnectedRef.current = false;
        return;
      }

      const wsUrl = API_BASE_URL.replace(/^http/, "ws") + `/api/sync/ws?token=${encodeURIComponent(token)}`;
      console.log("[WS Web Client] Connecting to sync stream...");

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("[WS Web Client] Connection established.");
        isWsConnectedRef.current = true;
        reconnectDelay = 2000;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[WS Web Client] Message received:", data);
          if (data.event === "reminders_changed") {
            toast.info("Reminders updated on another device. Syncing...", {
              duration: 2000
            });
            fetchReminders();
          }
        } catch (err) {
          console.error("[WS Web Client] Error parsing event data:", err);
        }
      };

      socket.onclose = (event) => {
        console.log(`[WS Web Client] Connection closed (code: ${event.code}). Reconnecting...`);
        isWsConnectedRef.current = false;
        scheduleReconnect();
      };

      socket.onerror = (err) => {
        console.error("[WS Web Client] Error detected:", err);
        isWsConnectedRef.current = false;
      };
    };

    const scheduleReconnect = () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        console.log(`[WS Web Client] Reconnecting attempt after ${reconnectDelay}ms...`);
        connectWS();
        reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
      }, reconnectDelay);
    };

    connectWS();

    const handleOnline = () => {
      console.log("[WS Web Client] Browser is back online. Syncing reminders & reconnecting WS...");
      fetchReminders();
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        connectWS();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchReminders]);

  return null;
}
