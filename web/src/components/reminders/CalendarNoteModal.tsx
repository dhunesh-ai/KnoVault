"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Pin, Clock, Trash2, Loader2, FileText } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarNote } from "@/types/CalendarNote";
import { useCalendarNotesStore } from "@/store/useCalendarNotesStore";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CalendarNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: CalendarNote | null;
  defaultDate?: Date;
}

const COLOR_OPTIONS = [
  { label: "Purple", value: "#6D4CFF" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#10B981" },
  { label: "Orange", value: "#F59E0B" },
  { label: "Red", value: "#EF4444" },
  { label: "Pink", value: "#EC4899" },
  { label: "Yellow", value: "#EAB308" },
];

export function CalendarNoteModal({ open, onOpenChange, note, defaultDate }: CalendarNoteModalProps) {
  const { createCalendarNote, updateCalendarNote, deleteCalendarNote, isSaving } = useCalendarNotesStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteDate, setNoteDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedColor, setSelectedColor] = useState("#6D4CFF");
  const [isPinned, setIsPinned] = useState(false);
  const [isAllDay, setIsAllDay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      if (note) {
        setTitle(note.title || "");
        setContent(note.content || "");
        setNoteDate(note.note_date ? format(new Date(note.note_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
        setSelectedColor(note.color || "#6D4CFF");
        setIsPinned(Boolean(note.is_pinned));
        setIsAllDay(note.is_all_day !== undefined ? Boolean(note.is_all_day) : true);
      } else {
        const initialDate = defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
        setTitle("");
        setContent("");
        setNoteDate(initialDate);
        setSelectedColor("#6D4CFF");
        setIsPinned(false);
        setIsAllDay(true);
      }
    }
  }, [open, note, defaultDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);

    try {
      if (note) {
        await updateCalendarNote(note.id, {
          title: title.trim(),
          content: content.trim() || null,
          note_date: noteDate,
          color: selectedColor,
          is_pinned: isPinned,
          is_all_day: isAllDay,
        });
        toast.success("Calendar Note updated");
      } else {
        await createCalendarNote({
          title: title.trim(),
          content: content.trim() || null,
          note_date: noteDate,
          color: selectedColor,
          is_pinned: isPinned,
          is_all_day: isAllDay,
        });
        toast.success("Calendar Note created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    }
  };

  const handleDelete = async () => {
    if (note) {
      try {
        await deleteCalendarNote(note.id);
        toast.success("Calendar Note deleted");
        setShowDeleteAlert(false);
        onOpenChange(false);
      } catch (err) {
        toast.error("Failed to delete note");
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/40 text-foreground max-w-lg rounded-3xl shadow-2xl p-0 overflow-hidden">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {note ? "Edit Calendar Note" : "New Calendar Note"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm font-medium">
                Attach notes directly to dates on your calendar.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Note Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setError(null);
                }}
                placeholder="e.g. Doctor's Prep Notes / Team Briefing"
                className="bg-muted/30 border-border/30 rounded-xl h-11 text-sm font-semibold"
              />
              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
            </div>

            {/* Description / Content */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description / Details
              </Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add extra details, checklist or meeting link..."
                className="bg-muted/30 border-border/30 rounded-xl text-sm min-h-[90px] resize-none"
              />
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Note Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-medium bg-muted/30 border-border/30 rounded-xl h-11 text-sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {noteDate ? format(new Date(noteDate), "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={noteDate ? new Date(noteDate) : undefined}
                    onSelect={(d) => d && setNoteDate(format(d, "yyyy-MM-dd"))}
                    className="bg-card text-foreground"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Note Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    className={cn(
                      "w-8 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center text-xs font-bold text-white",
                      selectedColor === c.value && "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* Controls: Pin & All Day */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                  isPinned
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    : "border-border/30 text-muted-foreground hover:border-border"
                )}
              >
                <Pin className="w-3.5 h-3.5" />
                {isPinned ? "Pinned Note" : "Pin Note"}
              </button>

              <button
                type="button"
                onClick={() => setIsAllDay(!isAllDay)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                  isAllDay
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border/30 text-muted-foreground hover:border-border"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                All Day
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              {note ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDeleteAlert(true)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/95 text-white rounded-xl px-5 text-xs font-bold shadow-[0_4px_16px_rgba(124,77,255,0.25)] flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSaving ? "Saving..." : note ? "Update Note" : "Save Note"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-2xl border-border/40 text-foreground rounded-3xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">
              Delete Calendar Note?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm font-medium">
              This action cannot be undone. This note will be permanently removed from your calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-muted/40 border-border/40 text-foreground hover:bg-muted/60 rounded-xl text-sm h-10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm h-10 font-bold shadow-md"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
