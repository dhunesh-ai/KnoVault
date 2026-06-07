export interface Project {
  id: number;
  title: string;
  description?: string | null;
  status: 'active' | 'completed' | 'on_hold' | 'archived';
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  progress: number; // 0 to 100
  color?: string | null;
  created_at: string;
  updated_at: string;
}
