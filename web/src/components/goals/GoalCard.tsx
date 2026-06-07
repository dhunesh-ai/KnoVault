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
          "h-full p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group",
          isCompleted 
            ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
            : "bg-gradient-to-br from-card to-emerald-950/20 border-border hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
        )}
      >
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", isCompleted ? "bg-emerald-500 text-white" : "bg-blue-500/20 text-blue-400")}>
                <TargetIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Habit</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(goal.id, "daily_goal"); }} className="cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <h3 className={cn("font-semibold text-lg line-clamp-1", isCompleted && "text-muted-foreground line-through")}>
            {goal.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Target: {goal.daily_target || 1} {goal.target_unit || 'times'}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Today</span>
              <span className={cn("text-sm font-bold", isCompleted ? "text-emerald-500" : "text-foreground")}>
                {isCompleted ? "100%" : "0%"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Time</span>
              <span className="text-sm font-bold text-foreground">
                {goal.reminder_time || 'Anytime'}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={handleToggleComplete}
            variant={isCompleted ? "default" : "outline"}
            className={cn(
              "h-10 w-10 p-0 rounded-full shrink-0",
              isCompleted 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" 
                : "border-border hover:border-emerald-500 text-muted-foreground hover:text-emerald-500"
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
      className="h-full p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group bg-gradient-to-br from-card to-purple-950/10 border-border hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.1)]"
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(goal.id, "project"); }} className="cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <h3 className={cn("font-semibold text-lg line-clamp-1", goal.completed && "text-muted-foreground line-through")}>
          {goal.title}
        </h3>
        
        <div className="flex items-center gap-3 mt-3">
          {hasDeadline && (
            <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md", isOverdue ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground")}>
              <Calendar className="w-3 h-3" />
              {format(new Date(goal.deadline!), "MMM d")}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-orange-500/10 text-orange-400">
            <Flag className="w-3 h-3" />
            {goal.priority || "Medium"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs text-muted-foreground font-medium">
            {goal.subtasks?.length || 0} Milestones
          </span>
          <span className="text-sm font-bold text-foreground">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-orange-400 transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
