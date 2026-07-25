"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
import { SpecialDayCard } from "@/components/special-days/SpecialDayCard";
import { SpecialDayProfile } from "@/components/special-days/SpecialDayProfile";
import { ScheduledEmailsModal } from "@/components/special-days/ScheduledEmailsModal";
import { SpecialDaysCalendarView } from "@/components/special-days/SpecialDaysCalendarView";
import { SpecialDay } from "@/types/SpecialDay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, PartyPopper, CalendarDays, Gift, Star, Mail, Search, ArrowUpDown, Sparkles, BellRing, ChevronRight, CalendarCheck, ShieldCheck, Zap, LayoutGrid, CalendarIcon } from "lucide-react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getNextOccurrence, calculateDaysRemaining, selectSmartHeroEvent, getAgeInfo, getCategoryMeta } from "@/lib/special-days-utils";

const FILTER_CHIPS = [
  { label: "All", value: "all" },
  { label: "🎂 Birthdays", value: "birthday" },
  { label: "💍 Anniversaries", value: "anniversary" },
  { label: "💎 Engagements", value: "engagement" },
  { label: "🎊 Festivals", value: "festival" },
  { label: "🤝 Meetings", value: "meeting" },
  { label: "🏆 Achievements", value: "achievement" },
  { label: "📸 Memories", value: "memory" },
  { label: "✨ Custom", value: "custom" },
  { label: "⏰ Upcoming", value: "upcoming" },
  { label: "📅 This Month", value: "this_month" },
];

export default function SpecialDaysPage() {
  const router = useRouter();
  const {
    specialDays,
    scheduledEmails,
    isLoading,
    fetchSpecialDays,
    fetchScheduledEmails,
    deleteSpecialDay,
  } = useSpecialDaysStore();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"nearest" | "oldest" | "newest" | "title" | "category">("nearest");
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid");

  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SpecialDay | null>(null);

  const [scheduledEmailsOpen, setScheduledEmailsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchSpecialDays();
    fetchScheduledEmails();
  }, [fetchSpecialDays, fetchScheduledEmails]);

  useEffect(() => {
    if (selectedEvent && specialDays.length > 0) {
      const updated = specialDays.find((sd) => sd.id === selectedEvent.id);
      if (updated) setSelectedEvent(updated);
    }
  }, [specialDays, selectedEvent]);

  // Enhanced metadata and days remaining calculation
  const processedEvents = useMemo(() => {
    return [...specialDays].map((sd) => ({
      ...sd,
      nextDate: getNextOccurrence(sd.date, sd.is_recurring),
      daysLeft: calculateDaysRemaining(sd.date, sd.is_recurring),
    }));
  }, [specialDays]);

  // Smart Hero Selection (Priority 1 to 10)
  const smartHero = useMemo(() => {
    return selectSmartHeroEvent(processedEvents);
  }, [processedEvents]);

  // Today items count for Today's Highlights
  const todayHighlights = useMemo(() => {
    const todayEvents = processedEvents.filter((e) => e.daysLeft === 0);
    const todayBirthdays = todayEvents.filter((e) => e.type.toLowerCase().includes("birthday")).length;
    const todayFestivals = todayEvents.filter((e) => e.type.toLowerCase().includes("festival")).length;
    const todayAnniversaries = todayEvents.filter((e) => e.type.toLowerCase().includes("anniversary") || e.type.toLowerCase().includes("wedding")).length;
    const remindersCount = processedEvents.filter((e) => e.reminder_enabled).length;
    const autoWishesCount = processedEvents.filter((e) => e.auto_send_email).length;
    const scheduledToday = scheduledEmails.filter((e) => e.status === "scheduled").length;

    return {
      totalToday: todayEvents.length,
      birthdays: todayBirthdays,
      festivals: todayFestivals,
      anniversaries: todayAnniversaries,
      remindersCount,
      autoWishesCount,
      scheduledToday,
    };
  }, [processedEvents, scheduledEmails]);

  // Dynamic Header Subtitle
  const dynamicSubtitle = useMemo(() => {
    if (todayHighlights.totalToday > 0) {
      return `Today has ${todayHighlights.totalToday} celebration${todayHighlights.totalToday > 1 ? "s" : ""} 🎉`;
    }
    const upcoming7 = processedEvents.filter((e) => e.daysLeft > 0 && e.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft);
    if (upcoming7.length > 0) {
      return `Next celebration "${upcoming7[0].title}" in ${upcoming7[0].daysLeft} day${upcoming7[0].daysLeft > 1 ? "s" : ""}.`;
    }
    if (todayHighlights.remindersCount > 0) {
      return `${todayHighlights.remindersCount} reminder${todayHighlights.remindersCount > 1 ? "s" : ""} active.`;
    }
    return "No events today. Keep track of all celebrations!";
  }, [todayHighlights, processedEvents]);

  // Search & Filtering
  const filteredEvents = useMemo(() => {
    return processedEvents.filter((sd) => {
      const typeLower = (sd.type || "").toLowerCase();

      let matchesFilter = true;
      if (activeFilter === "birthday") matchesFilter = typeLower.includes("birthday");
      else if (activeFilter === "anniversary") matchesFilter = typeLower.includes("anniversary") || typeLower.includes("wedding");
      else if (activeFilter === "engagement") matchesFilter = typeLower.includes("engagement");
      else if (activeFilter === "festival") matchesFilter = typeLower.includes("festival");
      else if (activeFilter === "meeting") matchesFilter = typeLower.includes("meeting");
      else if (activeFilter === "achievement") matchesFilter = typeLower.includes("achievement") || typeLower.includes("graduation");
      else if (activeFilter === "memory") matchesFilter = typeLower.includes("memory");
      else if (activeFilter === "custom") matchesFilter = typeLower.includes("custom");
      else if (activeFilter === "upcoming") matchesFilter = sd.daysLeft >= 0 && sd.daysLeft <= 30;
      else if (activeFilter === "this_month") matchesFilter = sd.nextDate.getMonth() === new Date().getMonth();

      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        sd.title.toLowerCase().includes(q) ||
        typeLower.includes(q) ||
        (sd.notes || "").toLowerCase().includes(q) ||
        (sd.gift_ideas || "").toLowerCase().includes(q) ||
        (sd.recipient_email || "").toLowerCase().includes(q) ||
        (sd.relationship || "").toLowerCase().includes(q) ||
        (sd.location || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      if (sortBy === "nearest") return a.daysLeft - b.daysLeft;
      if (sortBy === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "category") return a.type.localeCompare(b.type);
      return 0;
    });
  }, [processedEvents, activeFilter, searchQuery, sortBy]);

  // Comprehensive Dashboard Statistics
  const stats = useMemo(() => {
    const todayCount = processedEvents.filter((sd) => sd.daysLeft === 0).length;
    const thisWeekCount = processedEvents.filter((sd) => sd.daysLeft > 0 && sd.daysLeft <= 7).length;
    const thisMonthCount = processedEvents.filter((sd) => sd.nextDate.getMonth() === new Date().getMonth()).length;
    const birthdaysCount = processedEvents.filter((sd) => sd.type.toLowerCase().includes("birthday")).length;
    const festivalsCount = processedEvents.filter((sd) => sd.type.toLowerCase().includes("festival")).length;
    const achievementsCount = processedEvents.filter((sd) => sd.type.toLowerCase().includes("achievement")).length;

    return {
      total: processedEvents.length,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      birthdays: birthdaysCount,
      festivals: festivalsCount,
      achievements: achievementsCount,
      scheduledEmailsCount: scheduledEmails.filter((e) => e.status === "scheduled").length,
      remindersCount: processedEvents.filter((sd) => sd.reminder_enabled).length,
      autoWishesCount: processedEvents.filter((sd) => sd.auto_send_email).length,
    };
  }, [processedEvents, scheduledEmails]);

  const handleCreate = () => {
    router.push("/special-days/new");
  };

  const handleEdit = (event: SpecialDay) => {
    router.push(`/special-days/new?id=${event.id}`);
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
        toast.success("Special day deleted");
        if (selectedEvent?.id === deleteId) setProfileOpen(false);
      } catch (e) {
        toast.error("Failed to delete event");
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div className="space-y-6 flex flex-col min-h-[calc(100vh-5.5rem)] pb-12">
      
      {/* Header Bar with Dynamic Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            ✨ Special Days
          </h1>
          <p className="text-purple-600 dark:text-purple-400 font-semibold text-sm mt-0.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {dynamicSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={() => setScheduledEmailsOpen(true)}
            className="bg-card border-[#ECECF2] dark:border-border/60 text-foreground hover:bg-muted font-bold rounded-2xl gap-2 shadow-xs"
          >
            <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Scheduled Emails
            {stats.scheduledEmailsCount > 0 && (
              <Badge className="bg-purple-600 text-white rounded-full px-2 py-0.5 text-[10px]">
                {stats.scheduledEmailsCount}
              </Badge>
            )}
          </Button>

          <Button
            onClick={handleCreate}
            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold shadow-md shadow-purple-500/20 border-0 rounded-2xl gap-2 px-5"
          >
            <Plus className="w-4 h-4" />
            Add Special Day
          </Button>
        </div>
      </div>

      {/* Expanded Dashboard Statistics (9 Cards Grid) */}
      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 shrink-0">
          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today</span>
              <span className="text-xl font-black text-amber-500">{stats.today}</span>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Week</span>
              <span className="text-xl font-black text-violet-600 dark:text-violet-400">{stats.thisWeek}</span>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Month</span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400">{stats.thisMonth}</span>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Birthdays</span>
              <span className="text-xl font-black text-amber-600">{stats.birthdays}</span>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Festivals</span>
              <span className="text-xl font-black text-orange-500">{stats.festivals}</span>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Achievements</span>
              <span className="text-xl font-black text-purple-500">{stats.achievements}</span>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Queued Emails</span>
              <span className="text-xl font-black text-blue-500">{stats.scheduledEmailsCount}</span>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reminders</span>
              <span className="text-xl font-black text-emerald-500">{stats.remindersCount}</span>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/70 border-[#ECECF2] dark:border-border/60 rounded-2xl shadow-2xs">
            <CardContent className="p-3 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Auto Wishes</span>
              <span className="text-xl font-black text-sky-500">{stats.autoWishesCount}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Highlights Bar (Shown if items exist today) */}
      {todayHighlights.totalToday > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-rose-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold shrink-0">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Today's Highlights
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {todayHighlights.birthdays > 0 && (
              <Badge className="bg-amber-500 text-white rounded-full">🎂 {todayHighlights.birthdays} Birthday</Badge>
            )}
            {todayHighlights.festivals > 0 && (
              <Badge className="bg-orange-500 text-white rounded-full">🎉 {todayHighlights.festivals} Festival</Badge>
            )}
            {todayHighlights.anniversaries > 0 && (
              <Badge className="bg-rose-500 text-white rounded-full">💍 {todayHighlights.anniversaries} Anniversary</Badge>
            )}
            {todayHighlights.scheduledToday > 0 && (
              <Badge className="bg-blue-500 text-white rounded-full">📩 {todayHighlights.scheduledToday} Scheduled Wish</Badge>
            )}
            <Badge className="bg-purple-600 text-white rounded-full">🔔 {todayHighlights.remindersCount} Reminders Enabled</Badge>
          </div>
        </div>
      )}

      {/* Intelligent Smart Hero Section */}
      {!isLoading && activeFilter === "all" && viewMode === "grid" && !searchQuery && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="shrink-0">
          {smartHero.event && smartHero.heroType !== "far" && smartHero.heroType !== "none" ? (
            <div
              onClick={() => handleViewProfile(smartHero.event!)}
              className="bg-card/90 dark:bg-card/70 backdrop-blur-xl border border-[#ECECF2] dark:border-border/60 hover:border-purple-400/50 rounded-3xl p-6 relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all"
            >
              {/* Soft Light Purple Ambient Glow */}
              <div className="absolute -right-10 -top-10 w-44 h-44 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-3xl shadow-xs">
                    {smartHero.event.emoji || getCategoryMeta(smartHero.event.type).emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className={cn("uppercase text-[10px] font-black tracking-wider border rounded-full px-2.5 py-0.5", getCategoryMeta(smartHero.event.type).badgeBg)}>
                        {smartHero.heroType.startsWith("today")
                          ? `TODAY'S ${smartHero.event.type.toUpperCase()}`
                          : `UPCOMING IN ${smartHero.event.daysLeft} DAY${smartHero.event.daysLeft > 1 ? "S" : ""}`}
                      </Badge>
                      {smartHero.event.relationship && (
                        <span className="text-xs text-muted-foreground font-semibold">({smartHero.event.relationship})</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">{smartHero.event.title}</h2>
                    <p className="text-muted-foreground text-xs font-semibold flex items-center gap-2 mt-1">
                      <CalendarDays className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      {format(smartHero.event.nextDate, "EEEE, MMMM do, yyyy")}
                      {getAgeInfo(smartHero.event.date, smartHero.event.type) && (
                        <span className="text-amber-600 font-bold">
                          • Turning {getAgeInfo(smartHero.event.date, smartHero.event.type)?.upcomingAge}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto">
                  <div className="text-right">
                    {smartHero.event.daysLeft === 0 ? (
                      <span className="text-base font-black text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                        Today! 🎉
                      </span>
                    ) : (
                      <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">
                        {smartHero.event.daysLeft} Days Left
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Clean Empty Hero State (No events today or near) */
            <div className="bg-card/90 dark:bg-card/70 backdrop-blur-xl border border-[#ECECF2] dark:border-border/60 rounded-3xl p-6 relative overflow-hidden shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-base">No celebrations today</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {smartHero.event
                      ? `Next event: "${smartHero.event.title}" on ${format(smartHero.event.nextDate, "MMM d")} (${smartHero.event.daysLeft} days remaining)`
                      : "Add your upcoming birthdays, festivals, and meetings to get started!"}
                  </p>
                </div>
              </div>

              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs px-4 py-2 self-start md:self-auto">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Special Day
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Modern Filter Chips Bar */}
      <div className="shrink-0 overflow-x-auto scrollbar-hide py-1">
        <div className="flex items-center gap-2 min-w-max">
          {FILTER_CHIPS.map((chip) => {
            const isSelected = activeFilter === chip.value;
            return (
              <button
                key={chip.value}
                onClick={() => setActiveFilter(chip.value)}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 border flex items-center gap-1.5",
                  isSelected
                    ? "bg-purple-600 border-purple-600 text-white shadow-xs scale-[1.02]"
                    : "bg-card/70 border-[#ECECF2] dark:border-border/60 text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Search, Sort, View Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-card/60 backdrop-blur-md p-2.5 rounded-3xl border border-[#ECECF2] dark:border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by name, notes, category, email, gift ideas..."
            className="pl-10 bg-card border-[#ECECF2] dark:border-border/50 rounded-2xl text-sm focus-visible:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-card border border-[#ECECF2] dark:border-border/60 rounded-xl px-3 py-2 text-xs font-extrabold text-foreground focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="nearest">Sort: Nearest First</option>
              <option value="oldest">Sort: Oldest Date</option>
              <option value="newest">Sort: Newest Date</option>
              <option value="title">Sort: Alphabetical (A-Z)</option>
              <option value="category">Sort: Category</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-[#ECECF2] dark:border-border/60">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={cn("w-8 h-8 rounded-lg", viewMode === "grid" ? "bg-purple-600 text-white" : "text-muted-foreground")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("calendar")}
              className={cn("w-8 h-8 rounded-lg", viewMode === "calendar" ? "bg-purple-600 text-white" : "text-muted-foreground")}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Events Grid / Calendar Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">Syncing special days...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Gift className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">No Special Days Found</h3>
            <p className="max-w-md text-muted-foreground text-sm mb-6">
              {searchQuery
                ? `No events matching "${searchQuery}". Try clearing search or filters.`
                : "Start adding birthdays, anniversaries, meetings, achievements, and festivals to keep track."}
            </p>
            <Button
              onClick={handleCreate}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl px-6"
            >
              <Plus className="w-4 h-4 mr-2" /> Create First Special Day
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
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pb-16">
            <AnimatePresence>
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-[260px] flex flex-col h-full"
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

      {/* Modals & Dialogs */}
      <SpecialDayProfile open={profileOpen} onOpenChange={setProfileOpen} specialDay={selectedEvent} onEdit={handleEdit} onDelete={(id) => setDeleteId(id)} />
      <ScheduledEmailsModal open={scheduledEmailsOpen} onOpenChange={setScheduledEmailsOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-background border-border text-foreground rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete Special Day?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This event and all associated planning notes and scheduled email wishes will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold">
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
