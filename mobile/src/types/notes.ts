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

export interface NoteCreate {
  title: string;
  content: string;
  content_html?: string | null;
  category?: string | null;
  tags?: string[] | null;
  note_type?: 'standard' | 'checklist' | 'field';
  is_secure?: boolean;
  color?: string | null;
  checklist_items?: { text: string; completed: boolean; order?: number }[] | null;
  field_notes?: { label: string; value: string; order?: number }[] | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
}

export interface NoteUpdate {
  title?: string | null;
  content?: string | null;
  content_html?: string | null;
  category?: string | null;
  tags?: string[] | null;
  note_type?: 'standard' | 'checklist' | 'field' | null;
  is_secure?: boolean | null;
  color?: string | null;
  checklist_items?: { text: string; completed: boolean; order?: number }[] | null;
  field_notes?: { label: string; value: string; order?: number }[] | null;
  is_pinned?: boolean | null;
  is_completed?: boolean | null;
  is_favorite?: boolean | null;
}
