import { create } from 'zustand';

interface GoalsState {
  targetDate: string | null;
  setTargetDate: (date: string | null) => void;
  resetFilters: () => void;
}

export const useGoalsStore = create<GoalsState>((set) => ({
  targetDate: null,
  setTargetDate: (date) => set({ targetDate: date }),
  resetFilters: () => set({ targetDate: null }),
}));
