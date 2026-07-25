import api from "@/lib/axios";
import { Goal } from "@/types/Goal";
import { Project } from "@/types/Project";

export interface GoalStats {
  today_total: number;
  today_completed: number;
  today_percentage: number;
  all_total: number;
  all_completed: number;
  success_rate: number;
  streak: number;
}

export const goalsService = {
  getDailyGoals: async (): Promise<Goal[]> => {
    const res = await api.get<Goal[]>("/api/goals");
    return res.data.map(d => ({ ...d, goal_type: "daily_goal" as const }));
  },

  getProjects: async (): Promise<Project[]> => {
    const res = await api.get<Project[]>("/api/projects");
    return res.data.map(p => ({ ...p, goal_type: p.goal_type || "project" }));
  },

  getGoals: async () => {
    const [projectsRes, dailyGoalsRes] = await Promise.all([
      api.get<Goal[]>("/api/projects"),
      api.get<Goal[]>("/api/goals")
    ]);
    const projects = projectsRes.data.map(p => ({ ...p, goal_type: "project" as const }));
    const dailyGoals = dailyGoalsRes.data.map(d => ({ ...d, goal_type: "daily_goal" as const }));
    return [...projects, ...dailyGoals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  createGoal: async (data: Partial<Goal>) => {
    if (data.goal_type === "daily_goal") {
      const response = await api.post<Goal>("/api/goals", data);
      return { ...response.data, goal_type: "daily_goal" as const };
    } else {
      const response = await api.post<Goal>("/api/projects", data);
      return { ...response.data, goal_type: "project" as const };
    }
  },

  createProject: async (data: Partial<Project>) => {
    const response = await api.post<Project>("/api/projects", data);
    return { ...response.data, goal_type: "project" as const };
  },

  updateGoal: async (id: number, data: Partial<Goal>) => {
    if (data.goal_type === "daily_goal") {
      const response = await api.put<Goal>(`/api/goals/${id}`, data);
      return { ...response.data, goal_type: "daily_goal" as const };
    } else {
      const response = await api.put<Goal>(`/api/projects/${id}`, data);
      return { ...response.data, goal_type: "project" as const };
    }
  },

  updateProject: async (id: number, data: Partial<Project>) => {
    const response = await api.put<Project>(`/api/projects/${id}`, data);
    return { ...response.data, goal_type: "project" as const };
  },

  deleteGoal: async (id: number, goal_type: "daily_goal" | "project") => {
    if (goal_type === "daily_goal") {
      await api.delete(`/api/goals/${id}`);
    } else {
      await api.delete(`/api/projects/${id}`);
    }
  },

  deleteProject: async (id: number) => {
    await api.delete(`/api/projects/${id}`);
  },

  getGoalStats: async (): Promise<GoalStats> => {
    const response = await api.get<GoalStats>("/api/goals/stats");
    return response.data;
  }
};
