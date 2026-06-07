import { create } from "zustand";
import { Reminder } from "@/types/Reminder";
import { remindersService } from "@/services/reminders";

interface RemindersState {
  reminders: Reminder[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchReminders: (params?: Record<string, unknown>) => Promise<void>;
  createReminder: (data: Partial<Reminder>) => Promise<Reminder>;
  updateReminder: (id: number, data: Partial<Reminder>) => Promise<Reminder>;
  deleteReminder: (id: number) => Promise<void>;
  markComplete: (id: number, is_completed: boolean) => Promise<void>;
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  reminders: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchReminders: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const reminders = await remindersService.getReminders(params);
      set({ reminders, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch reminders", isLoading: false });
    }
  },

  createReminder: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newReminder = await remindersService.createReminder(data);
      // We refetch to keep ordering consistent or just append if logic is simple
      // Since sorting is by date, appending locally and sorting is better, or just re-fetch
      const current = get().reminders;
      set({
        reminders: [...current, newReminder].sort((a, b) => new Date(a.reminder_date || '').getTime() - new Date(b.reminder_date || '').getTime()),
        isSaving: false,
      });
      return newReminder;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create reminder", isSaving: false });
      throw error;
    }
  },

  updateReminder: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedReminder = await remindersService.updateReminder(id, data);
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? updatedReminder : r)),
        isSaving: false,
      }));
      return updatedReminder;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update reminder", isSaving: false });
      throw error;
    }
  },

  deleteReminder: async (id) => {
    set({ error: null });
    try {
      await remindersService.deleteReminder(id);
      set((state) => ({
        reminders: state.reminders.filter((r) => r.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete reminder" });
      throw error;
    }
  },

  markComplete: async (id, is_completed) => {
    try {
      // Optimistic update
      set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === id ? { ...r, is_completed } : r
        ),
      }));
      await remindersService.updateReminder(id, { is_completed });
    } catch (error) {
      // Revert
      set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === id ? { ...r, is_completed: !is_completed } : r
        ),
      }));
      throw error;
    }
  },
}));
