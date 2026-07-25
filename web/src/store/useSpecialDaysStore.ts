import { create } from "zustand";
import { SpecialDay, ScheduledEmail } from "@/types/SpecialDay";
import { specialDaysService } from "@/services/special-days";

interface SpecialDaysState {
  specialDays: SpecialDay[];
  scheduledEmails: ScheduledEmail[];
  isLoading: boolean;
  isLoadingScheduledEmails: boolean;
  isSaving: boolean;
  error: string | null;
  fetchSpecialDays: (params?: Record<string, unknown>) => Promise<void>;
  createSpecialDay: (data: Partial<SpecialDay> & { schedule_for_tomorrow?: boolean }) => Promise<SpecialDay>;
  updateSpecialDay: (id: number, data: Partial<SpecialDay> & { schedule_for_tomorrow?: boolean }) => Promise<SpecialDay>;
  deleteSpecialDay: (id: number) => Promise<void>;
  fetchScheduledEmails: () => Promise<void>;
  deleteScheduledEmail: (id: number) => Promise<void>;
}

export const useSpecialDaysStore = create<SpecialDaysState>((set, get) => ({
  specialDays: [],
  scheduledEmails: [],
  isLoading: false,
  isLoadingScheduledEmails: false,
  isSaving: false,
  error: null,

  fetchSpecialDays: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const specialDays = await specialDaysService.getSpecialDays(params);
      set({ specialDays, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch special days", isLoading: false });
    }
  },

  createSpecialDay: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newSpecialDay = await specialDaysService.createSpecialDay(data);
      const current = get().specialDays;
      set({
        specialDays: [...current, newSpecialDay].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        isSaving: false,
      });
      return newSpecialDay;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create special day", isSaving: false });
      throw error;
    }
  },

  updateSpecialDay: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedSpecialDay = await specialDaysService.updateSpecialDay(id, data);
      set((state) => ({
        specialDays: state.specialDays.map((sd) => (sd.id === id ? updatedSpecialDay : sd)),
        isSaving: false,
      }));
      return updatedSpecialDay;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update special day", isSaving: false });
      throw error;
    }
  },

  deleteSpecialDay: async (id) => {
    set({ error: null });
    try {
      await specialDaysService.deleteSpecialDay(id);
      set((state) => ({
        specialDays: state.specialDays.filter((sd) => sd.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete special day" });
      throw error;
    }
  },

  fetchScheduledEmails: async () => {
    set({ isLoadingScheduledEmails: true });
    try {
      const scheduledEmails = await specialDaysService.getScheduledEmails();
      set({ scheduledEmails, isLoadingScheduledEmails: false });
    } catch (error) {
      set({ isLoadingScheduledEmails: false });
    }
  },

  deleteScheduledEmail: async (id) => {
    try {
      await specialDaysService.deleteScheduledEmail(id);
      set((state) => ({
        scheduledEmails: state.scheduledEmails.filter((se) => se.id !== id),
      }));
    } catch (error) {
      throw error;
    }
  },
}));
