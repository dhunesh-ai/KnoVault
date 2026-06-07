import { create } from "zustand";
import { Reminder } from "@/types/Reminder";
import { MedicineCourse, MedicinePayload } from "@/types/Medicine";
import { medicineService } from "@/services/medicine";

interface MedicineState {
  reminders: Reminder[];
  courses: MedicineCourse[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchMedicines: () => Promise<void>;
  createMedicine: (data: Record<string, unknown>) => Promise<void>;
  deleteMedicineSeries: (seriesId: string) => Promise<void>;
  markDoseComplete: (id: number, is_completed: boolean) => Promise<void>;
}

export const useMedicineStore = create<MedicineState>((set, get) => ({
  reminders: [],
  courses: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchMedicines: async () => {
    set({ isLoading: true, error: null });
    try {
      const reminders = await medicineService.getMedicineReminders();
      
      // Parse into courses
      const courseMap = new Map<string, MedicineCourse>();
      const now = new Date().getTime();

      reminders.forEach(r => {
        if (!r.description) return;
        try {
          const payload: MedicinePayload = JSON.parse(r.description);
          const seriesId = payload.series_id || r.series_id;
          
          if (!seriesId) return;

          if (!courseMap.has(seriesId)) {
            courseMap.set(seriesId, {
              series_id: seriesId,
              medName: payload.medName,
              medType: payload.medType,
              dosage: payload.dosage,
              foodTiming: payload.foodTiming,
              frequency: payload.frequency,
              timings: payload.timings || [],
              durationDays: payload.total_days || 5,
              startDate: r.reminder_date,
              endDate: r.reminder_date, // Will expand
              notes: payload.notes,
              totalDoses: 0,
              completedDoses: 0,
              nextDose: undefined,
              remainingDays: 0,
              remainingDosesToday: 0
            });
          }

          const course = courseMap.get(seriesId)!;
          course.totalDoses += 1;
          if (r.is_completed) course.completedDoses += 1;
          
          // Track end date
          if (new Date(r.reminder_date) > new Date(course.endDate)) {
            course.endDate = r.reminder_date;
          }

          // Track start date
          if (new Date(r.reminder_date) < new Date(course.startDate)) {
            course.startDate = r.reminder_date;
          }

          // Track next upcoming dose
          if (!r.is_completed && new Date(r.reminder_date).getTime() > now - 86400000) { // Future or today
            if (!course.nextDose || new Date(r.reminder_date) < new Date(course.nextDose.date)) {
              course.nextDose = {
                id: r.id,
                timing: payload.timing || "Dose",
                date: r.reminder_date
              };
            }
          }
          
          // Track remaining doses today
          const rDate = new Date(r.reminder_date);
          const today = new Date();
          if (
            !r.is_completed &&
            rDate.getDate() === today.getDate() &&
            rDate.getMonth() === today.getMonth() &&
            rDate.getFullYear() === today.getFullYear()
          ) {
            course.remainingDosesToday += 1;
          }
        } catch (e) {
          // ignore parsing error
        }
      });

      // Calculate remaining days for all courses
      const coursesArray = Array.from(courseMap.values()).map(course => {
        const end = new Date(course.endDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        course.remainingDays = diffDays > 0 ? diffDays : 0;
        return course;
      });

      set({ 
        reminders, 
        courses: coursesArray,
        isLoading: false 
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch medicines", isLoading: false });
    }
  },

  createMedicine: async (data) => {
    set({ isSaving: true, error: null });
    try {
      await medicineService.createMedicine(data);
      await get().fetchMedicines(); // Refresh all to get generated series
      set({ isSaving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create medicine", isSaving: false });
      throw error;
    }
  },

  deleteMedicineSeries: async (seriesId) => {
    set({ error: null });
    try {
      await medicineService.deleteMedicineSeries(seriesId);
      set((state) => ({
        courses: state.courses.filter(c => c.series_id !== seriesId),
        reminders: state.reminders.filter(r => {
          if (r.series_id === seriesId) return false;
          if (r.description && r.description.includes(seriesId)) return false;
          return true;
        })
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete medicine" });
      throw error;
    }
  },

  markDoseComplete: async (id, is_completed) => {
    try {
      // Optimistic update
      set((state) => ({
        reminders: state.reminders.map(r => r.id === id ? { ...r, is_completed } : r)
      }));
      // We don't fully rebuild courses here for perf, just fire API. 
      // User can rely on reminders array for "Today's doses" view.
      await medicineService.markComplete(id, is_completed);
    } catch (error) {
      // Revert
      set((state) => ({
        reminders: state.reminders.map(r => r.id === id ? { ...r, is_completed: !is_completed } : r)
      }));
      throw error;
    }
  },
}));
