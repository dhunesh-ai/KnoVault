/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SpecialDay } from "@/types/SpecialDay";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const specialDaySchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["birthday", "anniversary", "engagement", "graduation", "wedding", "custom"]),
  is_recurring: z.boolean(),
  custom_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  gift_ideas: z.string().optional().nullable(),
  celebration_plans: z.string().optional().nullable(),
  reminder_notes: z.string().optional().nullable(),
  message_draft: z.string().optional().nullable(),
});

type SpecialDayFormValues = z.infer<typeof specialDaySchema>;

interface SpecialDayEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialDay?: SpecialDay | null;
}

export function SpecialDayEditor({ open, onOpenChange, specialDay }: SpecialDayEditorProps) {
  const { createSpecialDay, updateSpecialDay } = useSpecialDaysStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: SpecialDayFormValues = {
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    type: "birthday",
    is_recurring: true,
    custom_type: "",
    notes: "",
    gift_ideas: "",
    celebration_plans: "",
    reminder_notes: "",
    message_draft: "",
  };

  const form = useForm<SpecialDayFormValues>({
    resolver: zodResolver(specialDaySchema),
    defaultValues,
  });

  const watchType = form.watch("type");

  useEffect(() => {
    if (specialDay) {
      form.reset({
        title: specialDay.title,
        date: specialDay.date,
        type: specialDay.type as SpecialDayFormValues["type"],
        is_recurring: specialDay.is_recurring,
        custom_type: specialDay.custom_type || "",
        notes: specialDay.notes || "",
        gift_ideas: specialDay.gift_ideas || "",
        celebration_plans: specialDay.celebration_plans || "",
        reminder_notes: specialDay.reminder_notes || "",
        message_draft: specialDay.message_draft || "",
      });
    } else {
      form.reset(defaultValues);
    }
  }, [specialDay, open, form]);

  const onSubmit = async (data: SpecialDayFormValues) => {
    setIsSubmitting(true);
    try {
      if (specialDay) {
        await updateSpecialDay(specialDay.id, data as any);
        toast.success("Event updated successfully");
      } else {
        await createSpecialDay(data as any);
        toast.success("Event created successfully");
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
      <DialogContent className="sm:max-w-[700px] bg-background border-border text-foreground p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500" />
        
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-card/30">
          <DialogTitle className="text-2xl font-bold">
            {specialDay ? "Edit Celebration" : "Create Celebration"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            {specialDay ? "Update the details for this special day." : "Add a new birthday, anniversary, or milestone to your calendar."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[85vh]">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-8 py-6">
              
              {/* SECTION 1: Basic Information */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">1</div>
                  <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Event Title</Label>
                    <Input
                      {...form.register("title")}
                      placeholder="e.g. Emma's 30th Birthday, 5th Anniversary"
                      className="bg-card border-border/50 focus-visible:ring-pink-500 text-base py-5"
                    />
                    {form.formState.errors.title && (
                      <p className="text-red-400 text-sm font-medium">{form.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Event Date</Label>
                    <Controller
                      control={form.control}
                      name="date"
                      render={({ field }) => {
                        const dateVal = field.value ? new Date(field.value) : undefined;
                        // To prevent timezone drift on the date picker
                        if (dateVal) {
                          dateVal.setMinutes(dateVal.getMinutes() + dateVal.getTimezoneOffset());
                        }
                        
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-card border-border/50 py-5",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-pink-500" />
                                {field.value ? format(new Date(field.value), "MMMM do, yyyy") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                              <Calendar
                                mode="single"
                                selected={dateVal}
                                onSelect={(d) => {
                                  if (d) {
                                    // ensure local timezone format
                                    const yyyy = d.getFullYear();
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    field.onChange(`${yyyy}-${mm}-${dd}`);
                                  }
                                }}
                                className="bg-card text-foreground"
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                    {form.formState.errors.date && (
                      <p className="text-red-400 text-sm font-medium">{form.formState.errors.date.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Event Type</Label>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-card border-border/50 py-5">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            <SelectItem value="birthday">Birthday</SelectItem>
                            <SelectItem value="anniversary">Anniversary</SelectItem>
                            <SelectItem value="engagement">Milestone</SelectItem>
                            <SelectItem value="graduation">Achievement</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {watchType === "custom" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                    <Label className="text-sm font-medium">Custom Label</Label>
                    <Input
                      {...form.register("custom_type")}
                      placeholder="e.g. Work Anniversary"
                      className="bg-card border-border/50"
                    />
                  </motion.div>
                )}

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-base">Repeats Yearly</Label>
                    <p className="text-xs text-muted-foreground">Automatically track this event every year.</p>
                  </div>
                  <Controller
                    control={form.control}
                    name="is_recurring"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-pink-500" />
                    )}
                  />
                </div>
              </div>

              {/* SECTION 2: Celebration Planning */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-xs font-bold">2</div>
                  <h3 className="text-lg font-semibold text-foreground">Planning & Ideas</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Gift Ideas</Label>
                    <Textarea
                      {...form.register("gift_ideas")}
                      placeholder="Things they might like..."
                      className="bg-card border-border/50 resize-none h-24"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Celebration Plans</Label>
                    <Textarea
                      {...form.register("celebration_plans")}
                      placeholder="Dinner reservations, surprise party..."
                      className="bg-card border-border/50 resize-none h-24"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Message Draft</Label>
                  <Textarea
                    {...form.register("message_draft")}
                    placeholder="Draft a nice message or text to send them..."
                    className="bg-card border-border/50 resize-none h-20"
                  />
                </div>
                
                <div className="space-y-2 pb-2">
                  <Label className="text-sm font-medium">Additional Notes</Label>
                  <Textarea
                    {...form.register("notes")}
                    placeholder="Sizes, preferences, or any other details..."
                    className="bg-card border-border/50 resize-none h-20"
                  />
                </div>
              </div>

            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-card/50 border-t border-border/50 shrink-0">
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
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)] px-8"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {specialDay ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
