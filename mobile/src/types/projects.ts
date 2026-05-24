export interface SubTask {
  id: string | number;
  title: string;
  completed: boolean;
}

export interface ProjectTask {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string; // High, Medium, Low
  status: string;    // Pending, In Progress, Review, Completed
  progress: number;  // 0 to 100
  deadline: string | null;
  subtasks: SubTask[] | null;
  created_at: string;
  user_id: number;
}

export interface ProjectTaskCreate {
  title: string;
  description?: string | null;
  priority?: string;
  status?: string;
  progress?: number;
  deadline?: string | null;
  subtasks?: SubTask[];
}

export interface ProjectTaskUpdate {
  title?: string;
  description?: string | null;
  completed?: boolean;
  priority?: string;
  status?: string;
  progress?: number;
  deadline?: string | null;
  subtasks?: SubTask[];
}
