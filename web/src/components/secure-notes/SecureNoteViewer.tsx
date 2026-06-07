"use client";

import { useMemo } from "react";
import { Note } from "@/types/Note";
import { Button } from "@/components/ui/button";
import { Copy, Edit2, Trash2, Shield, AlertTriangle, CheckSquare, Square, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNotesStore } from "@/store/useNotesStore";

interface SecureNoteViewerProps {
  note: Note | null;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
}

export function SecureNoteViewer({ note, onEdit, onDelete }: SecureNoteViewerProps) {
  const { updateNote } = useNotesStore();

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

  const handleToggleChecklist = async (itemId: number, completed: boolean) => {
    if (!note || !note.checklist_items) return;
    const newItems = note.checklist_items.map(i => i.id === itemId ? { ...i, completed } : i);
    await updateNote(note.id, { checklist_items: newItems });
  };
  if (!note) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border border-border rounded-2xl bg-muted backdrop-blur-sm border-dashed">
        <Shield className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-xl font-medium text-foreground mb-2">Select a Secure Note</h3>
        <p className="text-center max-w-sm">
          Select a note from the list to view its decrypted contents securely.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    if (note.content) {
      navigator.clipboard.writeText(note.content);
      toast.success("Content copied to clipboard");
    }
  };

  return (
    <div className="h-full flex flex-col border border-red-500/20 rounded-2xl bg-background/80 backdrop-blur-xl overflow-hidden relative shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />
      
      {/* Viewer Header */}
      <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-red-500" />
            <h2 className="text-2xl font-bold text-foreground">{note.title}</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Last updated: {format(new Date(note.updated_at), 'PPp')}</span>
            <span className="flex items-center text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3 mr-1" /> End-to-End Encrypted
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleCopy} className="border-border text-foreground hover:bg-accent" title="Copy Content">
            <Copy className="w-4 h-4" />
          </Button>
          <div className="w-px h-8 bg-accent mx-2" />
          <Button variant="ghost" size="icon" onClick={() => onEdit(note)} className="text-muted-foreground hover:text-foreground" title="Edit">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10" title="Delete">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Viewer Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-none">
        {note.note_type === 'standard' && (
          <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-card prose-pre:border prose-pre:border-border max-w-none">
            {note.content ? (
              <div className="whitespace-pre-wrap text-foreground text-lg font-mono tracking-tight selection:bg-red-500/30">
                {note.content}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No content in this note.</p>
            )}
          </div>
        )}

        {note.note_type === 'checklist' && (
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="p-5 rounded-xl border border-border bg-gradient-to-br from-card to-card/50 shadow-sm space-y-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Progress</span>
                <span className="text-red-500">{progress}% Complete</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-700 ease-out relative overflow-hidden" 
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
                  onClick={() => handleToggleChecklist(item.id!, !item.completed)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 group text-left ${
                    item.completed 
                      ? 'border-transparent bg-accent/20 hover:bg-accent/40' 
                      : 'border-border bg-card hover:border-red-500/50 hover:shadow-sm'
                  }`}
                >
                  <div className="shrink-0 mt-0.5 flex items-center justify-center transition-transform group-active:scale-90">
                    {item.completed ? (
                      <CheckSquare className="w-5 h-5 text-red-500" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground group-hover:text-red-500 transition-colors" />
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
                    <td className="px-4 py-3 text-foreground whitespace-pre-wrap break-words font-mono tracking-tight selection:bg-red-500/30">
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
    </div>
  );
}
