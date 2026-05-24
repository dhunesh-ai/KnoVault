export interface Goal {
  id: number;
  title: string;
  completed: boolean;
  goal_date: string;
  created_at: string;
  user_id: number;
}

export interface GoalCreate {
  title: string;
  goal_date?: string;
}

export interface GoalUpdate {
  title?: string;
  completed?: boolean;
  goal_date?: string;
}

export interface GoalStats {
  today_total: number;
  today_completed: number;
  today_percentage: number;
  all_total: number;
  all_completed: number;
  success_rate: number;
  streak?: number;
}
