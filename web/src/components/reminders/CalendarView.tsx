import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reminder } from "@/types/Reminder";
import { ReminderCard } from "./ReminderCard";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarViewProps {
  reminders: Reminder[];
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (id: number, is_completed: boolean) => void;
}

export function CalendarView({ reminders, onEdit, onDelete, onToggleComplete }: CalendarViewProps) {
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

  const getRemindersForDate = (date: Date) => {
    return reminders.filter(r => isSameDay(new Date(r.reminder_date), date));
  };

  const selectedReminders = getRemindersForDate(selectedDate).sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
  });

  const getTypeColor = (type: string, isCompleted: boolean) => {
    if (isCompleted) return "bg-gray-500/80 text-white";
    switch (type.toLowerCase()) {
      case "meeting": return "bg-blue-500 text-white";
      case "assignment": return "bg-purple-500 text-white";
      case "medicine": return "bg-emerald-500 text-white";
      case "birthday": return "bg-pink-500 text-white";
      case "task": return "bg-green-500 text-white";
      case "event": return "bg-blue-400 text-white";
      case "reminder": return "bg-orange-500 text-white";
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
            const dayReminders = getRemindersForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[80px] p-1 border rounded-lg cursor-pointer transition-all flex flex-col overflow-hidden",
                  !isCurrentMonth && "opacity-40 bg-muted/30",
                  isSelected ? "border-primary bg-primary/5 shadow-[0_0_10px_rgba(124,77,255,0.2)]" : "border-border/50 hover:border-border hover:bg-muted/30",
                  isToday(day) && !isSelected && "border-primary/50"
                )}
              >
                <div className={cn(
                  "text-right text-sm p-1 font-medium",
                  isToday(day) && "text-primary font-bold",
                  isSelected && "text-primary font-bold"
                )}>
                  {format(day, "d")}
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 mt-1">
                  {dayReminders.slice(0, 3).map(r => {
                    const isOverdue = new Date(r.reminder_date) < new Date() && !r.is_completed && !isToday(day);
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "text-[10px] truncate px-1.5 py-0.5 rounded-sm font-medium",
                          isOverdue ? "bg-red-500 text-white" : getTypeColor(r.type, r.is_completed)
                        )}
                      >
                        {format(new Date(r.reminder_date), "HH:mm")} {r.title}
                      </div>
                    );
                  })}
                  {dayReminders.length > 3 && (
                    <div className="text-[10px] text-center text-muted-foreground font-medium">
                      +{dayReminders.length - 3} more
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
            {isToday(selectedDate) && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">Today</span>}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedReminders.length} reminder{selectedReminders.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          <AnimatePresence mode="popLayout">
            {selectedReminders.map(reminder => (
              <motion.div
                key={reminder.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <ReminderCard
                  reminder={reminder}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleComplete={onToggleComplete}
                />
              </motion.div>
            ))}
            {selectedReminders.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-8 text-muted-foreground border border-border border-dashed rounded-xl"
              >
                No reminders for this date
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
