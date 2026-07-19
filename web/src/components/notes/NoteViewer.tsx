import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Note } from "@/types/Note";
import { formatDistanceToNow, format } from "date-fns";
import { Trash2, Edit2, Star, Shield, CheckSquare, Square, ClipboardList, Copy } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useMemo } from "react";
import { toast } from "sonner";

interface NoteViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
}

export function NoteViewer({ open, onOpenChange, note, onEdit, onDelete }: NoteViewerProps) {
  const { updateNote, toggleFavorite } = useNotesStore();

  const isLocked = useMemo(() => {
    if (!note) return false;
    if (!note.is_secure) return false;
    if (note.note_type === "standard" || !note.note_type) {
      return typeof note.content === "string" && note.content.startsWith("gAAAAA");
    }
    if (note.note_type === "checklist") {
      return !note.checklist_items || note.checklist_items.length === 0;
    }
    if (note.note_type === "field") {
      return !note.field_notes || note.field_notes.length === 0;
    }
    return false;
  }, [note]);

  const handleCopy = async () => {
    if (!note) return;

    let textToCopy = `Title:\n${note.title}\n\nContent:\n`;

    if (note.note_type === "checklist" && note.checklist_items) {
      const itemsText = note.checklist_items
        .map(item => `${item.completed ? "[x]" : "[ ]"} ${item.text}`)
        .join("\n");
      textToCopy += itemsText || "No checklist items";
    } else if (note.note_type === "field" && note.field_notes) {
      const fieldsText = note.field_notes
        .map(field => `${field.label}: ${field.value}`)
        .join("\n");
      textToCopy += fieldsText || "No fields";
    } else {
      textToCopy += note.content || "No content";
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast.success("Note copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy note.");
    }
  };

  const { completedCount, totalCount, progress, sortedItems } = useMemo(() => {
    const items = note?.checklist_items || [];
    const compCount = items.filter(i => i.completed).length;
    const totCount = items.length;
    return {
      completedCount: compCount,
      totalCount: totCount,
      progress: totCount === 0 ? 0 : Math.round((compCount / totCount) * 100),
      sortedItems: [...items].sort((a, b) => a.order - b.order)
    };
  }, [note?.checklist_items]);

  if (!note) return null;

  const handleToggleChecklist = async (itemId: number, completed: boolean) => {
    if (!note.checklist_items) return;
    const newItems = note.checklist_items.map(i => i.id === itemId ? { ...i, completed } : i);
    await updateNote(note.id, { checklist_items: newItems });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border text-foreground p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 leading-tight">
                {note.is_secure && <Shield className="w-5 h-5 text-primary shrink-0" />}
                <span className="line-clamp-2">{note.title}</span>
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">Viewing note details</DialogDescription>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="px-2 py-0.5 rounded-md font-medium">
                {note.category || 'General'}
              </Badge>
              <div className="flex items-center gap-1.5">
                <span>{format(new Date(note.created_at), 'MMM d, yyyy')}</span>
                <span className="text-border">•</span>
                <span>Edited {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {note.note_type === 'standard' && (
            <div className="whitespace-pre-wrap break-words leading-relaxed text-sm">
              {note.content || <span className="text-muted-foreground italic">No content</span>}
            </div>
          )}

          {note.note_type === 'checklist' && (
            <div className="space-y-6">
              {/* Progress Card */}
              <div className="p-5 rounded-xl border border-border bg-gradient-to-br from-card to-card/50 shadow-sm space-y-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-foreground">Progress</span>
                  <span className="text-primary">{progress}% Complete</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-700 ease-out relative overflow-hidden" 
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>{completedCount} completed</span>
                  <span>{totalCount - completedCount} remaining</span>
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-2.5">
                {sortedItems.map((item) => (
                  <button
                    key={item.id || item.text} 
                    onClick={() => handleToggleChecklist(item.id, !item.completed)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 group text-left ${
                      item.completed 
                        ? 'border-transparent bg-accent/20 hover:bg-accent/40' 
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5 flex items-center justify-center transition-transform group-active:scale-90">
                      {item.completed ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <span className={`flex-1 text-sm leading-relaxed transition-all duration-200 ${
                      item.completed ? 'line-through text-muted-foreground/70' : 'text-foreground font-medium'
                    }`}>
                      {item.text}
                    </span>
                  </button>
                ))}
                
                {sortedItems.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl bg-card/30">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <span className="text-foreground font-medium">No tasks added yet</span>
                    <span className="text-xs text-muted-foreground mt-1">Edit the note to add checklist items.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {note.note_type === 'field' && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm text-left">
                <tbody>
                  {note.field_notes?.map((field, i) => (
                    <tr key={field.id || field.label} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-card/50' : 'bg-background'}`}>
                      <th className="px-4 py-3 font-medium text-muted-foreground w-1/3 border-r border-border align-top">
                        {field.label}
                      </th>
                      <td className="px-4 py-3 text-foreground whitespace-pre-wrap break-words">
                        {field.value}
                      </td>
                    </tr>
                  ))}
                  {(!note.field_notes || note.field_notes.length === 0) && (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground italic">
                        No fields added
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-card/95 backdrop-blur-md border-t border-border flex flex-row justify-between items-center w-full sticky bottom-0 z-10 rounded-b-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleFavorite(note.id, note.is_favorite)}
            className={`text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-500 transition-colors ${note.is_favorite ? "text-yellow-500 bg-yellow-500/10" : ""}`}
          >
            <Star className={`w-4 h-4 mr-2 transition-transform ${note.is_favorite ? "fill-yellow-500 scale-110" : "scale-100"}`} />
            {note.is_favorite ? "Favorited" : "Favorite"}
          </Button>
          
          <div className="flex items-center gap-2.5">
            {!isLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground hover:bg-accent border-border transition-colors"
                aria-label="Copy Note"
                title="Copy Note"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onDelete(note.id);
              }}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-border transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(note);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_rgba(124,77,255,0.3)] hover:shadow-[0_6px_20px_rgba(124,77,255,0.4)] transition-all"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Note
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
