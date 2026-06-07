/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRemindersStore } from "@/store/useRemindersStore";
import { ReminderCard } from "@/components/reminders/ReminderCard";
import { ReminderEditor } from "@/components/reminders/ReminderEditor";
import { CalendarView } from "@/components/reminders/CalendarView";
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

  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
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
    setEditingReminder(null);
    setEditorOpen(true);
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditorOpen(true);
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
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Reminders</h1>
          <p className="text-muted-foreground mt-1">Never miss an important event or task.</p>
        </div>
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-foreground shadow-[0_0_15px_rgba(124,77,255,0.4)]">
          <Plus className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
          <TabsList className="bg-card border border-border p-1 shrink-0 flex w-full md:w-auto">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-foreground flex-1 md:flex-none">All</TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-amber-500 data-[state=active]:text-foreground flex-1 md:flex-none">Today</TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-blue-500 data-[state=active]:text-foreground flex-1 md:flex-none">Upcoming</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-red-500 data-[state=active]:text-foreground flex-1 md:flex-none">Overdue</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-foreground flex-1 md:flex-none">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 bg-card p-1 rounded-lg border border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={cn("w-8 h-8", viewMode === "grid" ? "bg-accent text-foreground" : "text-muted-foreground")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            className={cn("w-8 h-8", viewMode === "list" ? "bg-accent text-foreground" : "text-muted-foreground")}
          >
            <ListIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("calendar")}
            className={cn("w-8 h-8", viewMode === "calendar" ? "bg-accent text-foreground" : "text-muted-foreground")}
          >
            <CalendarIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
            <Bell className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-medium text-foreground mb-2">No reminders found</h3>
            <p className="max-w-xs">You don't have any reminders matching this filter.</p>
            <Button variant="link" className="text-primary mt-2" onClick={handleCreate}>
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
              "gap-4 pb-16",
              viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col space-y-3"
            )}
          >
            <AnimatePresence>
              {sortedReminders.map((reminder) => (
                <motion.div
                  key={reminder.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    viewMode === "grid" ? "h-[160px]" : ""
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

      <ReminderEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        reminder={editingReminder}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This reminder will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
