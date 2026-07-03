/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  StickyNote, 
  Bell, 
  Pill, 
  Gift, 
  Target, 
  Activity,
  ArrowRight,
  Plus
} from "lucide-react";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { ReminderEditor } from "@/components/reminders/ReminderEditor";
import { useCalendarNotesStore } from "@/store/useCalendarNotesStore";
import { CalendarNoteEditor } from "@/components/calendar-notes/CalendarNoteEditor";
import { toast } from "sonner";

interface DashboardStats {
  totalNotes: number;
  activeReminders: number;
  medicinesToday: number;
  upcomingSpecialDays: number;
  activeGoals: number;
  goalProgress: number; // average progress
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { todayNotes, fetchTodayCalendarNotes, deleteCalendarNote } = useCalendarNotesStore();
  const [calendarNoteEditorOpen, setCalendarNoteEditorOpen] = useState(false);
  const [selectedCalendarNote, setSelectedCalendarNote] = useState<any>(null);

  // Modals state
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [reminderEditorOpen, setReminderEditorOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Using Promise.all to fetch data concurrently from existing endpoints
        const [
          notesRes,
          remindersRes,
          projectsRes,
          goalsRes,
          specialDaysRes
        ] = await Promise.all([
          api.get('/api/notes').catch(() => ({ data: [] })),
          api.get('/api/reminders').catch(() => ({ data: [] })),
          api.get('/api/projects').catch(() => ({ data: [] })),
          api.get('/api/goals').catch(() => ({ data: [] })),
          api.get('/api/special-days').catch(() => ({ data: [] })),
          fetchTodayCalendarNotes().catch(() => null)
        ]);

        const notes = notesRes.data || [];
        const reminders = remindersRes.data || [];
        const projects = projectsRes.data || [];
        const goals = goalsRes.data || [];
        const specialDays = specialDaysRes.data || [];

        // Calculate stats based on fetched data
        const activeReminders = reminders.filter((r: any) => !r.is_completed && r.reminder_type !== 'medicine');
        const medicinesToday = reminders.filter((r: any) => r.reminder_type === 'medicine' && !r.is_completed); // Assuming medicine is a type of reminder based on typical mobile implementation
        const activeProjects = projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress');
        
        const totalGoalProgress = goals.reduce((acc: number, goal: any) => acc + (goal.progress || 0), 0);
        const avgGoalProgress = goals.length > 0 ? Math.round(totalGoalProgress / goals.length) : 0;

        setStats({
          totalNotes: notes.length,
          activeReminders: activeReminders.length,
          medicinesToday: medicinesToday.length,
          upcomingSpecialDays: specialDays.length,
          activeGoals: activeProjects.length,
          goalProgress: avgGoalProgress,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { title: "Total Notes", value: stats?.totalNotes, icon: StickyNote, color: "text-blue-400", bg: "bg-blue-400/10", link: "/notes" },
    { title: "Active Reminders", value: stats?.activeReminders, icon: Bell, color: "text-amber-400", bg: "bg-amber-400/10", link: "/reminders" },
    { title: "Medicines Today", value: stats?.medicinesToday, icon: Pill, color: "text-emerald-400", bg: "bg-emerald-400/10", link: "/medicine" },
    { title: "Special Days", value: stats?.upcomingSpecialDays, icon: Gift, color: "text-pink-400", bg: "bg-pink-400/10", link: "/special-days" },
    { title: "Active Goals", value: stats?.activeGoals, icon: Target, color: "text-purple-400", bg: "bg-purple-400/10", link: "/goals" },
    { title: "Avg Goal Progress", value: stats?.goalProgress !== undefined ? `${stats.goalProgress}%` : undefined, icon: Activity, color: "text-primary", bg: "bg-primary/10", link: "/goals" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">Here is what is happening in your vault today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setNoteEditorOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(124,77,255,0.4)]">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
          <Button onClick={() => setReminderEditorOpen(true)} variant="outline" className="border-border hover:bg-accent text-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Reminder
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Link href={stat.link}>
              <Card className="bg-card backdrop-blur-sm border-border hover:border-primary/30 transition-all duration-300 cursor-pointer h-full group overflow-hidden relative shadow-sm hover:shadow-md">
                <div className={`absolute top-0 left-0 w-full h-1 ${stat.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16 bg-muted" />
                  ) : (
                    <div className="text-2xl font-bold text-foreground group-hover:scale-105 transition-transform origin-left">
                      {stat.value !== undefined ? stat.value : '-'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Activity & Quick Access */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card backdrop-blur-sm border-border h-[400px] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground">Recent Notes</CardTitle>
              <Link href="/notes">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-lg bg-muted">
                      <Skeleton className="h-5 w-3/4 bg-border" />
                      <Skeleton className="h-4 w-1/2 bg-border" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <StickyNote className="w-12 h-12 mb-4 opacity-20" />
                  <p>No recent notes found.</p>
                  <Button variant="link" className="text-primary mt-2" onClick={() => setNoteEditorOpen(true)}>Create your first note</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="bg-card backdrop-blur-sm border-border h-[400px] shadow-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">Today's Notes</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedCalendarNote(null);
                  setCalendarNoteEditorOpen(true);
                }}
                className="text-primary hover:text-primary/80 hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Note
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto scrollbar-hide">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-lg bg-muted">
                      <Skeleton className="h-5 w-3/4 bg-border" />
                      <Skeleton className="h-4 w-1/2 bg-border" />
                    </div>
                  ))}
                </div>
              ) : todayNotes && todayNotes.length > 0 ? (
                <div className="space-y-3">
                  {todayNotes.map((note) => (
                    <div 
                      key={note.id} 
                      className="p-3 rounded-lg bg-card/50 border border-border/60 hover:border-primary/30 transition-all group flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span 
                          onClick={() => {
                            setSelectedCalendarNote(note);
                            setCalendarNoteEditorOpen(true);
                          }}
                          className="font-medium text-foreground cursor-pointer hover:underline line-clamp-1 flex-1"
                        >
                          {note.title}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-7 h-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedCalendarNote(note);
                              setCalendarNoteEditorOpen(true);
                            }}
                          >
                            <span className="sr-only">Edit</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-7 h-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this note?")) {
                                try {
                                  await deleteCalendarNote(note.id);
                                  toast.success("Note deleted successfully");
                                } catch (e) {
                                  toast.error("Failed to delete note");
                                }
                              }
                            }}
                          >
                            <span className="sr-only">Delete</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                      {note.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2 pr-2">
                          {note.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-muted-foreground text-center p-4">
                  <StickyNote className="w-10 h-10 mb-3 opacity-20 text-primary" />
                  <p className="text-sm">No notes attached to today's date.</p>
                  <Button 
                    variant="link" 
                    className="text-primary mt-1 text-sm p-0 h-auto" 
                    onClick={() => {
                      setSelectedCalendarNote(null);
                      setCalendarNoteEditorOpen(true);
                    }}
                  >
                    Add Today's Note
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card backdrop-blur-sm border-border h-[400px] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground">Upcoming Tasks</CardTitle>
              <Link href="/reminders">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted">
                      <Skeleton className="h-8 w-8 rounded-full bg-border" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full bg-border" />
                        <Skeleton className="h-3 w-24 bg-border" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Bell className="w-12 h-12 mb-4 opacity-20" />
                  <p>You are all caught up!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <NoteEditor open={noteEditorOpen} onOpenChange={setNoteEditorOpen} note={null} />
      <ReminderEditor open={reminderEditorOpen} onOpenChange={setReminderEditorOpen} reminder={null} />
      <CalendarNoteEditor 
        open={calendarNoteEditorOpen} 
        onOpenChange={setCalendarNoteEditorOpen} 
        note={selectedCalendarNote} 
      />
    </div>
  );
}
