"use client";

import { Reminder } from "@/types/Reminder";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MoreVertical, Trash2, Edit2, CheckCircle2, Circle, AlertCircle, Eye, CheckSquare } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (id: number, is_completed: boolean) => void;
}

export function ReminderCard({ reminder, onEdit, onDelete, onToggleComplete }: ReminderCardProps) {
  const dateObj = new Date(reminder.reminder_date);
  const overdue = isPast(dateObj) && !reminder.is_completed && !isToday(dateObj);
  const today = isToday(dateObj) && !reminder.is_completed;

  const getTypeColor = () => {
    switch (reminder.type.toLowerCase()) {
      case "meeting": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "assignment": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      case "birthday": return "text-pink-400 bg-pink-400/10 border-pink-400/20";
      case "task": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "reminder": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "medicine": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      default: return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  return (
    <Card className={cn(
      "bg-card backdrop-blur-sm border-border hover:border-border transition-all duration-300 group relative flex flex-col h-full",
      reminder.is_completed && "opacity-60 grayscale-[0.5]"
    )}>
      {overdue && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl" />
      )}
      {today && !overdue && (
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl" />
      )}
      
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex flex-1 items-start gap-3">
          <button
            onClick={() => onToggleComplete(reminder.id, !reminder.is_completed)}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
          >
            {reminder.is_completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
          <div className="flex-1 overflow-hidden">
            <h3 className={cn(
              "font-semibold text-foreground truncate text-base transition-all",
              reminder.is_completed && "line-through text-muted-foreground"
            )}>
              {reminder.title}
            </h3>
            {reminder.description && !reminder.description.startsWith('{') && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{reminder.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 shrink-0 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onEdit(reminder)} className="cursor-pointer">
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(reminder)} className="cursor-pointer">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleComplete(reminder.id, !reminder.is_completed)} className="cursor-pointer">
                {reminder.is_completed ? <Circle className="w-4 h-4 mr-2" /> : <CheckSquare className="w-4 h-4 mr-2" />}
                {reminder.is_completed ? "Mark Incomplete" : "Mark Complete"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(reminder.id)} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 mt-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", getTypeColor())}>
              {reminder.custom_type || reminder.type}
            </Badge>
            {overdue && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] uppercase font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Overdue
              </Badge>
            )}
            {today && !overdue && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] uppercase font-semibold">
                Today
              </Badge>
            )}
          </div>
          
          <div className="flex items-center text-muted-foreground text-xs font-medium gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(dateObj, 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(dateObj, 'h:mm a')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
