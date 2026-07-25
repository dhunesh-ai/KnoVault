import { create } from "zustand";
import { Goal } from "@/types/Goal";
import { Project } from "@/types/Project";
import { goalsService, GoalStats } from "@/services/goals";

interface GoalsState {
  // Data
  dailyGoals: Goal[];
  projects: Project[];
  goals: Goal[]; // Combined for backward compatibility
  stats: GoalStats | null;
  
  // UI State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Actions
  fetchGoals: () => Promise<void>;
  fetchDailyGoals: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchStats: () => Promise<void>;
  
  createGoal: (data: Partial<Goal>) => Promise<Goal>;
  quickCreateDailyGoal: (title: string) => Promise<void>;
  updateGoal: (id: number, data: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (id: number, goal_type: "daily_goal" | "project") => Promise<void>;
  toggleDailyGoal: (id: number, completed: boolean) => Promise<void>;
  
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: number, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  dailyGoals: [],
  projects: [],
  goals: [],
  stats: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchGoals: async () => {
    set({ isLoading: true, error: null });
    try {
      const [dailyGoals, projects, stats] = await Promise.all([
        goalsService.getDailyGoals(),
        goalsService.getProjects(),
        goalsService.getGoalStats().catch(() => null)
      ]);
      const allGoals = [...projects.map(p => ({ ...p, goal_type: "project" as const })), ...dailyGoals]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      set({ dailyGoals, projects, goals: allGoals, stats, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch goals", isLoading: false });
    }
  },

  fetchDailyGoals: async () => {
    try {
      const dailyGoals = await goalsService.getDailyGoals();
      set((state) => {
        const allGoals = [...state.projects.map(p => ({ ...p, goal_type: "project" as const })), ...dailyGoals]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { dailyGoals, goals: allGoals };
      });
    } catch (error) {
      // Silent refresh
    }
  },

  fetchProjects: async () => {
    try {
      const projects = await goalsService.getProjects();
      set((state) => {
        const allGoals = [...projects.map(p => ({ ...p, goal_type: "project" as const })), ...state.dailyGoals]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { projects, goals: allGoals };
      });
    } catch (error) {
      // Silent refresh
    }
  },

  fetchStats: async () => {
    try {
      const stats = await goalsService.getGoalStats();
      set({ stats });
    } catch (error) {
      // Silent
    }
  },

  createGoal: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newGoal = await goalsService.createGoal(data);
      set((state) => {
        const newDaily = data.goal_type === "daily_goal" ? [newGoal, ...state.dailyGoals] : state.dailyGoals;
        const newGoals = [newGoal, ...state.goals];
        const currentStats = state.stats;
        const updatedStats = currentStats ? {
          ...currentStats,
          today_total: currentStats.today_total + 1,
          all_total: currentStats.all_total + 1,
          today_percentage: (currentStats.today_total + 1) > 0
            ? Math.round((currentStats.today_completed / (currentStats.today_total + 1)) * 100)
            : 0
        } : null;

        return {
          dailyGoals: newDaily,
          goals: newGoals,
          stats: updatedStats,
          isSaving: false,
        };
      });
      // Refresh stats from backend
      get().fetchStats();
      return newGoal;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create goal", isSaving: false });
      throw error;
    }
  },

  quickCreateDailyGoal: async (title: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tempGoal: Goal = {
      id: Date.now(),
      title,
      completed: false,
      goal_type: "daily_goal",
      goal_date: todayStr,
      start_date: todayStr,
      reminder_time: "09:00",
      daily_target: 1,
      target_unit: "times",
      priority: "Medium",
      difficulty: "medium",
      color: "#6D4CFF",
      icon: "🎯",
      created_at: new Date().toISOString(),
    };
    
    set((state) => ({
      dailyGoals: [tempGoal, ...state.dailyGoals],
      goals: [tempGoal, ...state.goals],
    }));

    try {
      await goalsService.createGoal({
        title,
        goal_type: "daily_goal",
        start_date: todayStr,
        reminder_time: "09:00",
        daily_target: 1,
        target_unit: "times",
        priority: "Medium",
        difficulty: "medium",
        color: "#6D4CFF",
        icon: "🎯",
      });
      await Promise.all([get().fetchDailyGoals(), get().fetchStats()]);
    } catch (error) {
      // Rollback
      set((state) => ({
        dailyGoals: state.dailyGoals.filter(g => g.id !== tempGoal.id),
        goals: state.goals.filter(g => g.id !== tempGoal.id),
      }));
      throw error;
    }
  },

  toggleDailyGoal: async (id: number, completed: boolean) => {
    // Optimistic update
    set((state) => ({
      dailyGoals: state.dailyGoals.map(g => g.id === id ? { ...g, completed } : g),
      goals: state.goals.map(g => g.id === id && g.goal_type === "daily_goal" ? { ...g, completed } : g),
      stats: state.stats ? {
        ...state.stats,
        today_completed: state.stats.today_completed + (completed ? 1 : -1),
        today_percentage: state.stats.today_total > 0
          ? Math.round(((state.stats.today_completed + (completed ? 1 : -1)) / state.stats.today_total) * 100)
          : 0,
      } : null,
    }));

    try {
      await goalsService.updateGoal(id, { goal_type: "daily_goal", completed });
      get().fetchStats();
    } catch (error) {
      // Rollback
      set((state) => ({
        dailyGoals: state.dailyGoals.map(g => g.id === id ? { ...g, completed: !completed } : g),
        goals: state.goals.map(g => g.id === id && g.goal_type === "daily_goal" ? { ...g, completed: !completed } : g),
      }));
    }
  },

  updateGoal: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedGoal = await goalsService.updateGoal(id, data);
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id && g.goal_type === data.goal_type ? updatedGoal : g)),
        dailyGoals: data.goal_type === "daily_goal" 
          ? state.dailyGoals.map(g => g.id === id ? updatedGoal : g)
          : state.dailyGoals,
        isSaving: false,
      }));
      get().fetchStats();
      return updatedGoal;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update goal", isSaving: false });
      throw error;
    }
  },

  deleteGoal: async (id, goal_type) => {
    set({ error: null });
    // Optimistic delete
    const prevState = { dailyGoals: get().dailyGoals, projects: get().projects, goals: get().goals };
    set((state) => ({
      goals: state.goals.filter((g) => !(g.id === id && g.goal_type === goal_type)),
      dailyGoals: goal_type === "daily_goal" ? state.dailyGoals.filter(g => g.id !== id) : state.dailyGoals,
      projects: goal_type === "project" ? state.projects.filter(p => p.id !== id) : state.projects,
    }));
    try {
      await goalsService.deleteGoal(id, goal_type);
      get().fetchStats();
    } catch (error) {
      set(prevState);
      set({ error: error instanceof Error ? error.message : "Failed to delete goal" });
      throw error;
    }
  },

  createProject: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newProject = await goalsService.createProject(data);
      set((state) => ({
        projects: [newProject, ...state.projects],
        goals: [{ ...newProject, goal_type: "project" as const } as unknown as Goal, ...state.goals],
        isSaving: false,
      }));
      return newProject;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to create project", isSaving: false });
      throw error;
    }
  },

  updateProject: async (id, data) => {
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? { ...p, ...data } : p),
      goals: state.goals.map(g => g.id === id && g.goal_type === "project" ? { ...g, ...data } as unknown as Goal : g),
    }));
    try {
      const updated = await goalsService.updateProject(id, data);
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? updated : p),
        goals: state.goals.map(g => g.id === id && g.goal_type === "project" ? { ...updated, goal_type: "project" as const } as unknown as Goal : g),
      }));
    } catch (error) {
      get().fetchProjects();
      throw error;
    }
  },

  deleteProject: async (id) => {
    const prev = { projects: get().projects, goals: get().goals };
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id),
      goals: state.goals.filter(g => !(g.id === id && g.goal_type === "project")),
    }));
    try {
      await goalsService.deleteProject(id);
    } catch (error) {
      set(prev);
      throw error;
    }
  },
}));
