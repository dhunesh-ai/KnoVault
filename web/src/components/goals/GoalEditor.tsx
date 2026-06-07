/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Goal } from "@/types/Goal";
import { useGoalsStore } from "@/store/useGoalsStore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  goal_type: z.enum(["daily_goal", "project"]),
  
  // Daily Goal specific
  daily_target: z.number().min(1).optional(),
  target_unit: z.string().optional(),
  start_date: z.string().optional(),
  reminder_time: z.string().optional(),
  
  // Project specific
  description: z.string().optional(),
  priority: z.string().optional(),
  deadline: z.string().optional(),
  subtasks: z.array(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1, "Milestone title is required"),
    completed: z.boolean()
  })).optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

export function GoalEditor({ open, onOpenChange, goal }: GoalEditorProps) {
  const { createGoal, updateGoal, isSaving } = useGoalsStore();

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      goal_type: "daily_goal",
      daily_target: 1,
      target_unit: "times",
      priority: "Medium",
      subtasks: [],
    },
  });

  const { fields: subtaskFields, append: appendSubtask, remove: removeSubtask, update: updateSubtask } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });

  useEffect(() => {
    if (open) {
      if (goal) {
        form.reset({
          title: goal.title,
          goal_type: goal.goal_type,
          daily_target: goal.daily_target || 1,
          target_unit: goal.target_unit || "times",
          start_date: goal.start_date ? new Date(goal.start_date).toISOString() : undefined,
          reminder_time: goal.reminder_time || "",
          description: goal.description || "",
          priority: goal.priority || "Medium",
          deadline: goal.deadline ? new Date(goal.deadline).toISOString() : undefined,
          subtasks: goal.subtasks || [],
        });
      } else {
        form.reset({
          title: "",
          goal_type: "daily_goal",
          daily_target: 1,
          target_unit: "times",
          priority: "Medium",
          subtasks: [],
          start_date: undefined,
          deadline: undefined,
          description: "",
          reminder_time: "",
        });
      }
    }
  }, [open, goal, form]);

  const watchType = form.watch("goal_type");

  const onSubmit = async (data: GoalFormValues) => {
    try {
      if (goal) {
        await updateGoal(goal.id, data as any);
        toast.success("Goal updated");
      } else {
        await createGoal(data as any);
        toast.success("Goal created");
      }
      onOpenChange(false);
    } catch (error) {
      // Handled in store
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit" : "Create"} {watchType === "daily_goal" ? "Daily Goal" : "Active Project"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {watchType === "daily_goal" ? "Build lasting habits and track your daily progress." : "Plan long-term ambitions and break them down into milestones."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          
          <div className="space-y-2">
            <Label>Goal Type</Label>
            <Select 
              disabled={!!goal} 
              onValueChange={(val) => form.setValue("goal_type", val as any)} 
              value={watchType}
            >
              <SelectTrigger className="w-full bg-card border-border">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="daily_goal">Daily Goal</SelectItem>
                <SelectItem value="project">Active Project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{watchType === "daily_goal" ? "Goal Name" : "Project Name"}</Label>
            <Input
              {...form.register("title")}
              placeholder={watchType === "daily_goal" ? "e.g., Drink 3L Water" : "e.g., Launch Startup"}
              className="bg-card border-border"
            />
            {form.formState.errors.title && <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>}
          </div>

          <AnimatePresence mode="popLayout">
            {watchType === "daily_goal" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Daily Target</Label>
                    <Input
                      type="number"
                      {...form.register("daily_target", { valueAsNumber: true })}
                      className="bg-card border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      {...form.register("target_unit")}
                      placeholder="e.g., Liters, Pages"
                      className="bg-card border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-card border-border",
                            !form.watch("start_date") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("start_date") ? format(new Date(form.watch("start_date")!), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch("start_date") ? new Date(form.watch("start_date")!) : undefined}
                          onSelect={(d) => d && form.setValue("start_date", d.toISOString())}
                          className="bg-card text-foreground"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Reminder Time</Label>
                    <Input
                      type="time"
                      {...form.register("reminder_time")}
                      className="bg-card border-border"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {watchType === "project" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 overflow-hidden"
              >
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    {...form.register("description")}
                    placeholder="Describe your project..."
                    className="bg-card border-border min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      onValueChange={(val) => form.setValue("priority", val)}
                      value={form.watch("priority")}
                    >
                      <SelectTrigger className="w-full bg-card border-border">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-card border-border",
                            !form.watch("deadline") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("deadline") ? format(new Date(form.watch("deadline")!), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch("deadline") ? new Date(form.watch("deadline")!) : undefined}
                          onSelect={(d) => d && form.setValue("deadline", d.toISOString())}
                          className="bg-card text-foreground"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label>Milestones</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendSubtask({ title: "", completed: false })}
                      className="h-8 bg-card border-border"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {subtaskFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateSubtask(index, { ...field, completed: !field.completed })}
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                            field.completed 
                              ? "bg-purple-500 border-purple-500 text-white" 
                              : "border-muted-foreground text-transparent hover:border-purple-500"
                          )}
                        >
                          {field.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <Input
                          {...form.register(`subtasks.${index}.title` as const)}
                          placeholder="Milestone title..."
                          className={cn(
                            "bg-transparent border-0 focus-visible:ring-0 px-0 shadow-none",
                            field.completed && "line-through text-muted-foreground"
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubtask(index)}
                          className="text-muted-foreground hover:text-red-500 shrink-0 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {subtaskFields.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-xl text-sm">
                        No milestones added. Break your project into smaller tasks!
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSaving ? "Saving..." : goal ? "Update Goal" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
