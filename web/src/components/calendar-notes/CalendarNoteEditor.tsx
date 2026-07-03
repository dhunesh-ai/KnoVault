"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarNote } from "@/types/CalendarNote";
import { useCalendarNotesStore } from "@/store/useCalendarNotesStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const calendarNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  content: z.string().optional().nullable(),
  note_date: z.string().min(1, "Date is required"), 
});

type CalendarNoteFormValues = z.infer<typeof calendarNoteSchema>;

interface CalendarNoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: CalendarNote | null;
  initialDate?: string; // YYYY-MM-DD
}

export function CalendarNoteEditor({ open, onOpenChange, note, initialDate }: CalendarNoteEditorProps) {
  const { createCalendarNote, updateCalendarNote } = useCalendarNotesStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<CalendarNoteFormValues> = {
    title: "",
    content: "",
    note_date: initialDate || format(new Date(), "yyyy-MM-dd"), 
  };

  const form = useForm<CalendarNoteFormValues>({
    resolver: zodResolver(calendarNoteSchema),
    defaultValues,
  });

  useEffect(() => {
    if (note) {
      form.reset({
        title: note.title,
        content: note.content || "",
        note_date: note.note_date,
      });
    } else {
      form.reset({
        ...defaultValues,
        note_date: initialDate || format(new Date(), "yyyy-MM-dd"),
      });
    }
  }, [note, open, initialDate, form]);

  const onSubmit = async (data: CalendarNoteFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title,
        content: data.content || null,
        note_date: data.note_date,
      };

      if (note) {
        await updateCalendarNote(note.id, payload);
        toast.success("Calendar note updated successfully");
      } else {
        await createCalendarNote(payload);
        toast.success("Calendar note created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save calendar note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border text-foreground p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{note ? "Edit Calendar Note" : "Create Calendar Note"}</DialogTitle>
          <DialogDescription className="sr-only">
            {note ? "Edit your calendar note details below" : "Fill out the details to attach a note to a calendar date"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 pt-2 space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="e.g. Submit DAA assignment report"
              className="bg-card border-border"
            />
            {form.formState.errors.title && (
              <p className="text-red-400 text-sm">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note_date">Date</Label>
            <Input
              id="note_date"
              type="date"
              {...form.register("note_date")}
              className="bg-card border-border"
            />
            {form.formState.errors.note_date && (
              <p className="text-red-400 text-sm">{form.formState.errors.note_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              {...form.register("content")}
              placeholder="Add details or notes here..."
              className="bg-card border-border min-h-[100px]"
            />
            {form.formState.errors.content && (
              <p className="text-red-400 text-sm">{form.formState.errors.content.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border hover:bg-accent text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {note ? "Save Changes" : "Create Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
