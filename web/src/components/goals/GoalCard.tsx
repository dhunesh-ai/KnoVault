import { Goal } from "@/types/Goal";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { CheckCircle2, Circle, MoreHorizontal, Edit, Trash2, Calendar, Target, Flag, Layers, Flame, Target as TargetIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { goalsService } from "@/services/goals";
import { useGoalsStore } from "@/store/useGoalsStore";
import { toast } from "sonner";

interface GoalCardProps {
  goal: Goal;
  onClick: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: number, type: "daily_goal" | "project") => void;
}

export function GoalCard({ goal, onClick, onEdit, onDelete }: GoalCardProps) {
  const { fetchGoals } = useGoalsStore();
  const isDaily = goal.goal_type === "daily_goal";

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  if (isDaily) {
    const isCompleted = goal.completed;
    return (
      <div
        onClick={() => onClick(goal)}
        className={cn(
          "h-full p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group",
          isCompleted 
            ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_4px_16px_rgba(16,185,129,0.04)]" 
            : "bg-card/50 backdrop-blur-md border-border/40 hover:border-emerald-500/30 hover:shadow-[0_4px_20px_rgba(16,185,129,0.06)]"
        )}
      >
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={cn("p-2 rounded-xl shrink-0 transition-all", isCompleted ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-500")}>
                <TargetIcon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">Daily Habit</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/90 backdrop-blur-xl border-border/50 rounded-2xl p-1.5 shadow-lg">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }} className="cursor-pointer rounded-xl text-xs py-2">
                  <Edit className="w-4 h-4 mr-2" /> Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(goal.id, "daily_goal"); }} className="cursor-pointer rounded-xl text-xs py-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Habit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <h3 className={cn("font-bold text-sm tracking-tight text-foreground line-clamp-1", isCompleted && "text-muted-foreground line-through")}>
            {goal.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 font-semibold">
            Target: {goal.daily_target || 1} {goal.target_unit || 'times'}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Today</span>
              <span className={cn("text-xs font-extrabold", isCompleted ? "text-emerald-500" : "text-foreground")}>
                {isCompleted ? "100%" : "0%"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Time</span>
              <span className="text-xs font-extrabold text-foreground">
                {goal.reminder_time || 'Anytime'}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={handleToggleComplete}
            variant={isCompleted ? "default" : "outline"}
            className={cn(
              "h-10 w-10 p-0 rounded-full shrink-0 cursor-pointer transition-all",
              isCompleted 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent shadow-sm" 
                : "border-border/40 hover:border-emerald-500 text-muted-foreground hover:text-emerald-500 bg-card"
            )}
          >
            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    );
  }

  // Active Project Card
  const progress = goal.progress || 0;
  const isOverdue = goal.deadline && isPast(new Date(goal.deadline)) && !goal.completed;
  const hasDeadline = !!goal.deadline;

  return (
    <div
      onClick={() => onClick(goal)}
      className="h-full p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group bg-card/50 backdrop-blur-md border-border/40 hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(124,77,255,0.06)]"
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">Project</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card/90 backdrop-blur-xl border-border/50 rounded-2xl p-1.5 shadow-lg">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }} className="cursor-pointer rounded-xl text-xs py-2">
                <Edit className="w-4 h-4 mr-2" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(goal.id, "project"); }} className="cursor-pointer rounded-xl text-xs py-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <h3 className={cn("font-bold text-sm tracking-tight text-foreground line-clamp-1", goal.completed && "text-muted-foreground line-through")}>
          {goal.title}
        </h3>
        
        <div className="flex items-center gap-2 mt-3">
          {hasDeadline && (
            <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border", isOverdue ? "bg-red-500/5 text-red-500 border-red-500/10" : "bg-accent/40 text-muted-foreground border-border/30")}>
              <Calendar className="w-3 h-3 text-primary" />
              {format(new Date(goal.deadline!), "MMM d")}
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-orange-500/5 text-orange-500 border border-orange-500/10">
            <Flag className="w-3 h-3" />
            {goal.priority || "Medium"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            {goal.subtasks?.length || 0} Milestones
          </span>
          <span className="text-xs font-extrabold text-foreground">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-accent/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-purple-400 transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
