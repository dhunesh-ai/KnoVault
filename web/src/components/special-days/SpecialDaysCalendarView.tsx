"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SpecialDay } from "@/types/SpecialDay";
import { SpecialDayCard } from "./SpecialDayCard";
import { motion, AnimatePresence } from "framer-motion";
import { getCategoryMeta, isEventOnDate } from "@/lib/special-days-utils";

interface SpecialDaysCalendarViewProps {
  specialDays: SpecialDay[];
  onViewProfile: (day: SpecialDay) => void;
  onEdit: (day: SpecialDay) => void;
  onDelete: (id: number) => void;
}

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
    return specialDays.filter((sd) => isEventOnDate(sd, date));
  };

  const selectedEvents = getEventsForDate(selectedDate);

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[600px]">
      
      {/* CALENDAR MAIN GRID */}
      <div className="flex-1 bg-card/80 backdrop-blur-xl border border-border/60 rounded-3xl p-6 flex flex-col h-full overflow-hidden shadow-sm">
        
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-purple-500" />
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="h-9 rounded-xl border-border/60 font-black text-xs px-3">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center font-black text-xs uppercase tracking-wider text-muted-foreground mb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-2 flex-1 min-h-0">
          {dateRange.map((day, i) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[90px] p-2 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative group",
                  !isCurrentMonth && "opacity-35 bg-muted/20",
                  isSelected
                    ? "border-purple-600 bg-purple-600/10 shadow-[0_0_16px_rgba(124,77,255,0.25)] ring-2 ring-purple-500/50"
                    : "border-border/50 bg-background hover:border-purple-400/50 hover:bg-purple-500/5",
                  isTodayDate && !isSelected && "border-pink-500/60 bg-pink-500/10 font-bold"
                )}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between">
                  {dayEvents.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {dayEvents.slice(0, 3).map((e) => {
                        const meta = getCategoryMeta(e.type);
                        return (
                          <span
                            key={e.id}
                            className={cn("w-2 h-2 rounded-full", meta.text.includes("amber") ? "bg-amber-500" : meta.text.includes("rose") ? "bg-rose-500" : meta.text.includes("sky") ? "bg-sky-500" : meta.text.includes("orange") ? "bg-orange-500" : meta.text.includes("blue") ? "bg-blue-500" : meta.text.includes("purple") ? "bg-purple-500" : "bg-emerald-500")}
                          />
                        );
                      })}
                    </div>
                  ) : <div />}

                  <span
                    className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded-md text-right",
                      isTodayDate && "text-pink-600 dark:text-pink-400 font-black bg-pink-500/15 border border-pink-500/20",
                      isSelected && "text-purple-600 dark:text-purple-400 font-black"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Day Event Badges */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((e) => {
                    const meta = getCategoryMeta(e.type);
                    return (
                      <div
                        key={e.id}
                        className={cn(
                          "text-[10px] truncate px-2 py-0.5 rounded-lg font-bold text-white flex items-center gap-1 shadow-2xs",
                          meta.color ? `bg-gradient-to-r ${meta.color}` : "bg-purple-600"
                        )}
                      >
                        <span className="shrink-0">{e.emoji || meta.emoji}</span>
                        <span className="truncate font-extrabold">{e.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-center text-purple-600 dark:text-purple-400 font-black">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDE PANEL FOR SELECTED DATE */}
      <div className="w-full xl:w-[420px] flex flex-col gap-5 shrink-0">
        
        {/* Selected Date Banner */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-3xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl text-foreground flex items-center gap-2">
              <span>{format(selectedDate, "MMMM d, yyyy")}</span>
            </h3>
            {isToday(selectedDate) && (
              <span className="text-xs bg-pink-500/15 text-pink-600 dark:text-pink-400 font-black px-3 py-1 rounded-full border border-pink-500/20">
                Today 🎉
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            {selectedEvents.length} celebration{selectedEvents.length !== 1 ? "s" : ""} on this date
          </p>
        </div>

        {/* Selected Date Events List */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-6">
          <AnimatePresence mode="popLayout">
            {selectedEvents.map((event) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="min-h-[260px] flex flex-col"
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
                className="text-center p-10 text-muted-foreground border border-border/60 border-dashed rounded-3xl bg-card/40 space-y-2"
              >
                <span className="text-3xl block mb-2">📅</span>
                <h4 className="font-black text-foreground text-sm">No Celebrations Scheduled</h4>
                <p className="text-xs text-muted-foreground">
                  There are no birthdays, anniversaries, or festivals set for {format(selectedDate, "MMM d")}.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
