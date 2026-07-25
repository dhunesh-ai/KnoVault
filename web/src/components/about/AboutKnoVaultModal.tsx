"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  X,
  Sparkles,
  StickyNote,
  Target,
  FolderKanban,
  Calendar,
  Users,
  Gift,
  Pill,
  HardDrive,
  RefreshCw,
  Lock,
  Zap,
  Share2,
  Star,
  Bug,
  Lightbulb,
  Mail,
  Heart,
  ArrowRight,
  LayoutDashboard,
  Cpu,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface AboutKnoVaultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    notes: number;
    reminders: number;
    projects: number;
    goals: number;
    specialDays: number;
    medicines: number;
    aiThreads: number;
  };
  onOpenBugReport: () => void;
  onOpenFeatureRequest: () => void;
}

export function AboutKnoVaultModal({
  open,
  onOpenChange,
  stats,
  onOpenBugReport,
  onOpenFeatureRequest,
}: AboutKnoVaultModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  const handleOpenAI = () => {
    onOpenChange(false);
    router.push("/ai");
  };

  const handleShareApp = async () => {
    if (typeof window === "undefined") return;
    const shareData = {
      title: "KnoVault",
      text: "Check out KnoVault — Your Intelligent Personal Knowledge Hub!",
      url: window.location.origin,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Thanks for sharing KnoVault!");
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(window.location.origin);
      toast.success("KnoVault link copied to clipboard!");
    }
  };

  const handleRateApp = () => {
    toast.success("Thank you for rating KnoVault! ⭐⭐⭐⭐⭐");
  };

  const currentYear = new Date().getFullYear();

  const overlayContent = (
    <div className="fixed top-0 bottom-0 right-0 left-0 md:left-72 z-40 bg-background text-foreground flex flex-col overflow-hidden animate-in fade-in duration-200 shadow-2xl">
      
      {/* 1. FIXED TOP DESKTOP HEADER (72px) */}
      <header className="w-full h-18 px-6 sm:px-10 border-b border-border/40 bg-card/85 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-md text-white">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
              About KnoVault
              <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] px-2.5 py-0.5 rounded-full">
                v2.4.0
              </Badge>
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">
              Product Details, Capabilities & Ecosystem
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="rounded-full w-10 h-10 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Close About KnoVault"
        >
          <X className="w-5.5 h-5.5" />
        </Button>
      </header>

      {/* 2. SCROLLABLE MAIN CONTENT BODY */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full scrollbar-thin">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-8 sm:py-10 pb-20 space-y-12">
          
          {/* HERO SECTION */}
          <div className="text-center space-y-4 max-w-3xl mx-auto pt-2 pb-2">
            <div className="relative inline-block">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-tr from-primary via-purple-600 to-indigo-500 p-1 shadow-xl shadow-primary/25 flex items-center justify-center">
                <div className="w-full h-full rounded-[22px] bg-card flex items-center justify-center text-primary">
                  <Shield className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
                KNOVAULT
              </h1>
              <p className="text-sm sm:text-base font-extrabold text-primary tracking-wide">
                Your Intelligent Personal Knowledge Hub
              </p>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground max-w-xl mx-auto pt-1">
                Organize knowledge • Increase productivity • Build your second brain
              </p>
              <div className="pt-1">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black text-[11px] px-3 py-1 rounded-full">
                  Version 2.4.0
                </Badge>
              </div>
            </div>
          </div>

          {/* WHAT IS KNOVAULT */}
          <div className="max-w-[900px] mx-auto p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20 text-center space-y-2 shadow-2xs">
            <div className="font-black text-primary flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> WHAT IS KNOVAULT?
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed max-w-3xl mx-auto">
              KnoVault is an intelligent personal knowledge and productivity workspace that brings notes, reminders, projects, goals, calendar and AI assistance together in one secure, local-first platform.
            </p>
          </div>

          {/* KNOVAULT AT A GLANCE (3 COLS x 2 ROWS DESKTOP) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <LayoutDashboard className="w-4.5 h-4.5 text-primary" /> KNOVAULT AT A GLANCE
              </h3>
              <span className="text-xs font-bold text-muted-foreground">Live Workspace Metrics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              <div className="p-5 min-h-[120px] rounded-2xl bg-card border border-border/60 hover:border-blue-500/40 flex items-center gap-4 transition-all shadow-2xs">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 shrink-0">
                  <StickyNote className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground">{stats.notes}</div>
                  <p className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">Notes (Captured Ideas)</p>
                </div>
              </div>

              <div className="p-5 min-h-[120px] rounded-2xl bg-card border border-border/60 hover:border-emerald-500/40 flex items-center gap-4 transition-all shadow-2xs">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground">{stats.goals}</div>
                  <p className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">Goals (Milestones Set)</p>
                </div>
              </div>

              <div className="p-5 min-h-[120px] rounded-2xl bg-card border border-border/60 hover:border-purple-500/40 flex items-center gap-4 transition-all shadow-2xs">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 shrink-0">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground">{stats.projects}</div>
                  <p className="text-xs font-extrabold text-purple-600 uppercase tracking-wider">Projects (Work Streams)</p>
                </div>
              </div>

              <div className="p-5 min-h-[120px] rounded-2xl bg-card border border-border/60 hover:border-amber-500/40 flex items-center gap-4 transition-all shadow-2xs">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground">{stats.reminders}</div>
                  <p className="text-xs font-extrabold text-amber-600 uppercase tracking-wider">Reminders (Active Schedules)</p>
                </div>
              </div>

              <div className="p-5 min-h-[120px] rounded-2xl bg-card border border-border/60 hover:border-indigo-500/40 flex items-center gap-4 transition-all shadow-2xs">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground">1</div>
                  <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Workspaces (Active Workspace)</p>
                </div>
              </div>

              <div className="p-5 min-h-[120px] rounded-2xl bg-card border border-border/60 hover:border-rose-500/40 flex items-center gap-4 transition-all shadow-2xs">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 shrink-0">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground">{stats.specialDays}</div>
                  <p className="text-xs font-extrabold text-rose-600 uppercase tracking-wider">Special Days (Events & Wishes)</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI ASSISTANT FEATURE BANNER */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-primary/15 via-purple-600/10 to-indigo-500/10 border border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-primary text-primary-foreground shadow-md shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-base sm:text-lg font-black text-foreground">KnoVault AI Assistant</h4>
                  <Badge className="bg-emerald-500 text-white font-black text-xs px-3 py-0.5 rounded-full shadow-xs">
                    Active & Ready ⚡
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground max-w-xl">
                  Summarize, search, and organize your personal knowledge instantly.
                </p>
              </div>
            </div>

            <Button
              onClick={handleOpenAI}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm h-11 px-6 rounded-2xl shrink-0 shadow-md gap-2"
            >
              Open AI <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* FEATURE HIGHLIGHTS (3 COLUMNS DESKTOP) */}
          <div className="space-y-4">
            <div className="border-b border-border/50 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-primary" /> FEATURE HIGHLIGHTS
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 w-fit">
                  <StickyNote className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">Smart Notes</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Rich note-taking, checklists, voice attachments, categories, and fast full-text search.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 w-fit">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">AI Assistant</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Summarize and search personal knowledge instantly with context-aware AI intelligence.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 w-fit">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">Smart Calendar</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Combine time-based reminders, schedules, calendar notes, and milestone deadlines.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 w-fit">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">Goal Tracking</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Set daily goals, project milestones, track completion rates, and calculate daily streak metrics.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 w-fit">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">Workspaces</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Organize project tasks, divide work streams, and maintain structured productivity environments.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 w-fit">
                  <Gift className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">Special Days</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Never forget birthdays, anniversaries, and key occasions with automated scheduled wish reminders.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-500 w-fit">
                  <Pill className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">Medicine Tracking</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Log medication doses, set daily schedules, track intake, and stay consistent with health alerts.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500 w-fit">
                  <HardDrive className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">Cloud Sync</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Automatic data synchronization with FastAPI backend database storage and local client caching.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 space-y-2.5 shadow-2xs">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 w-fit">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-foreground">Smart Reminders</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  Browser notification alerts, custom reminder frequencies, and sound effects.
                </p>
              </div>
            </div>
          </div>

          {/* WHY CHOOSE KNOVAULT */}
          <div className="space-y-4">
            <div className="border-b border-border/50 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Zap className="w-4.5 h-4.5 text-primary" /> WHY CHOOSE KNOVAULT
              </h3>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border/60 text-center space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Badge variant="outline" className="bg-muted/40 px-4 py-2 rounded-2xl text-xs font-black border-border/60 gap-2 shadow-2xs">
                  ⚡ Fast
                </Badge>
                <Badge variant="outline" className="bg-muted/40 px-4 py-2 rounded-2xl text-xs font-black border-border/60 gap-2 shadow-2xs">
                  🛡 Secure
                </Badge>
                <Badge variant="outline" className="bg-muted/40 px-4 py-2 rounded-2xl text-xs font-black border-border/60 gap-2 shadow-2xs">
                  ☁ Cloud Backup
                </Badge>
                <Badge variant="outline" className="bg-muted/40 px-4 py-2 rounded-2xl text-xs font-black border-border/60 gap-2 shadow-2xs">
                  ✨ AI Powered
                </Badge>
                <Badge variant="outline" className="bg-muted/40 px-4 py-2 rounded-2xl text-xs font-black border-border/60 gap-2 shadow-2xs">
                  👥 Collaboration
                </Badge>
                <Badge variant="outline" className="bg-muted/40 px-4 py-2 rounded-2xl text-xs font-black border-border/60 gap-2 shadow-2xs">
                  🎨 Beautiful UI
                </Badge>
                <Badge variant="outline" className="bg-muted/40 px-4 py-2 rounded-2xl text-xs font-black border-border/60 gap-2 shadow-2xs">
                  💻 Desktop Web Optimized
                </Badge>
              </div>
            </div>
          </div>

          {/* HOW KNOVAULT WORKS (STEPPER) */}
          <div className="space-y-4">
            <div className="border-b border-border/50 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Cpu className="w-4.5 h-4.5 text-primary" /> HOW KNOVAULT WORKS
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-3xl bg-card border border-border/60 text-center space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center mx-auto shadow-md">
                  01
                </div>
                <h4 className="text-sm font-black text-foreground">Capture</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">Notes, voice and ideas instantly captured.</p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 text-center space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center mx-auto shadow-md">
                  02
                </div>
                <h4 className="text-sm font-black text-foreground">Organize</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">Structure your knowledge & workspaces.</p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 text-center space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center mx-auto shadow-md">
                  03
                </div>
                <h4 className="text-sm font-black text-foreground">Plan</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">Reminders, calendar & goal milestones.</p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 text-center space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center mx-auto shadow-md">
                  04
                </div>
                <h4 className="text-sm font-black text-foreground">Achieve</h4>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">Track progress & boost productivity.</p>
              </div>
            </div>
          </div>

          {/* SECURITY, STORAGE & ACCESS (2x2 GRID) */}
          <div className="space-y-4">
            <div className="border-b border-border/50 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Lock className="w-4.5 h-4.5 text-primary" /> SECURITY, STORAGE & ACCESS
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-2 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-foreground">Cloud Storage</h4>
                </div>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed pt-1">
                  5.0 MB cloud storage quota per account for your notes, reminders, and database records.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-2 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-foreground">Smart Sync</h4>
                </div>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed pt-1">
                  Automatic data synchronization with FastAPI backend database storage and client caching.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-2 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-foreground">Account Protection</h4>
                </div>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed pt-1">
                  Password protected authentication with 6-digit OTP email verification and JWT tokens.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-2 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-foreground">Local-First Caching</h4>
                </div>
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed pt-1">
                  Client-side Zustand state persistence for instantaneous interface rendering.
                </p>
              </div>
            </div>
          </div>

          {/* SUPPORT & COMMUNITY */}
          <div className="space-y-4">
            <div className="border-b border-border/50 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-primary" /> SUPPORT & COMMUNITY
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                onClick={handleRateApp}
                className="p-5 rounded-2xl bg-card hover:bg-muted border border-border/60 text-center space-y-2 transition-all group shadow-2xs cursor-pointer"
              >
                <Star className="w-6 h-6 text-amber-500 mx-auto group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-foreground">Rate App</p>
              </button>

              <button
                onClick={handleShareApp}
                className="p-5 rounded-2xl bg-card hover:bg-muted border border-border/60 text-center space-y-2 transition-all group shadow-2xs cursor-pointer"
              >
                <Share2 className="w-6 h-6 text-blue-500 mx-auto group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-foreground">Share App</p>
              </button>

              <button
                onClick={() => {
                  onOpenChange(false);
                  onOpenBugReport();
                }}
                className="p-5 rounded-2xl bg-card hover:bg-muted border border-border/60 text-center space-y-2 transition-all group shadow-2xs cursor-pointer"
              >
                <Bug className="w-6 h-6 text-rose-500 mx-auto group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-foreground">Report Bug</p>
              </button>

              <button
                onClick={() => {
                  onOpenChange(false);
                  onOpenFeatureRequest();
                }}
                className="p-5 rounded-2xl bg-card hover:bg-muted border border-border/60 text-center space-y-2 transition-all group shadow-2xs cursor-pointer"
              >
                <Lightbulb className="w-6 h-6 text-amber-500 mx-auto group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-foreground">Feature Request</p>
              </button>
            </div>

            <div className="text-center pt-3">
              <a
                href="mailto:thinkgood24hrs@gmail.com?subject=KnoVault%20Support%20Inquiry"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <Mail className="w-4 h-4" /> Contact Support (thinkgood24hrs@gmail.com)
              </a>
            </div>
          </div>

          {/* THANK YOU / BRAND MESSAGE & FOOTER */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-card to-muted/40 border border-border/50 text-center space-y-4 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Heart className="w-5 h-5 fill-rose-500/20" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground">Thank you for choosing KnoVault</h3>
              <p className="text-xs sm:text-sm font-extrabold text-primary tracking-wide">
                Organize Knowledge. Increase Productivity. Build Your Second Brain.
              </p>
            </div>

            <div className="pt-2 text-xs font-semibold text-muted-foreground space-y-0.5 border-t border-border/30 max-w-xs mx-auto">
              <p>KnoVault v2.4.0</p>
              <p>© {currentYear} KnoVault</p>
            </div>
          </div>

          {/* BOTTOM CLOSE BUTTON */}
          <div className="text-center pt-2 pb-6">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-10 rounded-2xl font-bold text-xs sm:text-sm border-border/60 hover:bg-muted shadow-xs"
            >
              Close About
            </Button>
          </div>

        </div>
      </main>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
