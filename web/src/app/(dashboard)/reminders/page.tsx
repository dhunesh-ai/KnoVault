 
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRemindersStore } from "@/store/useRemindersStore";
import { ReminderCard } from "@/components/reminders/ReminderCard";
import { CalendarView } from "@/components/reminders/CalendarView";
import { useRouter } from "next/navigation";
import { Reminder } from "@/types/Reminder";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Bell, LayoutGrid, List as ListIcon, Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

export default function RemindersPage() {
  const {
    reminders,
    isLoading,
    fetchReminders,
    deleteReminder,
    markComplete,
  } = useRemindersStore();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder) => {
      const dateObj = new Date(reminder.reminder_date);
      const isOverdue = isPast(dateObj) && !reminder.is_completed && !isToday(dateObj);
      const isTodayRem = isToday(dateObj) && !reminder.is_completed;
      const isUpcoming = !isPast(dateObj) && !reminder.is_completed && !isToday(dateObj);

      const isMed = reminder.type === "medicine" || (reminder.description && reminder.description.includes('"isMedicine": true'));

      // If we are in Calendar view, we want to see everything that matches the tab logically, 
      // but the user requested: "Calendar View should still show future medicine reminders on their correct dates."
      // So Calendar view bypasses the medicine hiding logic.
      if (viewMode !== "calendar") {
        if (isMed) {
          if (activeTab === "all" && isUpcoming) return false; // Hide future meds from 'All'
          if (activeTab === "upcoming") return false; // Hide all meds from 'Upcoming'
        }
      }

      switch (activeTab) {
        case "today":
          return isTodayRem;
        case "upcoming":
          return isUpcoming;
        case "overdue":
          return isOverdue;
        case "completed":
          return reminder.is_completed;
        default: // "all"
          return true;
      }
    });
  }, [reminders, activeTab, viewMode]);

  // Sort: Overdue first, then today, then upcoming, completed last.
  const sortedReminders = useMemo(() => {
    return [...filteredReminders].sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
    });
  }, [filteredReminders]);

  const handleCreate = () => {
    router.push("/reminders/create");
  };

  const handleEdit = (reminder: Reminder) => {
    router.push(`/reminders/create?id=${reminder.id}`);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteReminder(deleteId);
        toast.success("Reminder deleted");
      } catch (e) {
        // error handled
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6.5rem)] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Reminders</h1>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Never miss your critical schedules, meetings, or doses.</p>
        </div>
        <Button 
          onClick={handleCreate} 
          className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-[0_4px_16px_rgba(124,77,255,0.25)] rounded-2xl h-10 px-5 font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Reminder
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
          <TabsList className="bg-card/55 border border-border/40 p-1 rounded-2xl shrink-0 flex w-full md:w-auto gap-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl text-xs font-bold flex-1 md:flex-none py-1.5 px-4 cursor-pointer">All</TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-xl text-xs font-bold flex-1 md:flex-none py-1.5 px-4 cursor-pointer">Today</TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl text-xs font-bold flex-1 md:flex-none py-1.5 px-4 cursor-pointer">Upcoming</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-red-500 data-[state=active]:text-white rounded-xl text-xs font-bold flex-1 md:flex-none py-1.5 px-4 cursor-pointer">Overdue</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl text-xs font-bold flex-1 md:flex-none py-1.5 px-4 cursor-pointer">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 self-end md:self-auto shrink-0 bg-card/60 p-1 rounded-2xl border border-border/40">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={cn("w-8.5 h-8.5 rounded-xl transition-all cursor-pointer", viewMode === "grid" ? "bg-accent/65 text-primary shadow-sm" : "text-muted-foreground hover:bg-accent/20")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            className={cn("w-8.5 h-8.5 rounded-xl transition-all cursor-pointer", viewMode === "list" ? "bg-accent/65 text-primary shadow-sm" : "text-muted-foreground hover:bg-accent/20")}
          >
            <ListIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("calendar")}
            className={cn("w-8.5 h-8.5 rounded-xl transition-all cursor-pointer", viewMode === "calendar" ? "bg-accent/65 text-primary shadow-sm" : "text-muted-foreground hover:bg-accent/20")}
          >
            <CalendarIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No reminders found</h3>
            <p className="text-xs text-muted-foreground max-w-xs">You don't have any scheduled reminder alarms setup yet.</p>
            <Button variant="link" className="text-primary mt-2 text-xs font-bold" onClick={handleCreate}>
              Create one now
            </Button>
          </div>
        ) : viewMode === "calendar" ? (
          <CalendarView
            reminders={sortedReminders}
            onEdit={handleEdit}
            onDelete={setDeleteId}
            onToggleComplete={markComplete}
          />
        ) : (
          <motion.div 
            layout
            className={cn(
              "gap-5 pb-16",
              viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col space-y-3.5"
            )}
          >
            <AnimatePresence>
              {sortedReminders.map((reminder) => (
                <motion.div
                  key={reminder.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    viewMode === "grid" ? "h-[165px]" : ""
                  )}
                >
                  <ReminderCard
                    reminder={reminder}
                    onEdit={handleEdit}
                    onDelete={setDeleteId}
                    onToggleComplete={markComplete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>



      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card/90 backdrop-blur-2xl border-border/50 text-foreground rounded-3xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-lg">Delete Reminder?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs font-medium">
              This action cannot be undone. This reminder alert and its notifications will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="bg-accent/40 border-border/40 text-foreground hover:bg-accent/60 rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs h-9 font-bold shadow-md">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
