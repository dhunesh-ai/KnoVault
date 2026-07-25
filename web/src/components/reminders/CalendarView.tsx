"use client";

import { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, FileText, Calendar as CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reminder } from "@/types/Reminder";
import { CalendarNote } from "@/types/CalendarNote";
import { ReminderCard } from "./ReminderCard";
import { CalendarNoteCard } from "./CalendarNoteCard";
import { CalendarNoteModal } from "./CalendarNoteModal";
import { useCalendarNotesStore } from "@/store/useCalendarNotesStore";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarViewProps {
  reminders: Reminder[];
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (id: number, is_completed: boolean) => void;
}

export function CalendarView({
  reminders,
  onEdit,
  onDelete,
  onToggleComplete,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null);

  const { calendarNotes, fetchCalendarNotes } = useCalendarNotesStore();

  useEffect(() => {
    fetchCalendarNotes({ month: format(currentDate, "yyyy-MM") });
  }, [currentDate, fetchCalendarNotes]);

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

  const handleAddNote = (date?: Date) => {
    setEditingNote(null);
    if (date) setSelectedDate(date);
    setNoteModalOpen(true);
  };

  const handleEditNote = (note: CalendarNote) => {
    setEditingNote(note);
    setNoteModalOpen(true);
  };

  const getRemindersForDate = (date: Date) => {
    return reminders.filter((r) => isSameDay(new Date(r.reminder_date), date));
  };

  const getNotesForDate = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    return calendarNotes.filter((n) => n.note_date === formatted);
  };

  const selectedReminders = useMemo(() => {
    return getRemindersForDate(selectedDate).sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
    });
  }, [reminders, selectedDate]);

  const selectedNotes = useMemo(() => {
    return getNotesForDate(selectedDate);
  }, [calendarNotes, selectedDate]);

  const getTypeColor = (type: string, isCompleted: boolean) => {
    if (isCompleted) return "#9CA3AF";
    switch (type.toLowerCase()) {
      case "meeting":
        return "#3B82F6";
      case "assignment":
        return "#8B5CF6";
      case "medicine":
        return "#10B981";
      case "birthday":
        return "#EC4899";
      case "task":
        return "#10B981";
      case "event":
        return "#60A5FA";
      default:
        return "#F59E0B";
    }
  };

  const totalSelectedEvents = selectedReminders.length + selectedNotes.length;

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[500px]">
      {/* Calendar Grid Container */}
      <div className="flex-1 bg-card/80 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col h-full overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-foreground">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <Button
              onClick={() => handleAddNote(selectedDate)}
              className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl h-8 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-none transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>+ Note</span>
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 rounded-xl text-xs font-bold border-border/40 hover:bg-accent/40"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="h-8 w-8 rounded-xl hover:bg-accent/40"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8 rounded-xl hover:bg-accent/40"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground/80 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0">
          {dateRange.map((day, i) => {
            const dayReminders = getRemindersForDate(day);
            const dayNotes = getNotesForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);

            // Compute colored indicator dots
            const reminderDots = dayReminders.map((r) => ({
              id: `r-${r.id}`,
              color: getTypeColor(r.type, r.is_completed),
            }));
            const noteDots = dayNotes.map((n) => ({
              id: `n-${n.id}`,
              color: n.color || "#6D4CFF",
            }));
            const allDots = [...noteDots, ...reminderDots];

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[85px] p-1.5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative group",
                  !isCurrentMonth && "opacity-35 bg-muted/20",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-[0_0_16px_rgba(124,77,255,0.15)] ring-2 ring-primary/30"
                    : "border-border/30 hover:border-primary/30 hover:bg-muted/30",
                  isToday(day) && !isSelected && "border-primary/50 bg-primary/5 font-bold"
                )}
              >
                {/* Date Number Header */}
                <div className="flex items-center justify-between">
                  {dayNotes.length > 0 && (
                    <span className="text-[9px] font-extrabold text-primary bg-primary/15 px-1.5 py-0.5 rounded-md">
                      📝 {dayNotes.length}
                    </span>
                  )}
                  <div
                    className={cn(
                      "text-xs font-extrabold ml-auto px-1.5 py-0.5 rounded-md transition-colors",
                      isToday(day) && "bg-primary text-white font-black shadow-sm",
                      isSelected && !isToday(day) && "text-primary font-black"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>

                {/* Day Previews / List */}
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-0.5 my-1">
                  {/* Notes previews */}
                  {dayNotes.slice(0, 1).map((n) => (
                    <div
                      key={`n-${n.id}`}
                      className="text-[9.5px] truncate px-1.5 py-0.5 rounded-md font-bold text-white shadow-xs"
                      style={{ backgroundColor: n.color || "#6D4CFF" }}
                    >
                      📄 {n.title}
                    </div>
                  ))}
                  {/* Reminders previews */}
                  {dayReminders.slice(0, 2).map((r) => {
                    const isOverdue =
                      new Date(r.reminder_date) < new Date() &&
                      !r.is_completed &&
                      !isToday(day);
                    return (
                      <div
                        key={`r-${r.id}`}
                        className={cn(
                          "text-[9.5px] truncate px-1.5 py-0.5 rounded-md font-medium text-white shadow-xs",
                          isOverdue && "bg-red-500"
                        )}
                        style={
                          !isOverdue
                            ? { backgroundColor: getTypeColor(r.type, r.is_completed) }
                            : undefined
                        }
                      >
                        {r.title}
                      </div>
                    );
                  })}
                </div>

                {/* Colored Dots Indicator Bar */}
                {allDots.length > 0 && (
                  <div className="flex items-center gap-1 justify-end px-1 pt-0.5 shrink-0">
                    {allDots.slice(0, 4).map((dot) => (
                      <span
                        key={dot.id}
                        className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: dot.color }}
                      />
                    ))}
                    {allDots.length > 4 && (
                      <span className="text-[9px] font-extrabold text-muted-foreground">
                        +{allDots.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Panel */}
      <div className="w-full xl:w-96 flex flex-col gap-4">
        <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2 text-foreground">
              <span>{format(selectedDate, "MMM d, yyyy")}</span>
              {isToday(selectedDate) && (
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                  Today
                </span>
              )}
            </h3>
            <p className="text-xs font-semibold text-muted-foreground mt-1 flex items-center gap-2">
              <span>
                {totalSelectedEvents} Event{totalSelectedEvents !== 1 ? "s" : ""}
              </span>
              {selectedNotes.length > 0 && (
                <span className="text-primary font-bold">
                  • {selectedNotes.length} Note{selectedNotes.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={() => handleAddNote(selectedDate)}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-2xl h-9 px-3.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Note</span>
          </Button>
        </div>

        {/* Selected Day Items Stream */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pb-4 scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {/* Render Calendar Notes first */}
            {selectedNotes.map((note) => (
              <motion.div
                key={`cn-${note.id}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <CalendarNoteCard note={note} onClick={handleEditNote} />
              </motion.div>
            ))}

            {/* Render Reminders second */}
            {selectedReminders.map((reminder) => (
              <motion.div
                key={`rm-${reminder.id}`}
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

            {/* Professional Empty State */}
            {totalSelectedEvents === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center p-8 text-center bg-card/60 backdrop-blur-md border border-border/40 border-dashed rounded-3xl"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-foreground mb-1">
                  No events scheduled for this day
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs font-medium mb-4">
                  Keep track of your day with reminders and notes.
                </p>
                <Button
                  onClick={() => handleAddNote(selectedDate)}
                  className="bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold px-4 h-9 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Add Note</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Calendar Note Modal */}
      <CalendarNoteModal
        open={noteModalOpen}
        onOpenChange={setNoteModalOpen}
        note={editingNote}
        defaultDate={selectedDate}
      />
    </div>
  );
}
