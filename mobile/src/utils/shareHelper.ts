import { Note } from '../types/notes';

/**
 * Formats a note based on its type into a clean, readable text format for native sharing or clipboard copying.
 */
export function buildShareableNote(note: Partial<Note>): string {
  const title = note.title?.trim() || 'Untitled Note';
  const category = note.category || 'General';
  const type = note.note_type || 'standard';

  let body = '';

  if (type === 'standard') {
    body = `📄 ${title}\n\nCategory: ${category}\n\n${note.content || ''}`;
  } else if (type === 'checklist') {
    const checklistItems = (note as any).checklist_items || [];
    const itemsText = checklistItems
      .map((item: any) => `${item.completed ? '☑' : '☐'} ${item.text || ''}`)
      .join('\n') || '';
    body = `📝 ${title}\n\n${itemsText}`;
  } else if (type === 'field') {
    const fieldNotes = (note as any).field_notes || [];
    const fieldsText = fieldNotes
      .map((field: any) => {
        const label = field.label || 'Field';
        let val = field.value || '';
        
        // Ensure URLs start with a valid protocol to remain clickable in plain text
        if (
          val.trim() &&
          !/^https?:\/\//i.test(val) &&
          (val.includes('www.') || val.includes('.com') || val.includes('.org') || val.includes('.net'))
        ) {
          val = `https://${val.trim()}`;
        }
        
        return `${label}:\n${val}`;
      })
      .join('\n\n') || '';
    body = `📂 ${title}\n\n${fieldsText}`;
  }

  return `${body.trim()}\n\nCreated with KnoVault`;
}
