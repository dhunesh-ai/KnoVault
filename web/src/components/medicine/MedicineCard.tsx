"use client";

import { MedicineCourse } from "@/types/Medicine";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Activity, CheckCircle2, Clock, CalendarDays, MoreVertical, Trash2, ArrowRight } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface MedicineCardProps {
  course: MedicineCourse;
  onDelete: (seriesId: string) => void;
}

export function MedicineCard({ course, onDelete }: MedicineCardProps) {
  const percentComplete = course.totalDoses > 0 ? Math.round((course.completedDoses / course.totalDoses) * 100) : 0;
  const isFinished = percentComplete === 100;
  
  const getNextDoseColor = () => {
    if (!course.nextDose) return "text-muted-foreground bg-muted";
    const dateObj = new Date(course.nextDose.date);
    if (isPast(dateObj) && !isToday(dateObj)) return "text-red-400 bg-red-400/10 border-red-400/20";
    if (isToday(dateObj)) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  };

  return (
    <Card className={cn(
      "bg-card backdrop-blur-sm border-border hover:border-border transition-all duration-300 group flex flex-col h-full",
      isFinished && "opacity-70 grayscale-[0.3]"
    )}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
            <Pill className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="font-semibold text-foreground truncate text-base">
              {course.medName}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 truncate flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {course.dosage} • {course.medType}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onDelete(course.series_id)} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 mt-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-accent text-foreground border-border text-[10px] uppercase font-semibold">
              {course.foodTiming}
            </Badge>
            <Badge variant="outline" className={cn("text-foreground border-border text-[10px] uppercase font-semibold", isFinished ? "bg-accent" : "bg-blue-500/20 text-blue-400 border-blue-500/30")}>
              {course.remainingDays} Days Left
            </Badge>
            {!isFinished && course.remainingDosesToday > 0 && (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] uppercase font-semibold">
                {course.remainingDosesToday} Doses Today
              </Badge>
            )}
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Progress</span>
              <span>{percentComplete}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{course.completedDoses} / {course.totalDoses} doses</span>
              {isFinished && <span className="text-emerald-500 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</span>}
            </div>
          </div>
          
          {!isFinished && course.nextDose && (
            <div className={cn("p-2 rounded-lg border text-xs font-medium flex items-center justify-between", getNextDoseColor())}>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Next: {course.nextDose.timing}</span>
              </div>
              <span>{format(new Date(course.nextDose.date), 'h:mm a')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
