"use client";

import { SpecialDay } from "@/types/SpecialDay";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Heart, GraduationCap, PartyPopper, CalendarDays, MoreVertical, Trash2, Edit2, CalendarHeart } from "lucide-react";
import { format, differenceInYears, isToday, addYears, isPast, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface SpecialDayCardProps {
  specialDay: SpecialDay;
  onClick: (day: SpecialDay) => void;
  onEdit: (day: SpecialDay) => void;
  onDelete: (id: number) => void;
}

const getNextOccurrence = (specialDay: SpecialDay) => {
  const originalDate = new Date(specialDay.date);
  if (!specialDay.is_recurring) return originalDate;

  const today = new Date();
  let nextDate = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
  
  if (isPast(nextDate) && !isToday(nextDate)) {
    nextDate = addYears(nextDate, 1);
  }
  return nextDate;
};

export function SpecialDayCard({ specialDay, onClick, onEdit, onDelete }: SpecialDayCardProps) {
  const type = specialDay.type.toLowerCase();
  
  const getTheme = () => {
    switch (type) {
      case "birthday": return { gradient: "from-pink-500 to-rose-400", bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-500", icon: <PartyPopper className="w-6 h-6 text-white" /> };
      case "anniversary":
      case "wedding": return { gradient: "from-rose-500 to-red-400", bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-500", icon: <Heart className="w-6 h-6 text-white" /> };
      case "engagement": return { gradient: "from-purple-500 to-indigo-400", bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-500", icon: <CalendarHeart className="w-6 h-6 text-white" /> };
      case "graduation": return { gradient: "from-blue-500 to-cyan-400", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-500", icon: <GraduationCap className="w-6 h-6 text-white" /> };
      default: return { gradient: "from-orange-500 to-amber-400", bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-500", icon: <Gift className="w-6 h-6 text-white" /> };
    }
  };

  const theme = getTheme();
  const nextDate = getNextOccurrence(specialDay);
  const daysLeft = differenceInDays(nextDate, new Date());
  const isHappeningToday = daysLeft === 0;
  
  const getAgeOrYearsText = () => {
    if (!specialDay.is_recurring) return null;
    const originalDate = new Date(specialDay.date);
    const years = differenceInYears(nextDate, originalDate);
    if (years <= 0) return null;

    if (type === "birthday") return `Turning ${years}`;
    if (type === "anniversary" || type === "wedding") return `${years}th Anniversary`;
    if (type === "engagement") return `${years} Years`;
    return `${years} Years`;
  };

  const ageText = getAgeOrYearsText();

  return (
    <Card 
      onClick={() => onClick(specialDay)}
      className={cn(
        "bg-card/50 backdrop-blur-md transition-all duration-300 group relative flex flex-col h-full cursor-pointer overflow-hidden border",
        isHappeningToday ? `border-transparent shadow-[0_0_15px_rgba(var(--${theme.text.split('-')[1]}-500),0.3)]` : theme.border,
        "hover:shadow-md hover:border-transparent"
      )}
    >
      {/* Dynamic Background Hover Effect */}
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br", theme.gradient)} />
      
      {isHappeningToday && (
        <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", theme.gradient)} />
      )}
      
      <CardContent className="p-5 flex flex-col h-full relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br", theme.gradient)}>
              {theme.icon}
            </div>
            <div>
              <Badge variant="outline" className={cn("uppercase text-[10px] font-bold tracking-wider mb-1 border", theme.bg, theme.text, theme.border)}>
                {specialDay.custom_type || specialDay.type}
              </Badge>
              <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-1">
                {specialDay.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={() => onEdit(specialDay)} className="cursor-pointer">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(specialDay.id)} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(nextDate, 'MMMM do')}
            </span>
            {ageText && (
              <span className={cn("text-xs font-semibold mt-0.5", theme.text)}>
                {ageText}
              </span>
            )}
          </div>
          
          <div className="text-right">
            {isHappeningToday ? (
              <span className={cn("text-sm font-black animate-pulse bg-clip-text text-transparent bg-gradient-to-r", theme.gradient)}>
                TODAY!
              </span>
            ) : (
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-foreground leading-none">
                  {daysLeft}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
                  Days Left
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
