import api from "@/lib/axios";
import { Goal } from "@/types/Goal";

export const goalsService = {
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

  updateGoal: async (id: number, data: Partial<Goal>) => {
    if (data.goal_type === "daily_goal") {
      const response = await api.put<Goal>(`/api/goals/${id}`, data);
      return { ...response.data, goal_type: "daily_goal" as const };
    } else {
      const response = await api.put<Goal>(`/api/projects/${id}`, data);
      return { ...response.data, goal_type: "project" as const };
    }
  },

  deleteGoal: async (id: number, goal_type: "daily_goal" | "project") => {
    if (goal_type === "daily_goal") {
      await api.delete(`/api/goals/${id}`);
    } else {
      await api.delete(`/api/projects/${id}`);
    }
  },

  getGoalStats: async () => {
    const response = await api.get("/api/goals/stats");
    return response.data;
  }
};
