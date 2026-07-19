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
  <div className="flex items-center gap-3 p-4 bg-card/45 backdrop-blur-md border border-border/40 rounded-3xl hover:bg-accent/40 transition-colors">
    <div className={`p-2.5 rounded-2xl ${colorClass}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-extrabold text-foreground tracking-tight">
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
  
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 h-full flex flex-col scrollbar-hide">
      <div className="shrink-0 mb-4">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
          Account Profile
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5 font-medium">Manage your personal settings and profile overview.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
        
        {/* Left Column: Profile Sticky Overview */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8">
          {/* Profile Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card/45 backdrop-blur-md border border-border/40 p-8 rounded-3xl flex flex-col items-center text-center shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            
            <div className="relative mt-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary to-purple-400 p-1 shadow-2xl shadow-primary/20">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-5xl font-extrabold text-foreground relative overflow-hidden">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="absolute bottom-0 right-1 bg-green-500 p-1.5 rounded-full border-4 border-card" title="Verified Account">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-foreground mt-6 tracking-tight">
              {user?.full_name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">{user?.email}</p>
            
            <Badge variant="outline" className="mt-4 bg-primary/10 text-primary border-primary/20 font-bold px-4 py-1.5 text-xs rounded-xl">
              Pro Member
            </Badge>

            <div className="w-full grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border/20">
              <div className="text-left">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Joined</p>
                <p className="text-xs font-bold text-foreground mt-1">Oct 2024</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Status</p>
                <p className="text-xs font-bold text-green-500 mt-1">Active</p>
              </div>
            </div>

            <Button variant="ghost" className="w-full mt-6 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-2xl py-5 h-10 text-xs font-bold cursor-pointer" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </motion.div>

          {/* Account Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card/45 backdrop-blur-md border border-border/40 p-8 rounded-3xl shadow-lg"
          >
            <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" /> Cloud Storage
            </h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-muted-foreground">Storage Usage</span>
                <span className="text-foreground">{isLoadingStats ? "..." : usedString} / {CLOUD_LIMIT_MB.toFixed(1)} MB</span>
              </div>
              <div className="w-full bg-accent/30 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ backgroundColor: storageColor, width: `${storageProgress * 100}%` }}></div>
              </div>
              <Separator className="bg-border/20" />
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-muted-foreground">Remaining Storage</span>
                <span className="text-foreground">{isLoadingStats ? "..." : remainingString}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-muted-foreground">Last Sync</span>
                <span className="text-foreground">Today, 09:41 AM</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-muted-foreground">Privacy Protection</span>
                <span className="text-green-500 flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> End-to-End</span>
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
          <motion.div variants={itemVariants} className="bg-card/45 backdrop-blur-md border border-border/40 p-8 rounded-3xl shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" /> Profile Statistics
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
          <motion.div variants={itemVariants} className="bg-card/45 backdrop-blur-md border border-border/40 p-8 rounded-3xl shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" /> Preferences
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-accent/10 hover:bg-accent/20 transition-colors rounded-2xl border border-border/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-card rounded-xl border border-border/30"><Moon className="w-5 h-5 text-foreground" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Theme Preference</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Choose your preferred application theme.</p>
                  </div>
                </div>
                <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                  <SelectTrigger className="w-36 bg-card border-border/40 text-foreground rounded-xl h-10 text-xs font-semibold">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 text-xs bg-card">
                    <SelectItem value="dark" className="rounded-lg">Dark</SelectItem>
                    <SelectItem value="light" className="rounded-lg">Light</SelectItem>
                    <SelectItem value="system" className="rounded-lg">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-4 p-5 bg-accent/10 hover:bg-accent/20 transition-colors rounded-2xl border border-border/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl"><Bell className="w-5 h-5 text-amber-500" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Browser Notifications</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Receive alerts for reminders and events.</p>
                    </div>
                  </div>
                  {notificationPermission === "denied" ? (
                    <Badge variant="destructive" className="rounded-lg text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5">Blocked</Badge>
                  ) : (
                    <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationRequest} className="scale-90" />
                  )}
                </div>
                {notificationPermission === "denied" && (
                  <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl mt-1">
                    <ShieldAlert className="w-4.5 h-4.5 text-red-500 shrink-0" />
                    <p className="text-[10px] text-red-400 font-semibold leading-normal">
                      Notification permissions are currently blocked in your browser settings. Please enable them in your browser site settings and refresh the page to receive real-time alerts.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-5 bg-accent/10 hover:bg-accent/20 transition-colors rounded-2xl border border-border/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><Sparkles className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">AI Voice Responses</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Enable text-to-speech for AI Assistant.</p>
                  </div>
                </div>
                <Switch checked={aiVoiceEnabled} onCheckedChange={setAiVoiceEnabled} className="scale-90" />
              </div>
            </div>
          </motion.div>

          {/* Security Center */}
          <motion.div variants={itemVariants} className="bg-card/45 backdrop-blur-md border border-border/40 p-8 rounded-3xl shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Security Center
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-accent/10 hover:bg-accent/20 transition-colors rounded-2xl border border-border/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-xl"><Lock className="w-5 h-5 text-red-500" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Secure Notes Timeout</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Auto-lock your vault after inactivity.</p>
                  </div>
                </div>
                <Select value={secureNotesTimeout.toString()} onValueChange={(v) => setSecureNotesTimeout(parseInt(v))}>
                  <SelectTrigger className="w-36 bg-card border-border/40 text-foreground rounded-xl h-10 text-xs font-semibold">
                    <SelectValue placeholder="Timeout" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 text-xs bg-card">
                    <SelectItem value="5" className="rounded-lg">5 Minutes</SelectItem>
                    <SelectItem value="15" className="rounded-lg">15 Minutes</SelectItem>
                    <SelectItem value="30" className="rounded-lg">30 Minutes</SelectItem>
                    <SelectItem value="60" className="rounded-lg">1 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password Change */}
              <div className="p-5 bg-accent/10 rounded-2xl border border-border/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-card rounded-xl border border-border/30"><Lock className="w-5 h-5 text-foreground" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Account Password</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Last changed 3 months ago.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl border-border/40 text-xs font-bold h-9 hover:bg-card" onClick={() => setIsChangingPassword(!isChangingPassword)}>
                    {isChangingPassword ? "Cancel" : "Change Password"}
                  </Button>
                </div>
                
                {isChangingPassword && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    className="mt-5 pt-5 border-t border-border/20 overflow-hidden"
                  >
                    {passwordStep === "request" && (
                       <div className="flex flex-col items-center text-center">
                         <ShieldCheck className="w-12 h-12 text-primary mb-3 opacity-80" />
                         <p className="text-xs text-muted-foreground mb-4 max-w-md font-semibold leading-relaxed">
                           For your security, we need to verify your identity before changing the password. 
                           An OTP will be sent to <strong>{user?.email}</strong>.
                         </p>
                         <Button className="w-full bg-primary hover:bg-primary/95 text-white rounded-xl h-10 text-xs font-bold shadow-md cursor-pointer" onClick={handleRequestPasswordChange} disabled={isPasswordLoading}>
                           {isPasswordLoading ? "Sending..." : "Send OTP"}
                         </Button>
                       </div>
                    )}

                    {passwordStep === "otp" && (
                       <div className="flex flex-col space-y-4">
                         <p className="text-xs text-center text-muted-foreground font-semibold">
                           Enter the 6-digit code sent to your email.
                         </p>
                         <Input 
                           value={otpCode}
                           onChange={(e) => setOtpCode(e.target.value)}
                           className="bg-card border-border/40 rounded-xl text-center tracking-[0.5em] font-extrabold text-base h-12 focus-visible:ring-primary/40"
                           placeholder="123456"
                           maxLength={6}
                         />
                         <div className="flex gap-3">
                           <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold border-border/40" onClick={() => setPasswordStep("request")}>
                             Back
                           </Button>
                           <Button className="flex-1 bg-primary hover:bg-primary/95 text-white rounded-xl h-10 text-xs font-bold" onClick={handleVerifyOtp} disabled={isPasswordLoading || otpCode.length !== 6}>
                             {isPasswordLoading ? "Verifying..." : "Verify Code"}
                           </Button>
                         </div>
                         <div className="text-center pt-2">
                           <button 
                             type="button" 
                             onClick={handleRequestPasswordChange} 
                             disabled={resendCooldown > 0 || isPasswordLoading}
                             className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 font-bold"
                           >
                             {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend"}
                           </button>
                         </div>
                       </div>
                    )}

                    {passwordStep === "new_password" && (
                       <div className="flex flex-col space-y-4">
                         <p className="text-xs text-center text-muted-foreground font-semibold">
                           Create your new secure password. You will be logged out after this change.
                         </p>
                         <Input 
                           type="password" 
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="bg-card border-border/40 rounded-xl focus-visible:ring-primary/40 h-10 text-xs"
                           placeholder="Enter new password (min. 6 characters)"
                         />
                         <Button className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl h-10 text-xs font-bold shadow-md" onClick={handleChangePassword} disabled={isPasswordLoading}>
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
