export interface Milestone {
  id?: string | number;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  priority?: string; 
  status?: string; 
  progress?: number; 
  deadline?: string | null;
  subtasks?: Milestone[];
  daily_target?: number;
  target_unit?: string;
  start_date?: string | null;
  reminder_time?: string | null;
  goal_date?: string;
  goal_type: "daily_goal" | "project";
  user_id?: number;
  created_at: string;
  updated_at?: string;
}
