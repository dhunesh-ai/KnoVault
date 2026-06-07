import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Goal } from "@/types/Goal";
import { Button } from "@/components/ui/button";
import { format, isPast } from "date-fns";
import { CheckCircle2, Circle, Edit, Trash2, Calendar, Target, Flag, Layers, TargetIcon, Flame, ListChecks, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { goalsService } from "@/services/goals";
import { useGoalsStore } from "@/store/useGoalsStore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface GoalProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  onEdit: (goal: Goal) => void;
  onDelete: (id: number, type: "daily_goal" | "project") => void;
}

export function GoalProfile({ open, onOpenChange, goal, onEdit, onDelete }: GoalProfileProps) {
  const { fetchGoals } = useGoalsStore();
  if (!goal) return null;

  const isDaily = goal.goal_type === "daily_goal";

  const handleToggleSubtask = async (subtaskId: string | number) => {
    if (isDaily || !goal.subtasks) return;
    
    const newSubtasks = goal.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    
    try {
      await goalsService.updateGoal(goal.id, { goal_type: "project", subtasks: newSubtasks });
      fetchGoals();
    } catch (error) {
      toast.error("Failed to update milestone");
    }
  };

  const handleToggleComplete = async () => {
    try {
      if (isDaily) {
        await goalsService.updateGoal(goal.id, { 
          goal_type: "daily_goal", 
          completed: !goal.completed 
        });
      } else {
        await goalsService.updateGoal(goal.id, { 
          goal_type: "project",
          completed: !goal.completed,
          progress: !goal.completed ? 100 : 0,
          status: !goal.completed ? "Completed" : "In Progress"
        });
      }
      fetchGoals();
      toast.success(goal.completed ? "Marked as pending" : "Marked as completed");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-background border-border sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="mb-6 border-b border-border pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
              isDaily 
                ? (goal.completed ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-emerald-500/10 text-emerald-500")
                : "bg-purple-500/10 text-purple-500 shadow-purple-500/10"
            )}>
              {isDaily ? <TargetIcon className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <SheetTitle className={cn("text-2xl font-bold line-clamp-2", goal.completed && "text-muted-foreground line-through")}>
                {goal.title}
              </SheetTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                {isDaily ? "Daily Habit" : "Active Project"}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className={cn(
                "flex-1 font-semibold border-2 transition-all",
                goal.completed 
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                  : "border-border text-foreground hover:border-purple-500 hover:text-purple-500"
              )}
              onClick={handleToggleComplete}
            >
              {goal.completed ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Completed</>
              ) : (
                <><Circle className="w-4 h-4 mr-2" /> Mark Complete</>
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={() => onEdit(goal)} className="border-2 border-border shrink-0">
              <Edit className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => onDelete(goal.id, goal.goal_type)} className="border-2 border-red-500/20 bg-red-500/10 hover:bg-red-500 hover:text-white shrink-0">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-8">
          {/* Daily Goal Specific UI */}
          {isDaily && (
            <AnimatePresence mode="popLayout">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
                    <Target className="w-6 h-6 text-blue-500 mb-2 opacity-80" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase">Daily Target</span>
                    <span className="text-2xl font-bold text-foreground">{goal.daily_target || 1} {goal.target_unit || 'times'}</span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
                    <Clock className="w-6 h-6 text-orange-500 mb-2 opacity-80" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase">Reminder Time</span>
                    <span className="text-2xl font-bold text-foreground">{goal.reminder_time || 'Anytime'}</span>
                  </div>
                </div>

                <div className="bg-card border border-border p-5 rounded-xl">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Start Date
                  </h4>
                  <p className="text-foreground font-medium text-lg">
                    {goal.start_date ? format(new Date(goal.start_date), "MMMM do, yyyy") : 'Not set'}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Project Specific UI */}
          {!isDaily && (
            <AnimatePresence mode="popLayout">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
                    <Flag className="w-6 h-6 text-orange-500 mb-2 opacity-80" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase">Priority</span>
                    <span className="text-2xl font-bold text-foreground">{goal.priority || 'Medium'}</span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
                    <Calendar className="w-6 h-6 text-blue-500 mb-2 opacity-80" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase">Deadline</span>
                    <span className={cn(
                      "text-xl font-bold", 
                      goal.deadline && isPast(new Date(goal.deadline)) && !goal.completed ? "text-red-500" : "text-foreground"
                    )}>
                      {goal.deadline ? format(new Date(goal.deadline), "MMM d, yyyy") : 'No Deadline'}
                    </span>
                  </div>
                </div>

                {goal.description && (
                  <div className="bg-card border border-border p-5 rounded-xl">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{goal.description}</p>
                  </div>
                )}

                <div className="bg-card border border-border p-5 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <ListChecks className="w-4 h-4" /> Milestones
                    </h4>
                    <span className="text-sm font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded-md">
                      {goal.progress || 0}%
                    </span>
                  </div>
                  
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-6">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-orange-400 transition-all duration-500 ease-out" 
                      style={{ width: `${goal.progress || 0}%` }} 
                    />
                  </div>

                  <div className="space-y-3">
                    {goal.subtasks && goal.subtasks.length > 0 ? (
                      goal.subtasks.map((st, i) => (
                        <div 
                          key={st.id || i}
                          onClick={() => handleToggleSubtask(st.id || i)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                            st.completed 
                              ? "bg-purple-500/5 border-purple-500/20" 
                              : "bg-muted/50 border-border hover:border-purple-500/50"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                            st.completed 
                              ? "bg-purple-500 border-purple-500 text-white" 
                              : "border-muted-foreground text-transparent"
                          )}>
                            {st.completed ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          </div>
                          <span className={cn(
                            "font-medium transition-colors",
                            st.completed ? "text-muted-foreground line-through" : "text-foreground"
                          )}>
                            {st.title}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-xl text-sm">
                        No milestones added. Break your project into smaller tasks!
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>
          )}

          <div className="text-center text-xs text-muted-foreground font-medium uppercase tracking-widest pt-4 opacity-50">
            Created on {format(new Date(goal.created_at), "MMM d, yyyy")}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
