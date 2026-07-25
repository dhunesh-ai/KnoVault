import { Milestone } from "./Goal";

export interface Project {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  status: string;
  priority: string;
  progress: number; // 0 to 100
  deadline?: string | null;
  subtasks?: Milestone[] | null;
  goal_type: string;
  color?: string | null;
  user_id?: number;
  created_at: string;
  updated_at?: string;
}
