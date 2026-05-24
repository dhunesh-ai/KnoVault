import client from './client';
import type { ProjectTask, ProjectTaskCreate, ProjectTaskUpdate } from '../types/projects';

export const projectsApi = {
  getProjects: async (params?: { completed?: boolean }): Promise<ProjectTask[]> => {
    const response = await client.get<ProjectTask[]>('/api/projects', { params });
    return response.data;
  },

  createProject: async (data: ProjectTaskCreate): Promise<ProjectTask> => {
    const response = await client.post<ProjectTask>('/api/projects', data);
    return response.data;
  },

  updateProject: async (id: number, data: ProjectTaskUpdate): Promise<ProjectTask> => {
    const response = await client.put<ProjectTask>(`/api/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id: number): Promise<void> => {
    await client.delete(`/api/projects/${id}`);
  },
} as const;
