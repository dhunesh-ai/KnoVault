/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  MessageSquare,
  Sparkles,
  Sun,
  CheckCircle2,
  RefreshCw,
  Clock,
  Calendar as CalendarIcon,
  Mic,
  Upload,
  Bot,
  Compass,
  FileText,
  TrendingUp,
  Bookmark,
  Star,
  CheckSquare,
  Zap,
  Layers,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  CalendarDays,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  FolderPlus,
} from "lucide-react";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { useCalendarNotesStore } from "@/store/useCalendarNotesStore";
import { CalendarNoteEditor } from "@/components/calendar-notes/CalendarNoteEditor";
import { useChatThreadsStore } from "@/store/useChatThreadsStore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  format,
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { isEventOnDate, getCategoryMeta, parseEventDateParts } from "@/lib/special-days-utils";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalNotes: number;
  activeReminders: number;
  medicinesToday: number;
  birthdaysToday: number;
  upcomingSpecialDays: number;
  activeGoals: number;
  goalProgress: number;
  streak: number;
  completedTasks: number;
}

interface UnifiedCalendarEvent {
  id: string | number;
  title: string;
  dateStr: string;
  category: string;
  type: "note" | "reminder" | "medicine" | "birthday" | "special_day" | "goal" | "meeting";
  colorBg: string;
  colorText: string;
  colorBorder: string;
  icon: any;
  originalItem: any;
}

const QUOTES = [
  "Small daily improvements over time lead to stunning results.",
  "Your focus determines your reality. Start fresh, stay focused.",
  "The secret of getting ahead is getting started.",
  "Make today your masterpiece. Take it one task at a time."
];

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { threads } = useChatThreadsStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Raw Data Lists
  const [allNotes, setAllNotes] = useState<any[]>([]);
  const [allReminders, setAllReminders] = useState<any[]>([]);
  const [specialDaysList, setSpecialDaysList] = useState<any[]>([]);
  const [allGoals, setAllGoals] = useState<any[]>([]);

  const { calendarNotes, fetchCalendarNotes, deleteCalendarNote } = useCalendarNotesStore();
  const todayNotes = useMemo(() => (calendarNotes || []).filter((n: any) => {
    const dStr = n.note_date || n.date_str;
    return dStr && isToday(new Date(dStr));
  }), [calendarNotes]);

  // Calendar State
  const [calendarMonthDate, setCalendarMonthDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  // Modals state
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [calendarNoteEditorOpen, setCalendarNoteEditorOpen] = useState(false);
  const [selectedCalendarNote, setSelectedCalendarNote] = useState<any>(null);
  const [morningResetOpen, setMorningResetOpen] = useState(false);
  const [motivationQuote, setMotivationQuote] = useState("");

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon 👋";
    return "Good Evening 👋";
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        notesRes,
        remindersRes,
        projectsRes,
        goalsRes,
        specialDaysRes
      ] = await Promise.all([
        api.get('/api/notes').catch((err) => { console.warn("[Dashboard] /api/notes fetch error:", err); return { data: [] }; }),
        api.get('/api/reminders').catch((err) => { console.warn("[Dashboard] /api/reminders fetch error:", err); return { data: [] }; }),
        api.get('/api/projects').catch((err) => { console.warn("[Dashboard] /api/projects fetch error:", err); return { data: [] }; }),
        api.get('/api/goals').catch((err) => { console.warn("[Dashboard] /api/goals fetch error:", err); return { data: [] }; }),
        api.get('/api/important-days').catch((err) => { console.warn("[Dashboard] /api/important-days fetch error:", err); return { data: [] }; }),
        fetchCalendarNotes().catch((err) => { console.warn("[Dashboard] fetchCalendarNotes error:", err); return null; })
      ]);

      const notes = notesRes.data || [];
      const reminders = remindersRes.data || [];
      const projects = projectsRes.data || [];
      const goals = goalsRes.data || [];
      const specialDays = specialDaysRes.data || [];

      setAllNotes(notes);
      setAllReminders(reminders);
      setSpecialDaysList(specialDays);
      setAllGoals(goals.length > 0 ? goals : projects);

      const activeReminders = reminders.filter((r: any) => !r.is_completed && r.reminder_type !== 'medicine');
      const medicinesToday = reminders.filter((r: any) => r.reminder_type === 'medicine' && !r.is_completed);
      const completedTasks = reminders.filter((r: any) => r.is_completed).length;

      const todayDateObj = new Date();
      const birthdaysToday = specialDays.filter((sd: any) => 
        (sd.type || "").toLowerCase().includes("birthday") && isEventOnDate(sd, todayDateObj)
      ).length;

      const activeProjects = projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress');
      const totalGoalProgress = goals.reduce((acc: number, goal: any) => acc + (goal.progress || 0), 0);
      const avgGoalProgress = goals.length > 0 ? Math.round(totalGoalProgress / goals.length) : 0;
      const streakVal = goals.length > 0 ? Math.max(...goals.map((g: any) => g.streak || 0), 0) : 0;

      setStats({
        totalNotes: notes.length,
        activeReminders: activeReminders.length,
        medicinesToday: medicinesToday.length,
        birthdaysToday: birthdaysToday,
        upcomingSpecialDays: specialDays.length,
        activeGoals: activeProjects.length || goals.length,
        goalProgress: avgGoalProgress,
        streak: streakVal || 0,
        completedTasks: completedTasks,
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
      setMotivationQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

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
      const remindersRes = await api.get('/api/reminders');
      const medicines = (remindersRes.data || []).filter((r: any) => r.reminder_type === 'medicine' && r.is_completed);
      
      await Promise.all(
        medicines.map((m: any) => api.put(`/api/reminders/${m.id}`, { is_completed: false }))
      );

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

  // UNIFIED CALENDAR EVENTS MAPPING
  const unifiedEvents: UnifiedCalendarEvent[] = useMemo(() => {
    const events: UnifiedCalendarEvent[] = [];

    // 1. Calendar Notes
    (calendarNotes || []).forEach((cnNote: any) => {
      const dStr = cnNote.note_date || cnNote.date_str;
      if (dStr) {
        events.push({
          id: `cn-${cnNote.id}`,
          title: cnNote.title,
          dateStr: dStr,
          category: "Calendar Note",
          type: "note",
          colorBg: "bg-purple-500",
          colorText: "text-purple-600 dark:text-purple-400",
          colorBorder: "border-purple-500/20",
          icon: StickyNote,
          originalItem: cnNote,
        });
      }
    });

    // 2. Reminders & Medicines
    (allReminders || []).forEach((r) => {
      const dateVal = r.due_date || r.created_at;
      if (dateVal) {
        const isMed = r.reminder_type === "medicine";
        events.push({
          id: `r-${r.id}`,
          title: r.title,
          dateStr: dateVal,
          category: isMed ? "Medicine" : "Reminder",
          type: isMed ? "medicine" : "reminder",
          colorBg: isMed ? "bg-emerald-500" : "bg-orange-500",
          colorText: isMed ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400",
          colorBorder: isMed ? "border-emerald-500/20" : "border-orange-500/20",
          icon: isMed ? Pill : Bell,
          originalItem: r,
        });
      }
    });

    // 3. Special Days & Birthdays
    (specialDaysList || []).forEach((sd) => {
      if (sd.date) {
        const isBday = (sd.type || "").toLowerCase().includes("birthday");
        events.push({
          id: `sd-${sd.id}`,
          title: sd.title,
          dateStr: sd.date,
          category: sd.type || "Special Day",
          type: isBday ? "birthday" : "special_day",
          colorBg: isBday ? "bg-rose-500" : "bg-teal-500",
          colorText: isBday ? "text-rose-600 dark:text-rose-400" : "text-teal-600 dark:text-teal-400",
          colorBorder: isBday ? "border-rose-500/20" : "border-teal-500/20",
          icon: isBday ? Gift : Sparkles,
          originalItem: sd,
        });
      }
    });

    // 4. Goals & Milestones
    (allGoals || []).forEach((g) => {
      const dateVal = g.deadline || g.due_date || g.created_at;
      if (dateVal) {
        events.push({
          id: `g-${g.id}`,
          title: g.title,
          dateStr: dateVal,
          category: "Goal",
          type: "goal",
          colorBg: "bg-amber-500",
          colorText: "text-amber-600 dark:text-amber-400",
          colorBorder: "border-amber-500/20",
          icon: Target,
          originalItem: g,
        });
      }
    });

    return events;
  }, [calendarNotes, allReminders, specialDaysList, allGoals]);

  // Calendar Calculation
  const monthStart = startOfMonth(calendarMonthDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const getUnifiedEventsForDate = (date: Date) => {
    return unifiedEvents.filter((e) => {
      if (e.type === "birthday" || e.type === "special_day") {
        return isEventOnDate(e.originalItem, date);
      }
      const parsed = parseEventDateParts(e.dateStr);
      if (!parsed) return false;
      return parsed.year === date.getFullYear() && parsed.month === date.getMonth() && parsed.day === date.getDate();
    });
  };

  const selectedDateEvents = getUnifiedEventsForDate(selectedCalendarDate);

  const toggleReminderComplete = async (reminderId: number, currentCompleted: boolean) => {
    try {
      await api.put(`/api/reminders/${reminderId}`, { is_completed: !currentCompleted });
      toast.success(currentCompleted ? "Marked incomplete" : "Task completed! 🎉");
      fetchDashboardData();
    } catch (e) {
      toast.error("Failed to update task status");
    }
  };

  // Quick Action Buttons Data
  const QUICK_ACTIONS = [
    { title: "Create Note", desc: "Markdown & Voice", icon: StickyNote, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", onClick: () => setNoteEditorOpen(true) },
    { title: "Create Reminder", desc: "Tasks & Schedule", icon: Bell, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", onClick: () => router.push("/reminders") },
    { title: "Add Medicine", desc: "Dose tracking", icon: Pill, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", onClick: () => router.push("/medicine") },
    { title: "Add Special Day", desc: "Events & Wishes", icon: Gift, color: "text-pink-500 bg-pink-500/10 border-pink-500/20", onClick: () => router.push("/special-days/new") },
    { title: "Create Goal", desc: "Milestones & Progress", icon: Target, color: "text-purple-500 bg-purple-500/10 border-purple-500/20", onClick: () => router.push("/goals") },
    { title: "Open AI Assistant", desc: "Chat & Summarize", icon: Sparkles, color: "text-violet-500 bg-violet-500/10 border-violet-500/20", onClick: () => router.push("/ai") },
    { title: "Voice Note", desc: "Instant audio log", icon: Mic, color: "text-sky-500 bg-sky-500/10 border-sky-500/20", onClick: () => setNoteEditorOpen(true) },
    { title: "Workspaces", desc: "Docs & Files", icon: Layers, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20", onClick: () => router.push("/workspaces") },
  ];

  // Overview Metrics Cards
  const overviewStats = [
    { title: "Today's Notes", value: stats?.totalNotes, icon: StickyNote, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", link: "/notes" },
    { title: "Active Reminders", value: stats?.activeReminders, icon: Bell, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", link: "/reminders" },
    { title: "Medicines Today", value: stats?.medicinesToday, icon: Pill, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", link: "/medicine" },
    { title: "Birthdays Today", value: stats?.birthdaysToday, icon: Gift, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20", link: "/special-days" },
    { title: "Special Events", value: stats?.upcomingSpecialDays, icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", link: "/special-days" },
    { title: "Active Goals", value: stats?.activeGoals, icon: Target, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", link: "/goals" },
    { title: "AI Threads", value: threads.length, icon: MessageSquare, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20", link: "/ai" },
    { title: "Tasks Completed", value: stats?.completedTasks, icon: CheckCircle2, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20", link: "/reminders" },
  ];

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-16"
    >
      {/* 1. TOP HERO SECTION */}
      <motion.div 
        variants={itemVariants}
        className="bg-gradient-to-br from-purple-900/20 via-card to-card backdrop-blur-2xl border border-purple-500/20 rounded-[28px] p-6 lg:p-8 relative overflow-hidden shadow-lg"
      >
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-44 h-44 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3.5 py-1 rounded-full">
                {getGreeting()}
              </span>
              <span className="text-xs font-extrabold text-foreground/80 bg-card/80 border border-border/60 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <CalendarIcon className="w-3.5 h-3.5 text-purple-500" />
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </span>
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 rounded-full flex items-center gap-1">
                ☀️ 26°C Sunny
              </span>
            </div>

            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                Welcome back, {user?.full_name?.split(' ')[0] || 'Dhunesh'}
              </h1>
              <p className="text-sm font-semibold text-muted-foreground mt-2 leading-relaxed">
                You have{" "}
                <strong className="text-purple-600 dark:text-purple-400 font-extrabold">{stats?.activeReminders || 0} Tasks</strong>,{" "}
                <strong className="text-pink-600 dark:text-pink-400 font-extrabold">{stats?.birthdaysToday || 0} Birthday</strong>,{" "}
                <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{stats?.totalNotes || 0} Notes</strong> &{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{stats?.medicinesToday || 0} Medicines</strong> today.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="p-3 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-2 text-xs font-semibold text-muted-foreground italic">
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                <span>"{motivationQuote}"</span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 shrink-0">
            <Button
              onClick={() => setNoteEditorOpen(true)}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-black shadow-lg shadow-purple-500/25 border-0 text-sm gap-2"
            >
              <Plus className="w-4.5 h-4.5" /> + New Note
            </Button>
            <Button
              onClick={() => router.push("/reminders")}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-black shadow-lg shadow-pink-500/25 border-0 text-sm gap-2"
            >
              <Bell className="w-4.5 h-4.5" /> + New Reminder
            </Button>
            <Button
              onClick={() => router.push("/ai")}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-black shadow-lg shadow-purple-500/25 border-0 text-sm gap-2"
            >
              <Sparkles className="w-4.5 h-4.5" /> + Ask KnoVault AI
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 2. QUICK ACTIONS SECTION */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" /> QUICK ACTIONS
          </h2>
          <span className="text-xs text-muted-foreground font-semibold">1-Click Shortcuts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {QUICK_ACTIONS.map((act, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={act.onClick}
              className={cn(
                "p-4 rounded-[20px] border bg-card/90 backdrop-blur-md cursor-pointer transition-all flex flex-col items-center justify-center text-center group shadow-2xs hover:shadow-md",
                act.color
              )}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <act.icon className="w-5 h-5" />
              </div>
              <h4 className="font-black text-foreground text-xs leading-tight truncate w-full">{act.title}</h4>
              <p className="text-[10px] text-muted-foreground font-semibold truncate w-full mt-0.5">{act.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 3. PROMINENT FULL MONTHLY CALENDAR HUB (68% LEFT GRID / 32% RIGHT AGENDA) */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-2">
            <CalendarIcon className="w-4.5 h-4.5 text-purple-500" /> FULL MONTHLY CALENDAR HUB
          </h2>
          <div className="flex items-center gap-3 text-xs font-extrabold">
            <span className="flex items-center gap-1 text-purple-500"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Notes</span>
            <span className="flex items-center gap-1 text-rose-500"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Birthdays</span>
            <span className="flex items-center gap-1 text-emerald-500"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Medicines</span>
            <span className="flex items-center gap-1 text-orange-500"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Reminders</span>
            <span className="flex items-center gap-1 text-amber-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Goals</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT CALENDAR GRID (68% WIDTH / 8 COLS) */}
          <div className="lg:col-span-8 bg-card/90 backdrop-blur-xl border border-border/60 rounded-[28px] p-6 shadow-sm flex flex-col h-full overflow-hidden">
            
            {/* Header Controls */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
                <CalendarIcon className="w-6 h-6 text-purple-500" />
                {format(calendarMonthDate, "MMMM yyyy")}
              </h3>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCalendarMonthDate(new Date());
                    setSelectedCalendarDate(new Date());
                  }}
                  className="h-9 px-3.5 rounded-xl border-border/60 font-black text-xs"
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCalendarMonthDate(subMonths(calendarMonthDate, 1))}
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCalendarMonthDate(addMonths(calendarMonthDate, 1))}
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-2 text-center font-black text-xs uppercase tracking-wider text-muted-foreground mb-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-2 flex-1 min-h-[460px]">
              {dateRange.map((day, idx) => {
                const dayEvents = getUnifiedEventsForDate(day);
                const isSelected = isSameDay(day, selectedCalendarDate);
                const isCurrentMonth = isSameMonth(day, calendarMonthDate);
                const isTodayDate = isToday(day);

                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedCalendarDate(day)}
                    className={cn(
                      "p-2 border rounded-[18px] cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative min-h-[90px] group",
                      !isCurrentMonth && "opacity-35 bg-muted/20",
                      isSelected
                        ? "border-purple-600 bg-purple-600/10 shadow-[0_0_18px_rgba(124,77,255,0.25)] ring-2 ring-purple-500/50"
                        : "border-border/50 bg-background hover:border-purple-400/50 hover:bg-purple-500/5",
                      isTodayDate && !isSelected && "border-pink-500/60 bg-pink-500/10 font-bold"
                    )}
                  >
                    {/* Top Row: Event Dots & Day Number */}
                    <div className="flex items-center justify-between">
                      {dayEvents.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <span
                              key={ev.id}
                              className={cn("w-2 h-2 rounded-full", ev.colorBg)}
                              title={`${ev.category}: ${ev.title}`}
                            />
                          ))}
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

                    {/* Day Badges */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const IconComp = ev.icon;
                        return (
                          <div
                            key={ev.id}
                            title={ev.title}
                            className={cn(
                              "text-[10px] truncate px-2 py-0.5 rounded-md font-extrabold text-white flex items-center gap-1 shadow-2xs",
                              ev.colorBg
                            )}
                          >
                            <IconComp className="w-3 h-3 shrink-0" />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-center text-purple-600 dark:text-purple-400 font-black">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SELECTED DATE AGENDA (32% WIDTH / 4 COLS) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Selected Date Header */}
            <div className="bg-card/90 backdrop-blur-xl border border-border/60 rounded-[28px] p-6 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xl text-foreground flex items-center gap-2">
                  <span>{format(selectedCalendarDate, "MMMM d, yyyy")}</span>
                </h3>
                {isToday(selectedCalendarDate) && (
                  <Badge className="bg-pink-500/15 text-pink-600 dark:text-pink-400 font-black text-xs px-3 py-1 rounded-full border border-pink-500/20">
                    Today 🎉
                  </Badge>
                )}
              </div>
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""} on this date
              </p>
            </div>

            {/* Selected Date Unified Events List */}
            <div className="space-y-3 min-h-[380px] max-h-[520px] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {selectedDateEvents.map((ev) => {
                  const IconComponent = ev.icon;
                  const isRem = ev.type === "reminder" || ev.type === "medicine";
                  const isComp = ev.originalItem?.is_completed;

                  return (
                    <motion.div
                      key={ev.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "p-4 rounded-[20px] bg-card border hover:border-purple-400/60 shadow-2xs transition-all space-y-2.5 relative overflow-hidden group",
                        ev.colorBorder
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={cn("text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border", ev.colorText, ev.colorBorder)}>
                          {ev.category}
                        </Badge>

                        <div className="flex items-center gap-1">
                          {isRem && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleReminderComplete(ev.originalItem.id, isComp)}
                              className={cn(
                                "w-7 h-7 rounded-lg transition-colors",
                                isComp ? "bg-emerald-500/20 text-emerald-500" : "hover:bg-muted text-muted-foreground"
                              )}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (ev.type === "birthday" || ev.type === "special_day") router.push("/special-days");
                              else if (ev.type === "reminder" || ev.type === "medicine") router.push("/reminders");
                              else if (ev.type === "goal") router.push("/goals");
                              else router.push("/notes");
                            }}
                            className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs text-white", ev.colorBg)}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn("font-black text-foreground text-sm leading-tight truncate", isComp && "line-through opacity-60")}>
                            {ev.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                            {ev.dateStr ? format(new Date(ev.dateStr), "MMM d, yyyy") : "Scheduled"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {selectedDateEvents.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 rounded-[24px] bg-card border border-border/60 border-dashed text-center space-y-3"
                  >
                    <span className="text-3xl block mb-1">📅</span>
                    <h4 className="font-black text-foreground text-sm">No Events Scheduled</h4>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Nothing set for {format(selectedCalendarDate, "MMM d")}. Enjoy your free day!
                    </p>
                    <Button
                      onClick={() => setNoteEditorOpen(true)}
                      className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs"
                    >
                      + Add Event
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </motion.div>

      {/* 4. TODAY OVERVIEW STATISTIC CARDS (8 METRICS) */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-500" /> TODAY'S OVERVIEW METRICS
          </h2>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">Real-time Sync</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {overviewStats.map((st, i) => (
            <Link key={i} href={st.link}>
              <motion.div
                whileHover={{ y: -3 }}
                className={cn(
                  "p-4 rounded-[22px] bg-card border hover:border-purple-400/60 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2 relative overflow-hidden group",
                  st.border
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-xl", st.bg, st.color)}>
                    <st.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Today</span>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground truncate">{st.title}</h4>
                  <div className="text-2xl font-black text-foreground tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {loading ? <Skeleton className="h-7 w-12 rounded-md" /> : (st.value !== undefined ? st.value : 0)}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* 5. MAIN 2-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN (8 COLS / 65% WIDTH) */}
        <div className="lg:col-span-8 space-y-8">

          {/* TODAY'S TIMELINE */}
          <motion.div variants={itemVariants} className="space-y-4">
            <Card className="bg-card/90 backdrop-blur-xl border border-border/60 rounded-[24px] p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-purple-500" /> Today's Schedule & Timeline
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setNoteEditorOpen(true)} className="text-xs font-bold text-purple-600 hover:bg-purple-500/10 rounded-xl">
                  + Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {/* Morning Slot */}
                <div className="flex items-start gap-4">
                  <div className="w-24 shrink-0 text-xs font-black text-amber-500 flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5" /> Morning
                  </div>
                  <div className="flex-1 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs font-semibold space-y-1">
                    <p className="font-extrabold text-foreground">🌅 Morning Kickoff & Medicines</p>
                    <p className="text-muted-foreground text-[11px]">
                      {stats?.medicinesToday ? `${stats.medicinesToday} pending medicine doses` : "All morning doses complete!"}
                    </p>
                  </div>
                </div>

                {/* Afternoon Slot */}
                <div className="flex items-start gap-4">
                  <div className="w-24 shrink-0 text-xs font-black text-purple-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Afternoon
                  </div>
                  <div className="flex-1 p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs font-semibold space-y-1">
                    <p className="font-extrabold text-foreground">☀️ Work, Reminders & Syncs</p>
                    <p className="text-muted-foreground text-[11px]">
                      {stats?.activeReminders ? `${stats.activeReminders} active reminders scheduled` : "No urgent afternoon tasks"}
                    </p>
                  </div>
                </div>

                {/* Evening Slot */}
                <div className="flex items-start gap-4">
                  <div className="w-24 shrink-0 text-xs font-black text-pink-500 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" /> Evening
                  </div>
                  <div className="flex-1 p-3.5 rounded-2xl bg-pink-500/5 border border-pink-500/20 text-xs font-semibold space-y-1">
                    <p className="font-extrabold text-foreground">🎉 Evening Celebrations & Notes Review</p>
                    <p className="text-muted-foreground text-[11px]">
                      {stats?.birthdaysToday ? `${stats.birthdaysToday} birthday celebration today!` : "Review notes & set goals for tomorrow"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* RECENT NOTES CARDS GRID */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-blue-500" /> RECENT NOTES
              </h2>
              <Link href="/notes">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl">
                  View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-[22px] bg-card" />
                ))}
              </div>
            ) : allNotes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allNotes.slice(0, 4).map((note) => (
                  <div
                    key={note.id}
                    onClick={() => router.push("/notes")}
                    className="p-5 rounded-[24px] bg-card border border-border/60 hover:border-blue-400/60 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3 group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 border-blue-500/20 px-2.5 py-0.5 rounded-full">
                        {note.category || "General"}
                      </Badge>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {note.updated_at ? format(new Date(note.updated_at), "MMM d") : "Recent"}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-foreground text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {note.title || "Untitled Note"}
                      </h4>
                      {note.content && (
                        <p className="text-xs text-muted-foreground font-semibold line-clamp-2 mt-1 leading-relaxed">
                          {note.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-[24px] bg-card border border-border/60 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-500">
                  <StickyNote className="w-6 h-6" />
                </div>
                <h4 className="font-black text-foreground text-sm">No notes created yet</h4>
                <p className="text-xs text-muted-foreground font-semibold max-w-xs mx-auto">
                  Start capturing your ideas, meeting logs, and markdown notes.
                </p>
                <Button onClick={() => setNoteEditorOpen(true)} className="h-10 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  + Create First Note
                </Button>
              </div>
            )}
          </motion.div>

        </div>

        {/* RIGHT COLUMN (4 COLS / 35% WIDTH) */}
        <div className="lg:col-span-4 space-y-8">

          {/* AI ASSISTANT WIDGET */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-purple-900/20 via-card to-card border border-purple-500/30 rounded-[24px] p-6 shadow-md space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-purple-500" /> KnoVault AI Assistant
                </CardTitle>
                <Badge className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  {threads.length} Chats
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-semibold">Suggested Quick Prompts:</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button onClick={() => router.push("/ai")} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-left truncate">
                    ✨ Summarize Notes
                  </button>
                  <button onClick={() => router.push("/ai")} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-left truncate">
                    📅 Plan My Day
                  </button>
                  <button onClick={() => router.push("/ai")} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-left truncate">
                    🔍 Find Notes
                  </button>
                  <button onClick={() => router.push("/ai")} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-left truncate">
                    🤖 Ask AI
                  </button>
                </div>
              </div>

              <Button onClick={() => router.push("/ai")} className="w-full h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs gap-2">
                Open AI Chat <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          </motion.div>

          {/* PRODUCTIVITY INSIGHTS */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card border border-border/60 rounded-[24px] p-6 shadow-sm space-y-4">
              <CardTitle className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border/50 pb-3">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-500" /> Productivity Insights
              </CardTitle>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Focus Streak</span>
                  <span className="font-black text-amber-500 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-amber-500" /> {stats?.streak || 0} Days
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Goal Progress</span>
                  <span className="font-black text-purple-600 dark:text-purple-400">{stats?.goalProgress || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${stats?.goalProgress || 0}%` }} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground font-bold">Tasks Completed</span>
                  <span className="font-black text-emerald-500">{stats?.completedTasks || 0} Items</span>
                </div>
              </div>
            </Card>
          </motion.div>

        </div>

      </div>

      {/* MORNING RESET DIALOG */}
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
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 text-center shadow-inner relative overflow-hidden">
              <p className="text-xs italic text-foreground font-semibold leading-relaxed">"{motivationQuote}"</p>
            </div>

            <div className="space-y-2.5 text-xs font-semibold">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-2xl border border-border/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Daily Habit Streak: <strong className="text-purple-600 font-black">{stats?.streak || 0} Days</strong></span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-2xl border border-border/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Pending medicine doses: <strong className="text-foreground">{stats?.medicinesToday || 0} doses</strong></span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between items-center w-full gap-3 pt-2">
            <Button variant="ghost" onClick={() => setMorningResetOpen(false)} className="text-xs rounded-xl h-9">
              Skip
            </Button>
            <Button 
              onClick={handleMorningResetComplete} 
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl h-9 px-4 font-bold shadow-md shadow-purple-500/20"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" style={{ animationDuration: '3s' }} /> Start Fresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALS */}
      <NoteEditor open={noteEditorOpen} onOpenChange={setNoteEditorOpen} note={null} />
      <CalendarNoteEditor 
        open={calendarNoteEditorOpen} 
        onOpenChange={setCalendarNoteEditorOpen} 
        note={selectedCalendarNote} 
      />
    </motion.div>
  );
}
