/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { CalendarIcon, Clock, Repeat, Star, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Goal } from "@/types/Goal";
import { useGoalsStore } from "@/store/useGoalsStore";
import { toast } from "sonner";
import { motion } from "framer-motion";

const goalSchema = z.object({
  title: z.string().min(1, "Goal name is required"),
  daily_target: z.number({ message: "Target value must be a number" }).min(1, "Target value must be at least 1"),
  target_unit: z.string().min(1, "Unit is required"),
  start_date: z.string().min(1, "Start date is required"),
  reminder_time: z.string().min(1, "Reminder time is required"),
  repeat_schedule: z.string().optional(),
  priority: z.string().optional(),
  notes: z.string().optional(),
  difficulty: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

const REPEAT_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "custom", label: "Custom" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", emoji: "🟢" },
  { value: "medium", label: "Medium", emoji: "🟡" },
  { value: "hard", label: "Hard", emoji: "🔴" },
];

const PRIORITY_OPTIONS = [
  { value: "Low", color: "#10B981" },
  { value: "Medium", color: "#F59E0B" },
  { value: "High", color: "#EF4444" },
];

const ICON_OPTIONS = ["🎯", "💪", "📖", "🏃", "💧", "🧘", "🍎", "💤", "📝", "🎵", "🌅", "🧠"];

const COLOR_OPTIONS = [
  "#6D4CFF", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899",
  "#8B5CF6", "#06B6D4", "#14B8A6", "#F97316", "#E11D48", "#7C3AED",
];

export function GoalEditor({ open, onOpenChange, goal }: GoalEditorProps) {
  const { createGoal, updateGoal, isSaving } = useGoalsStore();
  const [selectedRepeat, setSelectedRepeat] = useState("daily");
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [selectedPriority, setSelectedPriority] = useState("Medium");
  const [selectedColor, setSelectedColor] = useState("#6D4CFF");
  const [selectedIcon, setSelectedIcon] = useState("🎯");

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      daily_target: 1,
      target_unit: "times",
      start_date: format(new Date(), "yyyy-MM-dd"),
      reminder_time: "09:00",
      priority: "Medium",
    },
  });

  useEffect(() => {
    if (open) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      if (goal) {
        const goalStartDate = goal.start_date ? format(new Date(goal.start_date), "yyyy-MM-dd") : todayStr;
        form.reset({
          title: goal.title || "",
          daily_target: goal.daily_target || 1,
          target_unit: goal.target_unit || "times",
          start_date: goalStartDate,
          reminder_time: goal.reminder_time || "09:00",
          repeat_schedule: goal.repeat_schedule || "daily",
          priority: goal.priority || "Medium",
          notes: goal.notes || "",
          difficulty: goal.difficulty || "medium",
          color: goal.color || "#6D4CFF",
          icon: goal.icon || "🎯",
        });
        setSelectedRepeat(goal.repeat_schedule || "daily");
        setSelectedDifficulty(goal.difficulty || "medium");
        setSelectedPriority(goal.priority || "Medium");
        setSelectedColor(goal.color || "#6D4CFF");
        setSelectedIcon(goal.icon || "🎯");
      } else {
        form.reset({
          title: "",
          daily_target: 1,
          target_unit: "times",
          start_date: todayStr,
          reminder_time: "09:00",
          repeat_schedule: "daily",
          priority: "Medium",
          notes: "",
          difficulty: "medium",
          color: "#6D4CFF",
          icon: "🎯",
        });
        setSelectedRepeat("daily");
        setSelectedDifficulty("medium");
        setSelectedPriority("Medium");
        setSelectedColor("#6D4CFF");
        setSelectedIcon("🎯");
      }
    }
  }, [open, goal, form]);

  const onSubmit = async (data: GoalFormValues) => {
    try {
      const payload = {
        ...data,
        start_date: data.start_date ? format(new Date(data.start_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        goal_type: "daily_goal" as const,
        repeat_schedule: selectedRepeat,
        difficulty: selectedDifficulty,
        priority: selectedPriority,
        color: selectedColor,
        icon: selectedIcon,
      };
      if (goal) {
        await updateGoal(goal.id, payload as any);
        toast.success("Goal updated");
      } else {
        await createGoal(payload as any);
        toast.success("Daily Goal Created Successfully");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save daily goal");
    }
  };

  const isTitleValid = Boolean(form.watch("title")?.trim());
  const isTargetValid = Number(form.watch("daily_target")) >= 1;
  const isUnitValid = Boolean(form.watch("target_unit")?.trim());
  const isTimeValid = Boolean(form.watch("reminder_time")?.trim());
  const isDateValid = Boolean(form.watch("start_date"));
  const isFormValid = isTitleValid && isTargetValid && isUnitValid && isTimeValid && isDateValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/40 text-foreground max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">
              {goal ? "Edit Daily Goal" : "Create Daily Goal"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm font-medium">
              Build lasting habits and track your daily progress.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 pt-4 space-y-5">
          {/* Icon + Goal Name */}
          <div className="flex items-start gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center text-2xl shrink-0 hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  {selectedIcon}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="grid grid-cols-6 gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:bg-muted/80 transition-colors cursor-pointer",
                        selectedIcon === icon && "bg-primary/10 ring-2 ring-primary/30"
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Goal Name <span className="text-red-500">*</span>
              </Label>
              <Input
                {...form.register("title")}
                placeholder="e.g., Drink 3L Water"
                className="bg-muted/30 border-border/30 rounded-xl h-11 text-sm font-medium"
              />
              {form.formState.errors.title && (
                <p className="text-red-500 text-xs font-medium">{form.formState.errors.title.message}</p>
              )}
            </div>
          </div>

          {/* Target + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Value <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                {...form.register("daily_target", { valueAsNumber: true })}
                className="bg-muted/30 border-border/30 rounded-xl h-11 text-sm"
              />
              {form.formState.errors.daily_target && (
                <p className="text-red-500 text-xs font-medium">{form.formState.errors.daily_target.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Unit <span className="text-red-500">*</span>
              </Label>
              <Input
                {...form.register("target_unit")}
                placeholder="e.g., Liters, Pages"
                className="bg-muted/30 border-border/30 rounded-xl h-11 text-sm"
              />
              {form.formState.errors.target_unit && (
                <p className="text-red-500 text-xs font-medium">{form.formState.errors.target_unit.message}</p>
              )}
            </div>
          </div>

          {/* Reminder + Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Reminder Time <span className="text-red-500">*</span>
              </Label>
              <Input
                type="time"
                {...form.register("reminder_time")}
                className="bg-muted/30 border-border/30 rounded-xl h-11 text-sm"
              />
              {form.formState.errors.reminder_time && (
                <p className="text-red-500 text-xs font-medium">{form.formState.errors.reminder_time.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-medium bg-muted/30 border-border/30 rounded-xl h-11 text-sm",
                      !form.watch("start_date") && "text-muted-foreground/50"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {form.watch("start_date")
                      ? format(new Date(form.watch("start_date")!), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("start_date") ? new Date(form.watch("start_date")!) : undefined}
                    onSelect={(d) => d && form.setValue("start_date", format(d, "yyyy-MM-dd"), { shouldValidate: true })}
                    className="bg-card text-foreground"
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.start_date && (
                <p className="text-red-500 text-xs font-medium">{form.formState.errors.start_date.message}</p>
              )}
            </div>
          </div>

          {/* Repeat Schedule */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Repeat className="w-3 h-3" /> Repeat
            </Label>
            <div className="flex flex-wrap gap-2">
              {REPEAT_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedRepeat(opt.value)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold border-[1.5px] transition-all cursor-pointer",
                    selectedRepeat === opt.value
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/30 text-muted-foreground hover:border-border"
                  )}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Star className="w-3 h-3" /> Priority
            </Label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedPriority(opt.value)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold border-[1.5px] transition-all cursor-pointer",
                    selectedPriority === opt.value
                      ? "shadow-sm"
                      : "border-border/30 text-muted-foreground"
                  )}
                  style={
                    selectedPriority === opt.value
                      ? {
                          backgroundColor: `${opt.color}15`,
                          borderColor: `${opt.color}40`,
                          color: opt.color,
                        }
                      : undefined
                  }
                >
                  {opt.value}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Difficulty
            </Label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedDifficulty(opt.value)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold border-[1.5px] transition-all cursor-pointer",
                    selectedDifficulty === opt.value
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/30 text-muted-foreground"
                  )}
                >
                  {opt.emoji} {opt.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <motion.button
                  key={color}
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-xl transition-all cursor-pointer",
                    selectedColor === color && "ring-2 ring-offset-2 ring-offset-card"
                  )}
                  style={{
                    backgroundColor: color,
                    ...(selectedColor === color ? { ringColor: color } : {}),
                  }}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notes
            </Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Additional notes..."
              className="bg-muted/30 border-border/30 rounded-xl text-sm min-h-[80px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-sm font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !isFormValid}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 text-sm font-bold shadow-[0_4px_16px_rgba(124,77,255,0.25)] flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Saving..." : goal ? "Update Goal" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
