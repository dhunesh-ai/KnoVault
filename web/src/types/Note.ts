export interface Category {
  name: string;
  count: number;
  is_custom: boolean;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  content_html?: string | null;
  category?: string | null;
  tags?: string[] | null;
  note_type: 'standard' | 'checklist' | 'field';
  is_secure: boolean;
  color?: string | null;
  checklist_items?: { id: number; text: string; completed: boolean; order: number }[] | null;
  field_notes?: { id: number; label: string; value: string; order: number }[] | null;
  is_pinned: boolean;
  is_completed: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}
