import { create } from "zustand";
import { Goal } from "@/types/Goal";
import { goalsService } from "@/services/goals";

interface GoalsState {
  goals: Goal[];
  stats: Record<string, unknown> | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  createGoal: (data: Partial<Goal>) => Promise<Goal>;
  updateGoal: (id: number, data: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (id: number, goal_type: "daily_goal" | "project") => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  stats: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchGoals: async () => {
    set({ isLoading: true, error: null });
    try {
      const [goals, stats] = await Promise.all([
        goalsService.getGoals(),
        goalsService.getGoalStats().catch(() => null)
      ]);
      set({ goals, stats, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch goals", isLoading: false });
    }
  },

  createGoal: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newGoal = await goalsService.createGoal(data);
      set((state) => ({
        goals: [newGoal, ...state.goals],
        isSaving: false,
      }));
      return newGoal;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create goal", isSaving: false });
      throw error;
    }
  },

  updateGoal: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedGoal = await goalsService.updateGoal(id, data);
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? updatedGoal : g)),
        isSaving: false,
      }));
      return updatedGoal;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update goal", isSaving: false });
      throw error;
    }
  },

  deleteGoal: async (id, goal_type) => {
    set({ error: null });
    try {
      await goalsService.deleteGoal(id, goal_type);
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== id || g.goal_type !== goal_type),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete goal" });
      throw error;
    }
  },
}));
