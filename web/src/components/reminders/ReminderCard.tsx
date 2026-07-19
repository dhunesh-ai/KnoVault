"use client";

import { useState, useEffect } from "react";
import { Reminder } from "@/types/Reminder";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Clock, MoreVertical, Trash2, Edit2, CheckCircle2, Circle, 
  AlertCircle, Eye, CheckSquare, Users, BookOpen, Gift, Dumbbell, 
  Droplet, Heart, Target, HelpCircle, Pill, Compass
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (id: number, is_completed: boolean) => void;
}

interface ParsedDescription {
  isMedicine?: boolean;
  medName?: string;
  medType?: string;
  dosage?: string;
  foodTiming?: string;
  frequency?: string;
  timings?: string[];
  timing_times?: Record<string, string>;
  timing?: string;
  day_number?: number;
  total_days?: number;
  notes?: string;
  priority?: "High" | "Medium" | "Low";
  isCustom?: boolean;
  customName?: string;
  customIcon?: string;
}

export function ReminderCard({ reminder, onEdit, onDelete, onToggleComplete }: ReminderCardProps) {
  const [now, setNow] = useState(new Date());

  // Update "now" every 30 seconds to keep countdowns accurate
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const dateObj = new Date(reminder.reminder_date);
  const isOverdue = isPast(dateObj) && !reminder.is_completed;
  
  // Parse description if it's JSON
  let parsed: ParsedDescription | null = null;
  const descStr = (reminder.description || "").trim();
  if (descStr.startsWith("{")) {
    try {
      parsed = JSON.parse(descStr);
    } catch (e) {
      // ignore
    }
  }

  // Get Priority level
  const priority = parsed?.priority || (isOverdue ? "High" : isToday(dateObj) ? "Medium" : "Low");

  // Get countdown/overdue helper
  const getCountdown = () => {
    if (reminder.is_completed) return { text: "Completed", class: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
    
    const diffMs = dateObj.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 0) {
      const absMin = Math.abs(diffMin);
      if (absMin < 60) {
        return { text: `Overdue by ${absMin}m`, class: "text-red-400 bg-red-400/10 border-red-400/20 animate-pulse" };
      }
      const hours = Math.floor(absMin / 60);
      const mins = absMin % 60;
      if (hours < 24) {
        return { text: `Overdue by ${hours}h ${mins}m`, class: "text-red-400 bg-red-400/10 border-red-400/20 animate-pulse" };
      }
      const days = Math.floor(hours / 24);
      return { text: `Overdue by ${days}d`, class: "text-red-400 bg-red-400/10 border-red-400/20 animate-pulse" };
    } else {
      if (diffMin < 60) {
        return { text: `In ${diffMin}m`, class: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
      }
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      if (hours < 24) {
        return { text: `In ${hours}h ${mins}m`, class: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
      }
      const days = Math.floor(hours / 24);
      return { text: `In ${days}d`, class: "text-slate-400 bg-slate-400/10 border-slate-400/20" };
    }
  };

  const countdown = getCountdown();

  // Get Priority Styling
  const getPriorityBadge = () => {
    switch (priority) {
      case "High":
        return <Badge className="bg-red-500/10 hover:bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">High</Badge>;
      case "Medium":
        return <Badge className="bg-amber-500/10 hover:bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">Medium</Badge>;
      default:
        return <Badge className="bg-blue-500/10 hover:bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">Low</Badge>;
    }
  };

  // Resolve Category icon & accent classes
  const getCategoryDetails = () => {
    const type = parsed?.isMedicine ? "medicine" : parsed?.isCustom ? "custom" : reminder.type.toLowerCase();
    
    switch (type) {
      case "meeting":
        return {
          icon: <Users className="w-4 h-4 text-blue-400" />,
          accent: "from-blue-400/20 via-blue-500/5 to-transparent",
          border: "hover:border-blue-400/30",
          tag: "text-blue-400 bg-blue-400/10 border-blue-400/20",
          indicator: "bg-blue-400",
          label: "Meeting"
        };
      case "assignment":
        return {
          icon: <BookOpen className="w-4 h-4 text-purple-400" />,
          accent: "from-purple-400/20 via-purple-500/5 to-transparent",
          border: "hover:border-purple-400/30",
          tag: "text-purple-400 bg-purple-400/10 border-purple-400/20",
          indicator: "bg-purple-400",
          label: "Assignment"
        };
      case "birthday":
        return {
          icon: <Gift className="w-4 h-4 text-pink-400" />,
          accent: "from-pink-400/20 via-pink-500/5 to-transparent",
          border: "hover:border-pink-400/30",
          tag: "text-pink-400 bg-pink-400/10 border-pink-400/20",
          indicator: "bg-pink-400",
          label: "Birthday"
        };
      case "event":
        return {
          icon: <Calendar className="w-4 h-4 text-sky-400" />,
          accent: "from-sky-400/20 via-sky-500/5 to-transparent",
          border: "hover:border-sky-400/30",
          tag: "text-sky-400 bg-sky-400/10 border-sky-400/20",
          indicator: "bg-sky-400",
          label: "Event"
        };
      case "medicine": {
        return {
          icon: <Pill className="w-4 h-4 text-emerald-400" />,
          accent: "from-emerald-400/20 via-emerald-500/5 to-transparent",
          border: "hover:border-emerald-400/30",
          tag: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
          indicator: "bg-emerald-400",
          label: "Medicine"
        };
      }
      case "custom": {
        // Find custom icon mapping
        const iconName = parsed?.customIcon || "🎯 Personal";
        const iconLower = iconName.toLowerCase();
        let iconElem = <Target className="w-4 h-4 text-amber-400" />;
        
        if (iconLower.includes("health") || iconLower.includes("medical")) iconElem = <Pill className="w-4 h-4 text-amber-400" />;
        else if (iconLower.includes("study") || iconLower.includes("book")) iconElem = <BookOpen className="w-4 h-4 text-amber-400" />;
        else if (iconLower.includes("travel") || iconLower.includes("airplane")) iconElem = <Compass className="w-4 h-4 text-amber-400" />;
        else if (iconLower.includes("water")) iconElem = <Droplet className="w-4 h-4 text-amber-400" />;
        else if (iconLower.includes("fitness") || iconLower.includes("barbell")) iconElem = <Dumbbell className="w-4 h-4 text-amber-400" />;
        else if (iconLower.includes("prayer") || iconLower.includes("heart")) iconElem = <Heart className="w-4 h-4 text-amber-400" />;

        const customLabel = parsed?.customName || reminder.custom_type || "Custom";
        
        return {
          icon: iconElem,
          accent: "from-amber-400/20 via-amber-500/5 to-transparent",
          border: "hover:border-amber-400/30",
          tag: "text-amber-400 bg-amber-400/10 border-amber-400/20",
          indicator: "bg-amber-400",
          label: customLabel
        };
      }
      default:
        return {
          icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
          accent: "from-slate-400/20 via-slate-500/5 to-transparent",
          border: "hover:border-slate-400/30",
          tag: "text-slate-400 bg-slate-400/10 border-slate-400/20",
          indicator: "bg-slate-400",
          label: reminder.type
        };
    }
  };

  const cat = getCategoryDetails();

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Card className={cn(
        "bg-card/35 backdrop-blur-2xl border border-border/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group relative flex flex-col h-full overflow-hidden rounded-3xl",
        cat.border,
        reminder.is_completed && "opacity-60 grayscale-[0.4]"
      )}>
        {/* Glow accent */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0", cat.accent)} />
        
        {/* Colored side indicator for overdue or today reminders */}
        {isOverdue && (
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-[60%] bg-red-500 rounded-r-full shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10" />
        )}
        {!isOverdue && isToday(dateObj) && !reminder.is_completed && (
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-[60%] bg-amber-500 rounded-r-full shadow-[0_0_8px_rgba(245,158,11,0.5)] z-10" />
        )}

        {/* Card Header */}
        <div className="p-4 pb-1.5 flex items-start justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-background/60 border border-border/40 rounded-2xl flex items-center justify-center shadow-sm">
              {cat.icon}
            </span>
            <Badge variant="outline" className={cn("text-[9px] uppercase font-bold tracking-wider rounded-xl px-2.5 py-0.5", cat.tag)}>
              {cat.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {getPriorityBadge()}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-xl transition-all cursor-pointer">
                  <MoreVertical className="w-4.5 h-4.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/90 backdrop-blur-xl border-border/50 rounded-2xl p-1.5 shadow-xl min-w-[150px]">
                <DropdownMenuItem onClick={() => onEdit(reminder)} className="cursor-pointer rounded-xl text-xs py-2">
                  <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(reminder)} className="cursor-pointer rounded-xl text-xs py-2">
                  <Edit2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  Edit reminder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleComplete(reminder.id, !reminder.is_completed)} className="cursor-pointer rounded-xl text-xs py-2">
                  {reminder.is_completed ? <Circle className="w-4 h-4 mr-2 text-muted-foreground" /> : <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground" />}
                  {reminder.is_completed ? "Mark Incomplete" : "Mark Complete"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(reminder.id)} className="cursor-pointer rounded-xl text-xs py-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete reminder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 pt-1.5 flex-1 flex flex-col justify-between relative z-10">
          <div className="flex gap-2.5 items-start">
            <button
              onClick={() => onToggleComplete(reminder.id, !reminder.is_completed)}
              className="mt-1 shrink-0 text-muted-foreground/80 hover:text-primary transition-all focus:outline-none cursor-pointer scale-105"
            >
              {reminder.is_completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-bold text-foreground text-sm leading-snug tracking-tight truncate",
                reminder.is_completed && "line-through text-muted-foreground"
              )}>
                {parsed?.isMedicine ? parsed.medName : parsed?.isCustom ? reminder.title : reminder.title}
              </h3>
              
              {/* Display parsed Medicine summary */}
              {parsed?.isMedicine && (
                <div className="mt-1.5 space-y-1">
                  <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {parsed.dosage} • {parsed.medType?.split(" ")[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground/85 font-medium">
                    {parsed.foodTiming} • {parsed.frequency}
                  </p>
                  {parsed.timing && (
                    <p className="text-[9px] text-primary/80 font-bold bg-primary/5 border border-primary/10 rounded-lg px-2 py-0.5 inline-block mt-0.5">
                      Dose: {parsed.timing}
                    </p>
                  )}
                  {parsed.day_number && parsed.total_days && (
                    <div className="w-full bg-muted/30 rounded-full h-1 mt-2 overflow-hidden border border-border/10">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${(parsed.day_number / parsed.total_days) * 100}%` }}
                      />
                    </div>
                  )}
                  {parsed.notes && (
                    <p className="text-[10px] italic text-muted-foreground/75 mt-1 border-t border-border/10 pt-1 leading-normal line-clamp-1">
                      "{parsed.notes}"
                    </p>
                  )}
                </div>
              )}

              {/* Display parsed Custom summary */}
              {parsed?.isCustom && (
                <div className="mt-1.5 space-y-1">
                  {parsed.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {parsed.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Default Text description */}
              {!parsed && reminder.description && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {reminder.description}
                </p>
              )}
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="mt-4 pt-3 border-t border-border/20 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center text-muted-foreground text-[10px] font-semibold gap-3 shrink-0">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary/75" />
                {format(dateObj, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary/75" />
                {format(dateObj, 'h:mm a')}
              </span>
            </div>

            <Badge variant="outline" className={cn("text-[9px] font-bold rounded-lg px-2 py-0.5 border shrink-0", countdown.class)}>
              {countdown.text}
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
