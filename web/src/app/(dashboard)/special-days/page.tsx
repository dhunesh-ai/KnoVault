"use client";

import { useEffect, useState, useMemo } from "react";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
import { SpecialDayCard } from "@/components/special-days/SpecialDayCard";
import { SpecialDayEditor } from "@/components/special-days/SpecialDayEditor";
import { SpecialDayProfile } from "@/components/special-days/SpecialDayProfile";
import { SpecialDay } from "@/types/SpecialDay";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, PartyPopper, CalendarDays, Gift, Heart, CalendarIcon, LayoutGrid, Trophy, Star } from "lucide-react";
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
import { format, isPast, isToday, addYears, differenceInDays, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { SpecialDaysCalendarView } from "@/components/special-days/SpecialDaysCalendarView";

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

export default function SpecialDaysPage() {
  const {
    specialDays,
    isLoading,
    fetchSpecialDays,
    deleteSpecialDay,
  } = useSpecialDaysStore();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SpecialDay | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SpecialDay | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchSpecialDays();
  }, [fetchSpecialDays]);

  useEffect(() => {
    if (selectedEvent && specialDays.length > 0) {
      const updated = specialDays.find(sd => sd.id === selectedEvent.id);
      if (updated) setSelectedEvent(updated);
    }
  }, [specialDays, selectedEvent]);

  // Enhanced sorting and metadata
  const sortedEvents = useMemo(() => {
    return [...specialDays].map(sd => ({
      ...sd,
      nextDate: getNextOccurrence(sd),
      daysLeft: differenceInDays(getNextOccurrence(sd), new Date())
    })).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [specialDays]);

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter(sd => {
      const isBirthday = sd.type.toLowerCase() === "birthday";
      const isAnniversary = sd.type.toLowerCase() === "anniversary" || sd.type.toLowerCase() === "wedding";
      const isMilestone = sd.type.toLowerCase() === "engagement";
      const isAchievement = sd.type.toLowerCase() === "graduation";
      
      const thisMonth = sd.nextDate.getMonth() === new Date().getMonth();

      switch (activeTab) {
        case "birthdays": return isBirthday;
        case "anniversaries": return isAnniversary;
        case "milestones": return isMilestone || isAchievement;
        case "upcoming": return sd.daysLeft <= 30;
        case "this_month": return thisMonth;
        default: return true; // all
      }
    });
  }, [sortedEvents, activeTab]);

  const stats = useMemo(() => {
    const thisMonth = sortedEvents.filter(sd => sd.nextDate.getMonth() === new Date().getMonth()).length;
    const nextEvent = sortedEvents[0];
    return {
      total: sortedEvents.length,
      thisMonth,
      nextEvent
    };
  }, [sortedEvents]);

  const handleCreate = () => {
    setEditingEvent(null);
    setEditorOpen(true);
  };

  const handleEdit = (event: SpecialDay) => {
    setEditingEvent(event);
    setEditorOpen(true);
    setProfileOpen(false);
  };

  const handleViewProfile = (event: SpecialDay) => {
    setSelectedEvent(event);
    setProfileOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteSpecialDay(deleteId);
        toast.success("Event deleted");
        if (selectedEvent?.id === deleteId) setProfileOpen(false);
      } catch (e) { } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            🎉 Special Days
          </h1>
          <p className="text-muted-foreground mt-1">Track birthdays, anniversaries, milestones, and important celebrations.</p>
        </div>
        <Button onClick={handleCreate} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-[0_0_20px_rgba(219,39,119,0.3)] border-0">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Stats Dashboard */}
      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming This Month</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-pink-500/20 to-transparent rounded-bl-full pointer-events-none" />
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <p className="text-sm font-medium text-muted-foreground mb-1">Next Celebration</p>
              {stats.nextEvent ? (
                <div>
                  <p className="text-lg font-bold truncate pr-4">{stats.nextEvent.title}</p>
                  <p className="text-sm text-pink-500 font-medium">In {stats.nextEvent.daysLeft} Days</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Card for Next Celebration */}
      {!isLoading && stats.nextEvent && activeTab === "all" && viewMode === "grid" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0"
        >
          <div className="bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-background border border-pink-500/20 rounded-2xl p-6 relative overflow-hidden group cursor-pointer" onClick={() => handleViewProfile(stats.nextEvent!)}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-pink-500/30 to-purple-500/30 blur-3xl rounded-full" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 p-[2px] shadow-lg">
                  <div className="w-full h-full bg-card rounded-2xl flex items-center justify-center">
                    <PartyPopper className="w-8 h-8 text-pink-500" />
                  </div>
                </div>
                <div>
                  <Badge variant="outline" className="bg-pink-500/10 text-pink-500 border-pink-500/20 mb-2 uppercase text-[10px] tracking-wider">Up Next</Badge>
                  <h2 className="text-2xl font-bold text-foreground">{stats.nextEvent.title}</h2>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <CalendarDays className="w-4 h-4" />
                    {format(stats.nextEvent.nextDate, "MMMM do, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center md:text-right">
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">
                    {stats.nextEvent.daysLeft === 0 ? "TODAY" : stats.nextEvent.daysLeft}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">
                    {stats.nextEvent.daysLeft === 0 ? "CELEBRATE!" : "Days Left"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filter Tabs & Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
          <TabsList className="bg-card border border-border p-1 shrink-0 flex w-full md:w-auto">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary flex-1 md:flex-none">All Events</TabsTrigger>
            <TabsTrigger value="birthdays" className="data-[state=active]:bg-pink-500 flex-1 md:flex-none">Birthdays</TabsTrigger>
            <TabsTrigger value="anniversaries" className="data-[state=active]:bg-rose-500 flex-1 md:flex-none">Anniversaries</TabsTrigger>
            <TabsTrigger value="milestones" className="data-[state=active]:bg-purple-500 flex-1 md:flex-none">Milestones</TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-blue-500 flex-1 md:flex-none">Upcoming</TabsTrigger>
            <TabsTrigger value="this_month" className="data-[state=active]:bg-emerald-500 flex-1 md:flex-none">This Month</TabsTrigger>
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
            onClick={() => setViewMode("calendar")}
            className={cn("w-8 h-8", viewMode === "calendar" ? "bg-accent text-foreground" : "text-muted-foreground")}
          >
            <CalendarIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(219,39,119,0.15)]">
              <Gift className="w-12 h-12 text-pink-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No Special Days Yet</h3>
            <p className="max-w-md text-muted-foreground mb-8 text-lg">
              Start tracking birthdays, anniversaries, milestones and celebrations so you never miss an important moment.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white" onClick={handleCreate}>
              Create Your First Event
            </Button>
          </div>
        ) : viewMode === "calendar" ? (
          <div className="h-full pb-8">
            <SpecialDaysCalendarView
              specialDays={filteredEvents}
              onViewProfile={handleViewProfile}
              onEdit={handleEdit}
              onDelete={setDeleteId}
            />
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-16">
            <AnimatePresence>
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="h-[180px]"
                >
                  <SpecialDayCard
                    specialDay={event}
                    onClick={handleViewProfile}
                    onEdit={handleEdit}
                    onDelete={setDeleteId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <SpecialDayEditor open={editorOpen} onOpenChange={setEditorOpen} specialDay={editingEvent} />
      <SpecialDayProfile open={profileOpen} onOpenChange={setProfileOpen} specialDay={selectedEvent} onEdit={handleEdit} onDelete={(id) => setDeleteId(id)} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This special day and all its saved notes and ideas will be permanently deleted.
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
