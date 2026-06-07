"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Reminder } from "@/types/Reminder";
import { useRemindersStore } from "@/store/useRemindersStore";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateTimePicker } from "./DateTimePicker";

const reminderSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().optional().nullable(),
  type: z.enum(["meeting", "assignment", "event", "birthday", "medicine", "custom"]),
  custom_type: z.string().optional().nullable(),
  reminder_date: z.string().min(1, "Date and time is required"), 
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

interface ReminderEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: Reminder | null;
}

export function ReminderEditor({ open, onOpenChange, reminder }: ReminderEditorProps) {
  const { createReminder, updateReminder } = useRemindersStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<ReminderFormValues> = {
    title: "",
    description: "",
    type: "event",
    custom_type: "",
    // Default to current time formatted for datetime-local input
    reminder_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), 
  };

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues,
  });

  const watchType = form.watch("type");

  useEffect(() => {
    if (reminder) {
      // Format the ISO string to work with datetime-local input
      let dateFormatted = "";
      if (reminder.reminder_date) {
        try {
          const d = new Date(reminder.reminder_date);
          // Need local format: yyyy-MM-ddThh:mm
          const offset = d.getTimezoneOffset();
          const local = new Date(d.getTime() - (offset * 60 * 1000));
          dateFormatted = local.toISOString().slice(0, 16);
        } catch (e) {
          dateFormatted = "";
        }
      }

      form.reset({
        title: reminder.title,
        description: reminder.description || "",
        type: (reminder.type as ReminderFormValues["type"]) || "event",
        custom_type: reminder.custom_type || "",
        reminder_date: dateFormatted,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [reminder, open, form]);

  const onSubmit = async (data: ReminderFormValues) => {
    setIsSubmitting(true);
    try {
      // Convert local datetime back to ISO UTC string
      const d = new Date(data.reminder_date);
      const payload = {
        ...data,
        reminder_date: d.toISOString(),
      };

      if (reminder) {
        await updateReminder(reminder.id, payload);
        toast.success("Reminder updated successfully");
      } else {
        await createReminder(payload);
        toast.success("Reminder created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      // Handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border text-foreground p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{reminder ? "Edit Reminder" : "Create Reminder"}</DialogTitle>
          <DialogDescription className="sr-only">
            {reminder ? "Edit your reminder details below" : "Fill out the details to create a new reminder"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 pt-2 space-y-4">
          
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              {...form.register("title")}
              placeholder="e.g. Doctor's Appointment"
              className="bg-card border-border"
            />
            {form.formState.errors.title && (
              <p className="text-red-400 text-sm">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Controller
                name="reminder_date"
                control={form.control}
                render={({ field }) => (
                  <DateTimePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : "")}
                  />
                )}
              />
              {form.formState.errors.reminder_date && (
                <p className="text-red-400 text-sm">{form.formState.errors.reminder_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={watchType}
                onValueChange={(val: ReminderFormValues["type"]) => form.setValue("type", val)}
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="medicine">Medicine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {watchType === "custom" && (
            <div className="space-y-2">
              <Label>Custom Type Name</Label>
              <Input
                {...form.register("custom_type")}
                placeholder="e.g. Subscription, Visa Renewal"
                className="bg-card border-border"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Description / Notes</Label>
            <Textarea
              {...form.register("description")}
              placeholder="Any additional details..."
              className="bg-card border-border resize-none h-24"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-foreground shadow-[0_0_15px_rgba(124,77,255,0.4)]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reminder ? "Save Changes" : "Create Reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
