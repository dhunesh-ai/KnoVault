/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  StickyNote, 
  Bell, 
  Pill, 
  Gift, 
  Target, 
  Activity,
  ArrowRight,
  Plus,
  Flame,
  HardDrive,
  MessageSquare,
  Sparkles,
  Sun,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { NoteEditor } from "@/components/notes/NoteEditor";

import { useCalendarNotesStore } from "@/store/useCalendarNotesStore";
import { CalendarNoteEditor } from "@/components/calendar-notes/CalendarNoteEditor";
import { useChatThreadsStore } from "@/store/useChatThreadsStore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DashboardStats {
  totalNotes: number;
  activeReminders: number;
  medicinesToday: number;
  upcomingSpecialDays: number;
  activeGoals: number;
  goalProgress: number;
  streak: number;
}

const QUOTES = [
  "Small daily improvements over time lead to stunning results.",
  "Your focus determines your reality. Start fresh, stay focused.",
  "The secret of getting ahead is getting started.",
  "Make today your masterpiece. Take it one task at a time."
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { threads } = useChatThreadsStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { todayNotes, fetchTodayCalendarNotes, deleteCalendarNote } = useCalendarNotesStore();
  const [calendarNoteEditorOpen, setCalendarNoteEditorOpen] = useState(false);
  const [selectedCalendarNote, setSelectedCalendarNote] = useState<any>(null);

  // Modals state
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);

  const [morningResetOpen, setMorningResetOpen] = useState(false);

  // Local storage usage
  const [storageUsage, setStorageUsage] = useState({ size: "0.00", percentage: 0 });
  const [motivationQuote, setMotivationQuote] = useState("");

  const calculateStorage = () => {
    if (typeof window === 'undefined') return;
    let total = 0;
    for (const x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += (localStorage[x].length + x.length) * 2;
      }
    }
    const sizeInMb = total / (1024 * 1024);
    const limit = 5.0; // 5 MB
    const percentage = Math.min(100, Math.round((sizeInMb / limit) * 100));
    setStorageUsage({
      size: sizeInMb.toFixed(2),
      percentage
    });
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch data concurrently
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

      const activeReminders = reminders.filter((r: any) => !r.is_completed && r.reminder_type !== 'medicine');
      const medicinesToday = reminders.filter((r: any) => r.reminder_type === 'medicine' && !r.is_completed);
      const activeProjects = projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress');
      
      const totalGoalProgress = goals.reduce((acc: number, goal: any) => acc + (goal.progress || 0), 0);
      const avgGoalProgress = goals.length > 0 ? Math.round(totalGoalProgress / goals.length) : 0;

      // Extract streak or fallback
      const streakVal = goals.length > 0 ? Math.max(...goals.map((g: any) => g.streak || 0), 0) : 0;

      setStats({
        totalNotes: notes.length,
        activeReminders: activeReminders.length,
        medicinesToday: medicinesToday.length,
        upcomingSpecialDays: specialDays.length,
        activeGoals: activeProjects.length,
        goalProgress: avgGoalProgress,
        streak: streakVal || 0
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasCheckedReset = useRef(false);

  useEffect(() => {
    if (!hasCheckedReset.current) {
      hasCheckedReset.current = true;
      fetchDashboardData();
      calculateStorage();
      setMotivationQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

      // Automatic Morning Reset Modal check (singleton check: only once per browser session/day)
      if (typeof window !== 'undefined') {
        const lastReset = localStorage.getItem("knovault_last_reset_date");
        const todayStr = new Date().toDateString();
        const alreadyShownThisSession = sessionStorage.getItem("knovault_morning_reset_shown_session") === "true";

        if (lastReset !== todayStr && !alreadyShownThisSession) {
          setMorningResetOpen(true);
          sessionStorage.setItem("knovault_morning_reset_shown_session", "true");
        }
      }
    }

    return () => {
      setMorningResetOpen(false);
    };
  }, []);

  const handleMorningResetComplete = async () => {
    try {
      // Clear completed status of daily items to reset checklist state
      const remindersRes = await api.get('/api/reminders');
      const medicines = (remindersRes.data || []).filter((r: any) => r.reminder_type === 'medicine' && r.is_completed);
      
      // Update each to false to reset
      await Promise.all(
        medicines.map((m: any) => api.put(`/api/reminders/${m.id}`, { is_completed: false }))
      );

      // Save reset date state
      localStorage.setItem("knovault_last_reset_date", new Date().toDateString());
      setMorningResetOpen(false);
      fetchDashboardData();
      toast.success("Morning reset complete! Have an awesome day!");
    } catch (e) {
      localStorage.setItem("knovault_last_reset_date", new Date().toDateString());
      setMorningResetOpen(false);
      toast.error("Some status items could not be reset automatically");
    }
  };

  const statCards = [
    { title: "Total Notes", value: stats?.totalNotes, icon: StickyNote, color: "text-blue-400", bg: "bg-blue-400/10", link: "/notes" },
    { title: "Active Reminders", value: stats?.activeReminders, icon: Bell, color: "text-amber-400", bg: "bg-amber-400/10", link: "/reminders" },
    { title: "Medicines Today", value: stats?.medicinesToday, icon: Pill, color: "text-emerald-400", bg: "bg-emerald-400/10", link: "/medicine" },
    { title: "Special Days", value: stats?.upcomingSpecialDays, icon: Gift, color: "text-pink-400", bg: "bg-pink-400/10", link: "/special-days" },
    { title: "Active Goals", value: stats?.activeGoals, icon: Target, color: "text-purple-400", bg: "bg-purple-400/10", link: "/goals" },
    { title: "Avg Goal Progress", value: stats?.goalProgress !== undefined ? `${stats.goalProgress}%` : undefined, icon: Activity, color: "text-primary", bg: "bg-primary/10", link: "/goals" },
  ];

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Header Section */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-secondary/5 to-transparent p-6 rounded-3xl border border-primary/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
            </h1>
            {stats && stats.streak > 0 && (
              <motion.div 
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3.5 py-1 rounded-2xl text-xs font-bold shadow-[0_4px_16px_rgba(245,158,11,0.12)]"
              >
                <Flame className="w-4 h-4 fill-amber-500 animate-pulse" />
                <span>{stats.streak} Day Streak!</span>
              </motion.div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">Your personal digital vault is synched and secured.</p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <Button 
            variant="outline" 
            onClick={() => setMorningResetOpen(true)}
            className="border-border/60 text-foreground hover:bg-accent/40 rounded-2xl h-10 px-4"
          >
            <Sun className="w-4 h-4 mr-2 text-amber-500 fill-amber-500/10" />
            Morning Reset
          </Button>
          <Button 
            onClick={() => setNoteEditorOpen(true)} 
            className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-[0_4px_20px_rgba(124,77,255,0.3)] rounded-2xl h-10 px-5 font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Note
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards Row */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4.5"
      >
        {statCards.map((stat, i) => (
          <div key={i}>
            <Link href={stat.link}>
              <Card className="bg-card backdrop-blur-sm border-border/40 hover:border-primary/40 hover:shadow-[0_12px_24px_rgba(124,77,255,0.03)] transition-all duration-300 cursor-pointer h-full group overflow-hidden relative shadow-sm rounded-3xl">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 pt-5">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-4.5 h-4.5" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {loading ? (
                    <Skeleton className="h-8 w-16 bg-muted/60 rounded-lg" />
                  ) : (
                    <div className="text-2xl font-extrabold text-foreground group-hover:translate-x-0.5 transition-transform origin-left tracking-tight">
                      {stat.value !== undefined ? stat.value : '-'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        ))}
      </motion.div>

      {/* Dashboard Sub-widgets */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6.5"
      >
        
        {/* Left Side: Storage Capacity & AI logs */}
        <div className="space-y-6">
          
          {/* Storage capacity check */}
          <Card className="bg-card border-border/40 shadow-sm rounded-3xl p-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between px-5 pt-5">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <HardDrive className="w-4.5 h-4.5 text-primary" /> Storage Capacity Sync
              </CardTitle>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Local</span>
            </CardHeader>
            <CardContent className="space-y-3.5 px-5 pb-5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Used Space:</span>
                <span className="text-foreground">{storageUsage.size} MB / 5.00 MB</span>
              </div>
              <div className="w-full bg-accent rounded-full h-2.5 overflow-hidden border border-border/10">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    storageUsage.percentage > 80 
                      ? "bg-red-500" 
                      : storageUsage.percentage > 50 
                      ? "bg-amber-500" 
                      : "bg-gradient-to-r from-primary to-secondary"
                  }`} 
                  style={{ width: `${storageUsage.percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                To guarantee maximum performance speed, KnoVault warns users when local sync files approach the browser capacity limits.
              </p>
            </CardContent>
          </Card>

          {/* Recent AI conversations thread link */}
          <Card className="bg-card border-border/40 shadow-sm rounded-3xl p-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between px-5 pt-5">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-purple-400" /> Recent AI Discussions
              </CardTitle>
              <Link href="/ai">
                <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-purple-500/10 text-purple-500 rounded-xl">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 px-5 pb-5">
              {threads.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center font-medium">No recent chats. Start a session now!</p>
              ) : (
                threads.slice(0, 3).map((t) => (
                  <Link key={t.id} href="/ai">
                    <div className="flex items-center justify-between p-3.5 bg-accent/30 border border-border/30 hover:border-primary/30 hover:bg-accent/60 rounded-2xl text-xs cursor-pointer transition-all duration-200 mt-1">
                      <span className="font-bold text-foreground truncate max-w-[180px]">{t.title}</span>
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg shrink-0">{t.messages.length} replies</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center: Today's calendar items */}
        <Card className="bg-card border-border/40 shadow-sm rounded-3xl p-1 flex flex-col h-[410px]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-bold text-foreground">Today's Notes</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedCalendarNote(null);
                setCalendarNoteEditorOpen(true);
              }}
              className="text-primary hover:text-primary/90 hover:bg-primary/10 rounded-xl text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Note
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-5 pb-5 space-y-3.5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-2xl bg-muted/40">
                    <Skeleton className="h-5 w-3/4 bg-border/60 rounded-md" />
                    <Skeleton className="h-4 w-1/2 bg-border/60 rounded-md" />
                  </div>
                ))}
              </div>
            ) : todayNotes && todayNotes.length > 0 ? (
              <div className="space-y-3">
                {todayNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className="p-4 rounded-2xl bg-accent/20 border border-border/30 hover:border-primary/20 hover:bg-accent/40 transition-all duration-200 group flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span 
                        onClick={() => {
                          setSelectedCalendarNote(note);
                          setCalendarNoteEditorOpen(true);
                        }}
                        className="font-bold text-foreground cursor-pointer hover:text-primary transition-colors line-clamp-1 flex-1 text-sm"
                      >
                        {note.title}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg"
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
                          className="w-7 h-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg"
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
                      <p className="text-xs text-muted-foreground line-clamp-2 pr-1 font-medium leading-relaxed">
                        {note.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-muted-foreground text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <StickyNote className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xs font-semibold text-foreground">No notes attached to today's date</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Keep track of meetings, logs, or memories for this day.</p>
                <Button 
                  variant="link" 
                  className="text-primary mt-2 text-xs font-bold p-0 h-auto" 
                  onClick={() => {
                    setSelectedCalendarNote(null);
                    setCalendarNoteEditorOpen(true);
                  }}
                >
                  Create Today's Note
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Upcoming Tasks */}
        <Card className="bg-card border-border/40 shadow-sm rounded-3xl p-1 h-[410px]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-bold text-foreground">Upcoming Tasks</CardTitle>
            <Link href="/reminders">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 hover:bg-primary/10 rounded-xl text-xs font-bold">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/40">
                    <Skeleton className="h-8 w-8 rounded-xl bg-border/60" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full bg-border/60" />
                      <Skeleton className="h-3 w-24 bg-border/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-xs font-semibold text-foreground">You are all caught up!</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Any reminders scheduled for today or later will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Morning Reset Start-Fresh Modal */}
      <Dialog open={morningResetOpen} onOpenChange={setMorningResetOpen}>
        <DialogContent className="bg-card/90 backdrop-blur-2xl border-border/50 text-foreground max-w-md rounded-3xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Sun className="w-5 h-5 text-amber-500 fill-amber-500/10" />
              </div>
              <span>Morning Reset: Start Fresh!</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-medium">
              Clear yesterday's complete state log and organize today's schedule checklist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4.5 py-3">
            
            {/* Motivation Quote */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4.5 text-center shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-secondary" />
              <p className="text-xs italic text-foreground font-semibold leading-relaxed">"{motivationQuote}"</p>
            </div>

            {/* Quick checklist summary */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest block">
                Today's Overview Agenda
              </span>
              
              <div className="space-y-2.5 text-xs font-semibold">
                <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-2xl border border-border/10">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span>Daily Habit Streak: <strong className="text-primary font-extrabold">{stats?.streak || 0} Days</strong></span>
                </div>

                <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-2xl border border-border/10">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span>Pending medicine doses: <strong className="text-foreground">{stats?.medicinesToday || 0} doses</strong></span>
                </div>

                <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-2xl border border-border/10">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span>Upcoming special events: <strong className="text-foreground">{stats?.upcomingSpecialDays || 0} logs</strong></span>
                </div>
              </div>
            </div>

          </div>

          <DialogFooter className="flex sm:justify-between items-center w-full gap-3 pt-2">
            <Button variant="ghost" onClick={() => setMorningResetOpen(false)} className="text-xs rounded-xl h-9">
              Skip
            </Button>
            <Button 
              onClick={handleMorningResetComplete} 
              className="bg-primary hover:bg-primary/95 text-white text-xs rounded-xl h-9 px-4 font-bold shadow-[0_4px_16px_rgba(124,77,255,0.2)]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" style={{ animationDuration: '3s' }} /> Start Fresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NoteEditor open={noteEditorOpen} onOpenChange={setNoteEditorOpen} note={null} />

      <CalendarNoteEditor 
        open={calendarNoteEditorOpen} 
        onOpenChange={setCalendarNoteEditorOpen} 
        note={selectedCalendarNote} 
      />
    </motion.div>
  );
}
