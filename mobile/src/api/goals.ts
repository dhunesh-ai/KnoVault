import client from './client';
import type { Goal, GoalCreate, GoalUpdate, GoalStats } from '../types/goals';

export const goalsApi = {
  getGoals: async (params?: { target_date?: string }): Promise<Goal[]> => {
    const response = await client.get<Goal[]>('/api/goals', { params });
    return response.data;
  },

  getGoalStats: async (): Promise<GoalStats> => {
    const response = await client.get<GoalStats>('/api/goals/stats');
    return response.data;
  },

  createGoal: async (data: GoalCreate): Promise<Goal> => {
    const response = await client.post<Goal>('/api/goals', data);
    return response.data;
  },

  updateGoal: async (id: number, data: GoalUpdate): Promise<Goal> => {
    const response = await client.put<Goal>(`/api/goals/${id}`, data);
    return response.data;
  },

  deleteGoal: async (id: number): Promise<void> => {
    await client.delete(`/api/goals/${id}`);
  },
} as const;
