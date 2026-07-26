/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSettingsStore, ACCENT_COLOR_MAP, AccentColor, ThemeMode, NotificationPreferences } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Moon,
  Bell,
  LogOut,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  HardDrive,
  LayoutDashboard,
  StickyNote,
  Target,
  Gift,
  Pill,
  MessageSquare,
  Camera,
  User,
  Palette,
  Sliders,
  Activity,
  LifeBuoy,
  Bug,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  Shield,
  FileText,
  Clock,
  Send,
  Edit3,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AvatarPickerModal } from "@/components/profile/AvatarPickerModal";
import { AboutKnoVaultModal } from "@/components/about/AboutKnoVaultModal";

const ACCENT_COLORS: { name: AccentColor; hex: string; bg: string; ring: string }[] = [
  { name: "Purple", hex: "#7C4DFF", bg: "bg-purple-600", ring: "ring-purple-500" },
  { name: "Blue", hex: "#3B82F6", bg: "bg-blue-600", ring: "ring-blue-500" },
  { name: "Green", hex: "#10B981", bg: "bg-emerald-600", ring: "ring-emerald-500" },
  { name: "Orange", hex: "#F97316", bg: "bg-orange-600", ring: "ring-orange-500" },
  { name: "Pink", hex: "#F43F5E", bg: "bg-rose-600", ring: "ring-rose-500" },
];

interface DerivedActivity {
  id: string;
  title: string;
  timestamp: string;
  dateObj: Date;
  icon: any;
  iconColor: string;
  iconBg: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme();
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    compactMode,
    setCompactMode,
    reduceMotion,
    setReduceMotion,
    notificationsEnabled,
    setNotificationsEnabled,
    notificationPreferences,
    setNotificationPreference,
  } = useSettingsStore();

  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  // Avatar Picker Modal State
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("🧠");

  // Profile Edit State
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notifications Accordion State
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);

  // Security Center State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"request" | "otp" | "new_password">("request");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cloud Storage State
  const [storageStats, setStorageStats] = useState<{
    usedBytes: number;
    limitBytes: number;
    remainingBytes: number;
    percentUsed: number;
  }>({
    usedBytes: 0,
    limitBytes: 5 * 1024 * 1024,
    remainingBytes: 5 * 1024 * 1024,
    percentUsed: 0,
  });
  const [isRefreshingStorage, setIsRefreshingStorage] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  // Modals for Support & Legal Hub
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);

  // Support Form Inputs
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [featureBenefit, setFeatureBenefit] = useState("");
  const [featurePriority, setFeaturePriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);

  // Stats State
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    notes: 0,
    reminders: 0,
    projects: 0,
    goals: 0,
    specialDays: 0,
    medicines: 0,
    aiThreads: 0,
  });

  // Recent Activities
  const [recentActivities, setRecentActivities] = useState<DerivedActivity[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("knovault_user_avatar");
      if (saved) {
        setUserAvatar(saved);
      } else if (user?.avatar_url) {
        setUserAvatar(user.avatar_url);
      }
      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
    }
  }, [user]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setNextTheme(newTheme);
    toast.success(`Theme updated to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`);
  };

  const handleAccentChange = (color: AccentColor) => {
    setAccentColor(color);
    toast.success(`Accent color updated to ${color}`);
  };

  const handleSaveAvatar = async (newAvatar: string) => {
    setUserAvatar(newAvatar);
    if (typeof window !== "undefined") {
      localStorage.setItem("knovault_user_avatar", newAvatar);
    }
    try {
      const res = await api.put("/api/profile", { avatar_url: newAvatar });
      if (res.data && user) {
        setUser({ ...user, avatar_url: newAvatar });
      }
    } catch (err) {
      console.error("Avatar sync error:", err);
    }
    toast.success("Avatar updated successfully.");
  };

  const handleOpenEditProfile = () => {
    setEditFullName(user?.full_name || "");
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      toast.error("Full Name cannot be empty.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await api.put("/api/profile", { full_name: editFullName.trim() });
      if (res.data && user) {
        setUser({ ...user, full_name: res.data.full_name });
      }
      toast.success("Profile updated successfully");
      setEditProfileOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon 👋";
    return "Good Evening 👋";
  };

  // Resend OTP Cooldown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Fetch Stats & Storage & Real Activity
  const fetchAllData = async () => {
    try {
      setIsLoadingStats(true);
      const [notesRes, remindersRes, projectsRes, goalsRes, specialDaysRes, storageRes, aiRes] = await Promise.all([
        api.get("/api/notes").catch(() => ({ data: [] })),
        api.get("/api/reminders").catch(() => ({ data: [] })),
        api.get("/api/projects").catch(() => ({ data: [] })),
        api.get("/api/goals").catch(() => ({ data: [] })),
        api.get("/api/important-days").catch(() => ({ data: [] })),
        api.get("/api/profile/storage").catch(() => null),
        api.get("/api/ai/history").catch(() => ({ data: { chats: [], total: 0 } })),
      ]);

      const notesData = notesRes.data || [];
      const remindersData = remindersRes.data || [];
      const projectsData = projectsRes.data || [];
      const goalsData = goalsRes.data || [];
      const specialDaysData = specialDaysRes.data || [];
      const aiData = aiRes.data?.chats || [];
      const medicinesData = remindersData.filter((r: any) => r.reminder_type === "medicine");

      setStats({
        notes: notesData.length,
        reminders: remindersData.length - medicinesData.length,
        projects: projectsData.length,
        goals: goalsData.length,
        specialDays: specialDaysData.length,
        medicines: medicinesData.length,
        aiThreads: aiRes.data?.total || aiData.length,
      });

      if (storageRes?.data) {
        setStorageStats({
          usedBytes: storageRes.data.used_bytes,
          limitBytes: storageRes.data.limit_bytes,
          remainingBytes: storageRes.data.remaining_bytes,
          percentUsed: storageRes.data.percent_used,
        });
      }

      // Derive Real Activities
      const activities: DerivedActivity[] = [];

      notesData.slice(0, 5).forEach((n: any) => {
        activities.push({
          id: `note-${n.id}`,
          title: `Created Note: "${n.title || "Untitled Note"}"`,
          timestamp: n.created_at ? new Date(n.created_at).toLocaleDateString() : "Recently",
          dateObj: new Date(n.created_at || Date.now()),
          icon: StickyNote,
          iconColor: "text-blue-500",
          iconBg: "bg-blue-500/10",
        });
      });

      goalsData.slice(0, 5).forEach((g: any) => {
        activities.push({
          id: `goal-${g.id}`,
          title: `${g.completed ? "Completed" : "Created"} Goal: "${g.title}"`,
          timestamp: g.created_at ? new Date(g.created_at).toLocaleDateString() : "Recently",
          dateObj: new Date(g.created_at || Date.now()),
          icon: Target,
          iconColor: "text-emerald-500",
          iconBg: "bg-emerald-500/10",
        });
      });

      specialDaysData.slice(0, 5).forEach((s: any) => {
        activities.push({
          id: `sd-${s.id}`,
          title: `Added Special Day: "${s.title}"`,
          timestamp: s.created_at ? new Date(s.created_at).toLocaleDateString() : "Recently",
          dateObj: new Date(s.created_at || Date.now()),
          icon: Gift,
          iconColor: "text-rose-500",
          iconBg: "bg-rose-500/10",
        });
      });

      remindersData.slice(0, 5).forEach((r: any) => {
        activities.push({
          id: `rem-${r.id}`,
          title: `Added Reminder: "${r.title}"`,
          timestamp: r.reminder_date ? new Date(r.reminder_date).toLocaleDateString() : "Recently",
          dateObj: new Date(r.reminder_date || Date.now()),
          icon: Bell,
          iconColor: "text-amber-500",
          iconBg: "bg-amber-500/10",
        });
      });

      activities.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      setRecentActivities(activities.slice(0, 4));
    } catch (error) {
      console.error("Failed to fetch profile stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSyncCloudStorage = async () => {
    setIsRefreshingStorage(true);
    await fetchAllData();
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setIsRefreshingStorage(false);
    toast.success("Cloud storage synced successfully");
  };

  const handleNotificationMasterRequest = async (checked: boolean) => {
    if (checked) {
      if (!("Notification" in window)) {
        toast.error("This browser does not support notifications");
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Notifications enabled");
      } else {
        toast.error("Notification permission denied");
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
      toast.info("Master notifications disabled");
    }
  };

  const handleToggleSubNotification = (key: keyof NotificationPreferences, value: boolean) => {
    setNotificationPreference(key, value);
    toast.success("Notification preferences updated");
  };

  // Security Center Handlers
  const handleRequestPasswordChange = async () => {
    if (!user?.email) return;
    setIsPasswordLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: user.email });
      toast.success("Verification code sent to your email!");
      setPasswordStep("otp");
      setResendCooldown(60);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to send OTP.");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6 || !user?.email) return;
    setIsPasswordLoading(true);
    try {
      await api.post("/api/auth/verify-otp", { email: user.email, code: otpCode });
      setPasswordStep("new_password");
      toast.success("OTP verified. Enter your new password.");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Invalid code.");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!user?.email) return;
    setIsPasswordLoading(true);
    try {
      await api.post("/api/auth/reset-password", { email: user.email, code: otpCode, new_password: password });
      toast.success("Password updated successfully. Please log in again.");
      setPassword("");
      setOtpCode("");
      setIsChangingPassword(false);
      setPasswordStep("request");
      setTimeout(() => logout(), 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to reset password.");
      if (error.response?.data?.detail === "Invalid or expired OTP") {
        setPasswordStep("otp");
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Submit Bug Report
  const handleSubmitBug = async () => {
    if (!bugTitle.trim() || !bugDescription.trim()) {
      toast.error("Please provide a title and description.");
      return;
    }
    setIsSubmittingBug(true);
    try {
      await api.post("/api/profile/bug-report", {
        title: bugTitle.trim(),
        description: bugDescription.trim(),
        steps_to_reproduce: bugSteps.trim() || "N/A",
        device_info: typeof window !== "undefined" ? window.navigator.userAgent : "Web Application",
        app_version: "v2.4.0",
      });
      toast.success("Bug report submitted successfully. Thank you!");
      setBugTitle("");
      setBugDescription("");
      setBugSteps("");
      setBugModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to submit bug report.");
    } finally {
      setIsSubmittingBug(false);
    }
  };

  // Submit Feature Request
  const handleSubmitFeature = async () => {
    if (!featureTitle.trim() || !featureDescription.trim()) {
      toast.error("Please provide a title and description.");
      return;
    }
    setIsSubmittingFeature(true);
    try {
      await api.post("/api/profile/feature-request", {
        title: featureTitle.trim(),
        description: featureDescription.trim(),
        expected_benefit: featureBenefit.trim() || "Enhanced workflow",
        priority: featurePriority,
      });
      toast.success("Feature request submitted successfully!");
      setFeatureTitle("");
      setFeatureDescription("");
      setFeatureBenefit("");
      setFeatureModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to submit feature request.");
    } finally {
      setIsSubmittingFeature(false);
    }
  };

  // Calculate storage numbers
  const usedMB = (storageStats.usedBytes / 1024 / 1024).toFixed(2);
  const usedKB = (storageStats.usedBytes / 1024).toFixed(1);
  const usedDisplay = storageStats.usedBytes >= 1024 * 1024 ? `${usedMB} MB` : `${usedKB} KB`;

  const limitMB = (storageStats.limitBytes / 1024 / 1024).toFixed(1);
  const remainingMB = (storageStats.remainingBytes / 1024 / 1024).toFixed(2);
  const remainingKB = (storageStats.remainingBytes / 1024).toFixed(1);
  const remainingDisplay = storageStats.remainingBytes >= 1024 * 1024 ? `${remainingMB} MB` : `${remainingKB} KB`;

  const storageProgress = Math.min(1, storageStats.usedBytes / storageStats.limitBytes);
  let storageColor = "#10B981";
  if (storageProgress >= 0.9) storageColor = "#EF4444";
  else if (storageProgress >= 0.7) storageColor = "#F59E0B";

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
  };

  return (
    <div className="max-w-[1500px] mx-auto space-y-8 pb-20">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            Account Profile & Settings
          </h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1.5">
            Manage your personal profile, personalization studio, notifications, and security.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black text-xs px-3.5 py-1.5 rounded-full shadow-xs">
            {user?.is_verified ? "Verified Account 🟢" : "Standard Account"}
          </Badge>
        </div>
      </div>

      {/* 3-COLUMN DESKTOP LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: PROFILE CARD SIDEBAR (4 COLS / 30% WIDTH) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card/90 backdrop-blur-xl border border-primary/20 p-8 rounded-[28px] flex flex-col items-center text-center shadow-lg relative overflow-hidden space-y-6"
          >
            <div className="absolute top-0 left-0 w-full h-36 bg-gradient-to-br from-primary/20 via-pink-500/10 to-transparent pointer-events-none" />

            {/* Avatar & Camera Trigger */}
            <div className="relative mt-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAvatarModalOpen(true)}
                className="w-36 h-36 rounded-full bg-gradient-to-tr from-primary to-pink-500 p-1.5 shadow-2xl shadow-primary/20 cursor-pointer group transition-all"
              >
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-6xl font-black text-foreground relative overflow-hidden group-hover:bg-primary/10 transition-colors">
                  {userAvatar || user?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
              </motion.div>
              <div className="absolute bottom-1 right-1 bg-emerald-500 p-2 rounded-full border-4 border-card shadow-md" title="Verified Account">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <button
                onClick={() => setAvatarModalOpen(true)}
                className="absolute top-0 right-0 p-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform hover:scale-110"
                title="Change Avatar"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Greeting & User Details */}
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                {getGreeting()}
              </span>
              <h2 className="text-2xl font-black text-foreground tracking-tight pt-2">
                {user?.full_name || "User"} {userAvatar}
              </h2>
              <p className="text-xs text-muted-foreground font-semibold">{user?.email || "user@knovault.app"}</p>
            </div>

            {/* Account Status Badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-xs px-3 py-1 rounded-xl">
                🟢 Active
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-xs px-3 py-1 rounded-xl">
                Verified User
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-xs px-3 py-1 rounded-xl">
                Cloud Synced
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2.5 pt-2">
              <Button onClick={handleOpenEditProfile} className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-md shadow-primary/20">
                <Edit3 className="w-4 h-4 mr-2" /> Edit Profile Information
              </Button>
              <Button
                variant="outline"
                onClick={() => setAvatarModalOpen(true)}
                className="w-full h-11 rounded-2xl border-border/60 text-xs font-bold gap-2 hover:bg-primary/10 hover:border-primary/30"
              >
                <Sparkles className="w-4 h-4 text-primary" /> Change Avatar
              </Button>
            </div>

            {/* Quote Box */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 text-xs italic text-muted-foreground font-medium text-center leading-relaxed">
              "Stay focused, organized, and secure every single day."
            </div>

            {/* Danger Zone */}
            <div className="w-full pt-4 border-t border-border/40">
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full h-11 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-black text-xs gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out of Account
              </Button>
            </div>
          </motion.div>
        </div>

        {/* RIGHT MAIN WORKSPACE (8 COLS / 70% WIDTH) */}
        <motion.div variants={containerVariants} className="lg:col-span-8 space-y-8">
          {/* SECTION 1: PRODUCTIVITY METRICS STUDIO */}
          <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-7 rounded-[28px] shadow-xs space-y-5">
            <h3 className="text-base font-black text-foreground flex items-center gap-2.5 border-b border-border/50 pb-3">
              <LayoutDashboard className="w-5 h-5 text-primary" /> PRODUCTIVITY METRICS STUDIO
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-[20px] bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-500 text-white">
                    <StickyNote className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase">Notes</span>
                </div>
                <div className="text-2xl font-black text-foreground">{isLoadingStats ? "..." : stats.notes}</div>
                <p className="text-[10px] text-muted-foreground font-bold">Captured Ideas</p>
              </div>

              <div className="p-4 rounded-[20px] bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white">
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-amber-600 uppercase">Reminders</span>
                </div>
                <div className="text-2xl font-black text-foreground">{isLoadingStats ? "..." : stats.reminders}</div>
                <p className="text-[10px] text-muted-foreground font-bold">Active Schedules</p>
              </div>

              <div className="p-4 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Goals</span>
                </div>
                <div className="text-2xl font-black text-foreground">{isLoadingStats ? "..." : stats.goals}</div>
                <p className="text-[10px] text-muted-foreground font-bold">Milestones Set</p>
              </div>

              <div className="p-4 rounded-[20px] bg-rose-500/10 border border-rose-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-rose-500 text-white">
                    <Gift className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-rose-600 uppercase">Special Days</span>
                </div>
                <div className="text-2xl font-black text-foreground">{isLoadingStats ? "..." : stats.specialDays}</div>
                <p className="text-[10px] text-muted-foreground font-bold">Events & Wishes</p>
              </div>

              <div className="p-4 rounded-[20px] bg-teal-500/10 border border-teal-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-teal-500 text-white">
                    <Pill className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-teal-600 uppercase">Medicines</span>
                </div>
                <div className="text-2xl font-black text-foreground">{isLoadingStats ? "..." : stats.medicines}</div>
                <p className="text-[10px] text-muted-foreground font-bold">Doses Tracked</p>
              </div>

              <div className="p-4 rounded-[20px] bg-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-primary uppercase">AI Threads</span>
                </div>
                <div className="text-2xl font-black text-foreground">{isLoadingStats ? "..." : stats.aiThreads}</div>
                <p className="text-[10px] text-muted-foreground font-bold">Discussions</p>
              </div>
            </div>
          </motion.div>

          {/* SECTION 2: PERSONALIZATION STUDIO */}
          <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-7 rounded-[28px] shadow-xs space-y-6">
            <h3 className="text-base font-black text-foreground flex items-center gap-2.5 border-b border-border/50 pb-3">
              <Palette className="w-5 h-5 text-primary" /> PERSONALIZATION STUDIO
            </h3>

            <div className="space-y-4">
              {/* Theme Preference */}
              <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/40">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">Theme Preference</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold">Light, Dark, or System mode</p>
                  </div>
                </div>

                <Select value={theme} onValueChange={(v: ThemeMode) => handleThemeChange(v)}>
                  <SelectTrigger className="w-36 bg-card border-border/50 text-foreground rounded-xl h-10 text-xs font-extrabold">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 text-xs bg-card">
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accent Color Palette Selector */}
              <div className="p-5 bg-muted/30 rounded-2xl border border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-pink-500/10 rounded-xl text-pink-600">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-foreground">Accent Color Palette</h4>
                      <p className="text-[10px] text-muted-foreground font-semibold">Choose your UI highlight color</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-primary">{accentColor}</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  {ACCENT_COLORS.map((clr) => (
                    <button
                      key={clr.name}
                      onClick={() => handleAccentChange(clr.name)}
                      className={cn(
                        "w-9 h-9 rounded-full transition-transform flex items-center justify-center text-white",
                        clr.bg,
                        accentColor === clr.name ? `scale-110 ring-4 ${clr.ring} ring-offset-2 ring-offset-background` : "hover:scale-105"
                      )}
                    >
                      {accentColor === clr.name && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Mode & Reduce Motion Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
                  <div>
                    <span className="text-xs font-black text-foreground">Compact UI Mode</span>
                    <p className="text-[10px] text-muted-foreground font-medium">Slightly denser spacing & layout</p>
                  </div>
                  <Switch
                    checked={compactMode}
                    onCheckedChange={(v) => {
                      setCompactMode(v);
                      toast.info(v ? "Compact mode enabled" : "Comfortable spacing restored");
                    }}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
                  <div>
                    <span className="text-xs font-black text-foreground">Reduce Motion</span>
                    <p className="text-[10px] text-muted-foreground font-medium">Disable scale & slide animations</p>
                  </div>
                  <Switch
                    checked={reduceMotion}
                    onCheckedChange={(v) => {
                      setReduceMotion(v);
                      toast.info(v ? "Animations reduced" : "Animations enabled");
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* SECTION 3: NOTIFICATION CENTER */}
          <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-7 rounded-[28px] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-amber-500" /> NOTIFICATION CENTER
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setNotificationsExpanded(!notificationsExpanded)} className="text-xs font-bold">
                {notificationsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <div>
                <h4 className="text-xs font-black text-foreground">Master Notifications Switch</h4>
                <p className="text-[10px] text-muted-foreground font-semibold">Enable or disable all browser & system alerts</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationMasterRequest} />
            </div>

            {notificationsExpanded && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-xs font-extrabold text-foreground">Reminder Alerts</span>
                  <Switch
                    checked={notificationsEnabled && notificationPreferences.reminderAlerts}
                    disabled={!notificationsEnabled}
                    onCheckedChange={(v) => handleToggleSubNotification("reminderAlerts", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-xs font-extrabold text-foreground">Medicine Dose Alerts</span>
                  <Switch
                    checked={notificationsEnabled && notificationPreferences.medicineAlerts}
                    disabled={!notificationsEnabled}
                    onCheckedChange={(v) => handleToggleSubNotification("medicineAlerts", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-xs font-extrabold text-foreground">Goal Milestone Alerts</span>
                  <Switch
                    checked={notificationsEnabled && notificationPreferences.goalAlerts}
                    disabled={!notificationsEnabled}
                    onCheckedChange={(v) => handleToggleSubNotification("goalAlerts", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-xs font-extrabold text-foreground">Special Days & Birthday Alerts</span>
                  <Switch
                    checked={notificationsEnabled && notificationPreferences.specialDaysAlerts}
                    disabled={!notificationsEnabled}
                    onCheckedChange={(v) => handleToggleSubNotification("specialDaysAlerts", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/40">
                  <span className="text-xs font-extrabold text-foreground">Sound Effects</span>
                  <Switch
                    checked={notificationsEnabled && notificationPreferences.soundEffects}
                    disabled={!notificationsEnabled}
                    onCheckedChange={(v) => handleToggleSubNotification("soundEffects", v)}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* SECTION 4: SECURITY CENTER */}
          <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-7 rounded-[28px] shadow-xs space-y-6">
            <h3 className="text-base font-black text-foreground flex items-center gap-2.5 border-b border-border/50 pb-3">
              <ShieldCheck className="w-5 h-5 text-rose-500" /> SECURITY CENTER
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div>
                  <h4 className="text-xs font-black text-foreground">
                    {user?.is_verified ? "Account Status: Verified & Protected" : "Account Status: Password Protected"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-semibold">Account password & OTP verification active</p>
                </div>
                <Badge className="bg-emerald-600 text-white font-black text-xs">Secure 🔒</Badge>
              </div>

              {/* OTP Password Reset Workflow */}
              <div className="p-5 bg-muted/30 rounded-2xl border border-border/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-foreground">Account Password</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold">Protected with OTP email verification</p>
                  </div>
                  <Button variant="outline" onClick={() => setIsChangingPassword(!isChangingPassword)} className="h-9 px-4 rounded-xl text-xs font-bold">
                    {isChangingPassword ? "Cancel" : "Change Password"}
                  </Button>
                </div>

                {isChangingPassword && (
                  <div className="pt-4 border-t border-border/40 space-y-4">
                    {passwordStep === "request" && (
                      <div className="text-center space-y-3">
                        <p className="text-xs text-muted-foreground font-semibold">
                          We will send a 6-digit OTP to <strong>{user?.email}</strong>.
                        </p>
                        <Button
                          onClick={handleRequestPasswordChange}
                          disabled={isPasswordLoading}
                          className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                        >
                          {isPasswordLoading ? "Sending..." : "Send OTP Verification"}
                        </Button>
                      </div>
                    )}

                    {passwordStep === "otp" && (
                      <div className="space-y-3 text-center">
                        <p className="text-xs text-muted-foreground font-semibold">Enter the 6-digit OTP code sent to your email:</p>
                        <Input
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength={6}
                          className="text-center tracking-[0.5em] font-extrabold text-base h-11 bg-card rounded-xl"
                          placeholder="123456"
                        />
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setPasswordStep("request")} className="flex-1 h-10 rounded-xl text-xs font-bold">
                            Back
                          </Button>
                          <Button
                            onClick={handleVerifyOtp}
                            disabled={isPasswordLoading || otpCode.length !== 6}
                            className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                          >
                            {isPasswordLoading ? "Verifying..." : "Verify Code"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {passwordStep === "new_password" && (
                      <div className="space-y-3 text-center">
                        <p className="text-xs text-muted-foreground font-semibold">Enter your new secure password (min 6 characters):</p>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-10 bg-card rounded-xl text-xs"
                          placeholder="New password"
                        />
                        <Button
                          onClick={handleChangePassword}
                          disabled={isPasswordLoading}
                          className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          {isPasswordLoading ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* SECTION 5: CLOUD STORAGE & SYNC */}
          <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-7 rounded-[28px] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-blue-500" /> CLOUD STORAGE & SYNC
              </h3>
              <Button variant="ghost" size="sm" onClick={handleSyncCloudStorage} disabled={isRefreshingStorage} className="h-8 text-xs font-bold gap-1.5">
                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingStorage && "animate-spin")} />
                {isRefreshingStorage ? "Syncing..." : "Sync Storage"}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="text-foreground">
                  {isLoadingStats ? "..." : usedDisplay} / {limitMB} MB
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: storageColor, width: `${storageProgress * 100}%` }} />
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground pt-1">
                <span>Remaining Space: {isLoadingStats ? "..." : remainingDisplay}</span>
                <span>Last Sync: {lastSyncTime}</span>
              </div>

              {/* View Storage Details Navigation Option */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4.5 bg-primary/5 rounded-2xl border border-primary/20 gap-4 mt-2">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">Storage Center</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold">Manage cloud, local and Google Drive storage, backups & quotas</p>
                  </div>
                </div>
                <Link href="/settings/storage" className="w-full sm:w-auto">
                  <Button
                    onClick={() => router.push("/settings/storage")}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-xs cursor-pointer"
                  >
                    View Storage Details <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* SECTION 6: RECENT ACTIVITY TIMELINE */}
          <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-7 rounded-[28px] shadow-xs space-y-5">
            <h3 className="text-base font-black text-foreground flex items-center gap-2.5 border-b border-border/50 pb-3">
              <Activity className="w-5 h-5 text-emerald-500" /> RECENT ACTIVITY TIMELINE
            </h3>

            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div key={act.id} className="flex items-center gap-3.5 p-3.5 bg-muted/30 rounded-2xl border border-border/40 text-xs">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", act.iconBg, act.iconColor)}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-foreground truncate">{act.title}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">{act.timestamp}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground font-medium">No recent activity recorded yet.</div>
              )}
            </div>
          </motion.div>

          {/* SECTION 7: SUPPORT & LEGAL HUB */}
          <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-7 rounded-[28px] shadow-xs space-y-5">
            <h3 className="text-base font-black text-foreground flex items-center gap-2.5 border-b border-border/50 pb-3">
              <LifeBuoy className="w-5 h-5 text-sky-500" /> SUPPORT & LEGAL HUB
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setAboutModalOpen(true)}
                className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/40 text-center space-y-1 transition-colors"
              >
                <Shield className="w-5 h-5 text-primary mx-auto" />
                <p className="text-xs font-black text-foreground">About KnoVault</p>
              </button>
              <button
                onClick={() => setPrivacyModalOpen(true)}
                className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/40 text-center space-y-1 transition-colors"
              >
                <FileText className="w-5 h-5 text-blue-500 mx-auto" />
                <p className="text-xs font-black text-foreground">Privacy Policy</p>
              </button>
              <button
                onClick={() => setBugModalOpen(true)}
                className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/40 text-center space-y-1 transition-colors"
              >
                <Bug className="w-5 h-5 text-rose-500 mx-auto" />
                <p className="text-xs font-black text-foreground">Report Bug</p>
              </button>
              <button
                onClick={() => setFeatureModalOpen(true)}
                className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/40 text-center space-y-1 transition-colors"
              >
                <Lightbulb className="w-5 h-5 text-amber-500 mx-auto" />
                <p className="text-xs font-black text-foreground">Feature Request</p>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* AVATAR PICKER MODAL */}
      <AvatarPickerModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        currentAvatar={userAvatar}
        userName={user?.full_name || "User"}
        userEmail={user?.email || "user@knovault.app"}
        onSaveAvatar={handleSaveAvatar}
      />

      {/* EDIT PROFILE MODAL */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/60 text-foreground max-w-md w-full rounded-[24px] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" /> Edit Profile Information
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your account display name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold text-foreground">Full Name</label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1 bg-muted/40 border-border/50 rounded-xl text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Email Address (Immutable)</label>
              <Input value={user?.email || ""} disabled className="mt-1 bg-muted/60 border-border/40 rounded-xl text-xs font-semibold opacity-70" />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setEditProfileOpen(false)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black">
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ABOUT KNOVAULT MODAL */}
      <AboutKnoVaultModal
        open={aboutModalOpen}
        onOpenChange={setAboutModalOpen}
        stats={stats}
        onOpenBugReport={() => setBugModalOpen(true)}
        onOpenFeatureRequest={() => setFeatureModalOpen(true)}
      />

      {/* PRIVACY POLICY MODAL */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/60 text-foreground max-w-md w-full rounded-[24px] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> Privacy & Security Policy
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              How KnoVault protects your personal data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground max-h-[250px] overflow-y-auto pr-1">
            <p>
              <strong className="text-foreground">Data Ownership:</strong> You own 100% of your data. We never monetize or sell your personal notes, reminders, or schedules.
            </p>
            <p>
              <strong className="text-foreground">Encryption:</strong> Sensitive information (such as Secure Notes) is encrypted prior to storage and cannot be read by third-party services or KnoVault AI.
            </p>
            <p>
              <strong className="text-foreground">Authentication:</strong> Accounts are verified with 6-digit OTPs and protected with bcrypt hashed passwords.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setPrivacyModalOpen(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold w-full">
              Understand & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REPORT BUG MODAL */}
      <Dialog open={bugModalOpen} onOpenChange={setBugModalOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/60 text-foreground max-w-md w-full rounded-[24px] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-rose-500">
              <Bug className="w-5 h-5" /> Report a Bug
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Help us improve KnoVault by describing the issue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-foreground">Bug Title</label>
              <Input
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                placeholder="Short summary of the bug"
                className="mt-1 bg-muted/40 border-border/50 rounded-xl text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Description</label>
              <Textarea
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                placeholder="What happened unexpectedly?"
                className="mt-1 bg-muted/40 border-border/50 rounded-xl text-xs font-semibold min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Steps to Reproduce (Optional)</label>
              <Textarea
                value={bugSteps}
                onChange={(e) => setBugSteps(e.target.value)}
                placeholder="1. Go to page... 2. Click button..."
                className="mt-1 bg-muted/40 border-border/50 rounded-xl text-xs font-semibold min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setBugModalOpen(false)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSubmitBug} disabled={isSubmittingBug} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black gap-1.5">
              <Send className="w-3.5 h-3.5" /> {isSubmittingBug ? "Submitting..." : "Submit Bug"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FEATURE REQUEST MODAL */}
      <Dialog open={featureModalOpen} onOpenChange={setFeatureModalOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/60 text-foreground max-w-md w-full rounded-[24px] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-amber-500">
              <Lightbulb className="w-5 h-5" /> Request a Feature
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Share your idea for the next version of KnoVault.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-foreground">Feature Title</label>
              <Input
                value={featureTitle}
                onChange={(e) => setFeatureTitle(e.target.value)}
                placeholder="What feature would you like to see?"
                className="mt-1 bg-muted/40 border-border/50 rounded-xl text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Description & Details</label>
              <Textarea
                value={featureDescription}
                onChange={(e) => setFeatureDescription(e.target.value)}
                placeholder="Explain how this feature should work..."
                className="mt-1 bg-muted/40 border-border/50 rounded-xl text-xs font-semibold min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground">Expected Benefit</label>
                <Input
                  value={featureBenefit}
                  onChange={(e) => setFeatureBenefit(e.target.value)}
                  placeholder="Saves time, better UX"
                  className="mt-1 bg-muted/40 border-border/50 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground">Priority</label>
                <Select value={featurePriority} onValueChange={(v: any) => setFeaturePriority(v)}>
                  <SelectTrigger className="mt-1 bg-muted/40 border-border/50 rounded-xl text-xs font-semibold h-10">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 text-xs bg-card">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setFeatureModalOpen(false)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSubmitFeature} disabled={isSubmittingFeature} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black gap-1.5">
              <Send className="w-3.5 h-3.5" /> {isSubmittingFeature ? "Submitting..." : "Submit Feature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
