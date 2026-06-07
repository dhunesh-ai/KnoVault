"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, isPast, addYears } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SpecialDay } from "@/types/SpecialDay";
import { SpecialDayCard } from "./SpecialDayCard";
import { motion, AnimatePresence } from "framer-motion";

interface SpecialDaysCalendarViewProps {
  specialDays: SpecialDay[];
  onViewProfile: (day: SpecialDay) => void;
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

export function SpecialDaysCalendarView({ specialDays, onViewProfile, onEdit, onDelete }: SpecialDaysCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getEventsForDate = (date: Date) => {
    return specialDays.filter(sd => isSameDay(getNextOccurrence(sd), date));
  };

  const selectedEvents = getEventsForDate(selectedDate);

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "birthday": return "bg-pink-500 text-white";
      case "anniversary": 
      case "wedding": return "bg-rose-500 text-white";
      case "engagement": return "bg-purple-500 text-white";
      case "graduation": return "bg-blue-500 text-white";
      default: return "bg-orange-500 text-white";
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[500px]">
      <div className="flex-1 bg-card border border-border rounded-xl p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="h-8">Today</Button>
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center font-medium text-sm text-muted-foreground mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
          {dateRange.map((day, i) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[80px] p-1 border rounded-lg cursor-pointer transition-all flex flex-col overflow-hidden",
                  !isCurrentMonth && "opacity-40 bg-muted/30",
                  isSelected ? "border-primary bg-primary/5 shadow-[0_0_10px_rgba(219,39,119,0.2)]" : "border-border/50 hover:border-border hover:bg-muted/30",
                  isToday(day) && !isSelected && "border-pink-500/50"
                )}
              >
                <div className={cn(
                  "text-right text-sm p-1 font-medium",
                  isToday(day) && "text-pink-500 font-bold",
                  isSelected && "text-primary font-bold"
                )}>
                  {format(day, "d")}
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 mt-1">
                  {dayEvents.slice(0, 3).map(e => (
                    <div
                      key={e.id}
                      className={cn(
                        "text-[10px] truncate px-1.5 py-0.5 rounded-sm font-medium",
                        getTypeColor(e.type)
                      )}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-center text-muted-foreground font-medium">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full xl:w-96 flex flex-col gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-lg flex items-center justify-between">
            <span>{format(selectedDate, "MMM d, yyyy")}</span>
            {isToday(selectedDate) && <span className="text-xs bg-pink-500/10 text-pink-500 px-2 py-1 rounded-md">Today</span>}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          <AnimatePresence mode="popLayout">
            {selectedEvents.map(event => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-[180px]"
              >
                <SpecialDayCard
                  specialDay={event}
                  onClick={onViewProfile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </motion.div>
            ))}
            {selectedEvents.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-8 text-muted-foreground border border-border border-dashed rounded-xl"
              >
                No celebrations for this date
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
