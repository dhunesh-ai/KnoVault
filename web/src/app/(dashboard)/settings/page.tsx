/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Moon, Bell, Lock, LogOut, Settings as SettingsIcon,
  ShieldAlert, Sparkles, CheckCircle2, ShieldCheck, 
  HardDrive, LayoutDashboard, StickyNote, Target, Gift
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { motion } from "framer-motion";

const StatCard = ({ icon: Icon, label, value, colorClass, isLoading }: any) => (
  <div className="flex items-center gap-3 p-4 bg-background/50 border border-border rounded-xl hover:bg-accent/50 transition-colors">
    <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-').replace('/10', '')}`} />
    </div>
    <div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-bold text-foreground tracking-tight">
        {isLoading ? <span className="animate-pulse bg-muted rounded h-6 w-10 inline-block" /> : value}
      </p>
    </div>
  </div>
);

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { 
    theme, setTheme, 
    notificationsEnabled, setNotificationsEnabled,
    aiVoiceEnabled, setAiVoiceEnabled,
    secureNotesTimeout, setSecureNotesTimeout
  } = useSettingsStore();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"request" | "otp" | "new_password">("request");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  const [stats, setStats] = useState({
    notes: 0,
    secureNotes: 0,
    reminders: 0,
    projects: 0,
    goals: 0,
    specialDays: 0,
    storageUsageBytes: 0,
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const CLOUD_LIMIT_MB = 5.0;
  const usedMB = parseFloat((stats.storageUsageBytes / 1024 / 1024).toFixed(2));
  const usedKB = parseFloat((stats.storageUsageBytes / 1024).toFixed(1));
  const usedString = usedMB >= 1 ? `${usedMB.toFixed(1)} MB` : `${usedKB} KB`;

  const remainingMBVal = Math.max(0, CLOUD_LIMIT_MB - usedMB);
  const remainingMB = remainingMBVal.toFixed(1);
  const remainingKB = parseFloat((remainingMBVal * 1024).toFixed(1));
  const remainingString = remainingMBVal >= 1 ? `${remainingMB} MB` : `${remainingKB} KB`;

  const storageProgress = Math.min(1, usedMB / CLOUD_LIMIT_MB);
  let storageColor = '#10B981'; // Green
  if (storageProgress >= 0.9) storageColor = '#EF4444'; // Red
  else if (storageProgress >= 0.7) storageColor = '#F59E0B'; // Orange

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        const [notesRes, remindersRes, projectsRes, goalsRes, specialDaysRes] = await Promise.all([
          api.get('/api/notes').catch(() => ({ data: [] })),
          api.get('/api/reminders').catch(() => ({ data: [] })),
          api.get('/api/projects').catch(() => ({ data: [] })),
          api.get('/api/goals').catch(() => ({ data: [] })),
          api.get('/api/special-days').catch(() => ({ data: [] }))
        ]);

        const notesData = notesRes.data || [];
        const remindersData = remindersRes.data || [];
        const projectsData = projectsRes.data || [];
        const goalsData = goalsRes.data || [];
        const specialDaysData = specialDaysRes.data || [];
        const statsData = await api.get('/api/profile/stats').then(res => res.data).catch(() => ({}));

        const workspaceData = { notes: notesData, reminders: remindersData, stats: statsData };
        const totalBytes = new Blob([JSON.stringify(workspaceData)]).size;
        
        setStats({
          notes: notesData.length,
          secureNotes: notesData.filter((n: any) => n.is_secure || n.category === "Secure").length,
          reminders: remindersData.length,
          projects: projectsData.length,
          goals: goalsData.length,
          specialDays: specialDaysData.length,
          storageUsageBytes: totalBytes,
        });
      } catch (error) {
        console.error("Failed to fetch profile stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const handleNotificationRequest = async (checked: boolean) => {
    if (checked) {
      if (!("Notification" in window)) {
        toast.error("This browser does not support notifications");
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Notifications enabled");
      } else {
        toast.error("Notification permission denied");
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

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

  const containerVariants: any = {
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
    <div className="max-w-6xl mx-auto space-y-8 pb-16 h-full flex flex-col">
      <div className="shrink-0 mb-6">
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
          Account Profile
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage your personal settings and profile overview.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
        
        {/* Left Column: Profile Sticky Overview */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8">
          {/* Profile Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card/40 backdrop-blur-xl border border-border p-8 rounded-3xl flex flex-col items-center text-center shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-[#7C4DFF]/20 to-transparent pointer-events-none" />
            
            <div className="relative mt-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#7C4DFF] to-pink-500 p-1 shadow-2xl shadow-[#7C4DFF]/30">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-5xl font-bold text-foreground relative overflow-hidden">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="absolute bottom-0 right-1 bg-green-500 p-1.5 rounded-full border-4 border-card" title="Verified Account">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>

            <h3 className="text-3xl font-bold text-foreground mt-6">
              {user?.full_name}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
            
            <Badge variant="outline" className="mt-4 bg-[#7C4DFF]/10 text-[#7C4DFF] border-[#7C4DFF]/20 font-medium px-4 py-1.5 text-sm">
              Pro Member
            </Badge>

            <div className="w-full grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border/50">
              <div className="text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Joined</p>
                <p className="text-sm font-medium text-foreground mt-1">Oct 2024</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</p>
                <p className="text-sm font-medium text-green-500 mt-1">Active</p>
              </div>
            </div>

            <Button variant="ghost" className="w-full mt-6 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl py-5" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </motion.div>

          {/* Account Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card/40 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-lg"
          >
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#7C4DFF]" /> Account Overview
            </h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Storage Usage</span>
                <span className="text-sm font-medium text-foreground">{isLoadingStats ? "..." : usedString} / {CLOUD_LIMIT_MB.toFixed(1)} MB</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-1000" style={{ backgroundColor: storageColor, width: `${storageProgress * 100}%` }}></div>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cloud Storage Remaining</span>
                <span className="text-sm font-medium text-foreground">{isLoadingStats ? "..." : remainingString}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Login</span>
                <span className="text-sm font-medium text-foreground">Today, 09:41 AM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Encryption</span>
                <span className="text-sm font-medium text-green-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Active</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Detailed Settings & Stats */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="lg:col-span-8 space-y-8"
        >
          {/* Profile Statistics */}
          <motion.div variants={itemVariants} className="bg-card/40 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-[#7C4DFF]" /> Profile Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <StatCard icon={StickyNote} label="Total Notes" value={stats.notes} colorClass="text-blue-500 bg-blue-500/10" isLoading={isLoadingStats} />
              <StatCard icon={ShieldCheck} label="Secure Notes" value={stats.secureNotes} colorClass="text-red-500 bg-red-500/10" isLoading={isLoadingStats} />
              <StatCard icon={Bell} label="Reminders" value={stats.reminders} colorClass="text-amber-500 bg-amber-500/10" isLoading={isLoadingStats} />
              <StatCard icon={Target} label="Goals" value={stats.goals} colorClass="text-emerald-500 bg-emerald-500/10" isLoading={isLoadingStats} />
              <StatCard icon={Gift} label="Special Days" value={stats.specialDays} colorClass="text-pink-500 bg-pink-500/10" isLoading={isLoadingStats} />
            </div>
          </motion.div>

          {/* Preferences */}
          <motion.div variants={itemVariants} className="bg-card/40 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#7C4DFF]" /> Preferences
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-background/50 hover:bg-background/80 transition-colors rounded-2xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-xl"><Moon className="w-5 h-5 text-foreground" /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Theme Preference</h4>
                    <p className="text-xs text-muted-foreground mt-1">Choose your preferred application theme.</p>
                  </div>
                </div>
                <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                  <SelectTrigger className="w-36 bg-background border-border text-foreground rounded-xl h-10">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-5 bg-background/50 hover:bg-background/80 transition-colors rounded-2xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl"><Bell className="w-5 h-5 text-amber-500" /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Browser Notifications</h4>
                    <p className="text-xs text-muted-foreground mt-1">Receive alerts for reminders and events.</p>
                  </div>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationRequest} />
              </div>

              <div className="flex items-center justify-between p-5 bg-background/50 hover:bg-background/80 transition-colors rounded-2xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#7C4DFF]/10 rounded-xl"><Sparkles className="w-5 h-5 text-[#7C4DFF]" /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">AI Voice Responses</h4>
                    <p className="text-xs text-muted-foreground mt-1">Enable text-to-speech for AI Assistant.</p>
                  </div>
                </div>
                <Switch checked={aiVoiceEnabled} onCheckedChange={setAiVoiceEnabled} />
              </div>
            </div>
          </motion.div>

          {/* Security Center */}
          <motion.div variants={itemVariants} className="bg-card/40 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Security Center
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-background/50 hover:bg-background/80 transition-colors rounded-2xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-xl"><Lock className="w-5 h-5 text-red-500" /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Secure Notes Timeout</h4>
                    <p className="text-xs text-muted-foreground mt-1">Auto-lock your vault after inactivity.</p>
                  </div>
                </div>
                <Select value={secureNotesTimeout.toString()} onValueChange={(v) => setSecureNotesTimeout(parseInt(v))}>
                  <SelectTrigger className="w-36 bg-background border-border text-foreground rounded-xl h-10">
                    <SelectValue placeholder="Timeout" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="5">5 Minutes</SelectItem>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="60">1 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password Change */}
              <div className="p-5 bg-background/50 rounded-2xl border border-border/50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-xl"><Lock className="w-5 h-5 text-foreground" /></div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Account Password</h4>
                      <p className="text-xs text-muted-foreground mt-1">Last changed 3 months ago.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl border-border" onClick={() => setIsChangingPassword(!isChangingPassword)}>
                    {isChangingPassword ? "Cancel" : "Change Password"}
                  </Button>
                </div>
                
                {isChangingPassword && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    className="mt-5 pt-5 border-t border-border overflow-hidden"
                  >
                    {passwordStep === "request" && (
                       <div className="flex flex-col items-center text-center">
                         <ShieldCheck className="w-12 h-12 text-[#7C4DFF] mb-3 opacity-80" />
                         <p className="text-sm text-muted-foreground mb-4">
                           For your security, we need to verify your identity before changing the password. 
                           An OTP will be sent to <strong>{user?.email}</strong>.
                         </p>
                         <Button className="w-full bg-[#7C4DFF] hover:bg-[#6b42e0] text-white rounded-xl h-11" onClick={handleRequestPasswordChange} disabled={isPasswordLoading}>
                           {isPasswordLoading ? "Sending..." : "Send OTP"}
                         </Button>
                       </div>
                    )}

                    {passwordStep === "otp" && (
                       <div className="flex flex-col space-y-4">
                         <p className="text-sm text-center text-muted-foreground">
                           Enter the 6-digit code sent to your email.
                         </p>
                         <Input 
                           value={otpCode}
                           onChange={(e) => setOtpCode(e.target.value)}
                           className="bg-background border-border rounded-xl text-center tracking-[0.5em] font-bold text-lg h-12 focus-visible:ring-[#7C4DFF]"
                           placeholder="123456"
                           maxLength={6}
                         />
                         <div className="flex gap-3">
                           <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setPasswordStep("request")}>
                             Back
                           </Button>
                           <Button className="flex-1 bg-[#7C4DFF] hover:bg-[#6b42e0] text-white rounded-xl h-11" onClick={handleVerifyOtp} disabled={isPasswordLoading || otpCode.length !== 6}>
                             {isPasswordLoading ? "Verifying..." : "Verify Code"}
                           </Button>
                         </div>
                         <div className="text-center pt-2">
                           <button 
                             type="button" 
                             onClick={handleRequestPasswordChange} 
                             disabled={resendCooldown > 0 || isPasswordLoading}
                             className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                           >
                             {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend"}
                           </button>
                         </div>
                       </div>
                    )}

                    {passwordStep === "new_password" && (
                       <div className="flex flex-col space-y-4">
                         <p className="text-sm text-center text-muted-foreground">
                           Create your new secure password. You will be logged out after this change.
                         </p>
                         <Input 
                           type="password" 
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="bg-background border-border rounded-xl focus-visible:ring-[#7C4DFF] h-11"
                           placeholder="Enter new password (min. 6 characters)"
                         />
                         <Button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11" onClick={handleChangePassword} disabled={isPasswordLoading}>
                           {isPasswordLoading ? "Updating..." : "Update Password"}
                         </Button>
                       </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
