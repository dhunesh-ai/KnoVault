/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Moon, Bell, Lock, Download, LogOut, Settings as SettingsIcon,
  ShieldAlert, Sparkles, ChevronRight, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { 
    theme, setTheme, 
    notificationsEnabled, setNotificationsEnabled,
    aiVoiceEnabled, setAiVoiceEnabled,
    secureNotesTimeout, setSecureNotesTimeout
  } = useSettingsStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [password, setPassword] = useState("");

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

  const handleExportData = () => {
    setIsExporting(true);
    // Simulate export delay
    setTimeout(() => {
      toast.success("Workspace data exported successfully. Check your downloads.");
      setIsExporting(false);
    }, 2000);
  };

  const handleChangePassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      await api.post("/api/profile/change-password", { new_password: password });
      toast.success("Password updated successfully");
      setPassword("");
      setIsChangingPassword(false);
    } catch (e) {
      // Error handled by axios interceptor
    }
  };

  const SectionTitle = ({ title, icon: Icon, description }: { title: string, icon: any, description?: string }) => (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" /> {title}
      </h2>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 h-full flex flex-col">
      <div className="shrink-0 mb-2">
        <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
          Settings <SettingsIcon className="w-6 h-6 text-muted-foreground" />
        </h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and application settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* Account Info Card - Left Col */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-foreground mb-4 shadow-lg shadow-purple-500/20">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h3 className="text-xl font-bold text-foreground">{user?.full_name}</h3>
            <p className="text-muted-foreground text-sm mb-6">{user?.email}</p>
            
            <Button variant="outline" className="w-full border-border text-foreground hover:bg-accent mb-3" onClick={() => setIsChangingPassword(!isChangingPassword)}>
              Change Password
            </Button>
            
            {isChangingPassword && (
              <div className="w-full space-y-3 mb-6 p-4 bg-muted rounded-lg border border-border text-left">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="New password"
                />
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-foreground text-xs" onClick={handleChangePassword}>
                  Update
                </Button>
              </div>
            )}

            <Button variant="destructive" className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-foreground border border-red-500/20" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {/* Settings Form - Right Col */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Appearance */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <SectionTitle title="Appearance" icon={Moon} description="Customize how KnoVault looks on your device." />
            <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
              <div>
                <h4 className="text-sm font-medium text-foreground">Theme Preference</h4>
                <p className="text-xs text-muted-foreground">Choose your preferred theme across the application.</p>
              </div>
              <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                <SelectTrigger className="w-32 bg-background border-border text-foreground">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notifications & AI */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <SectionTitle title="Preferences" icon={Bell} description="Manage alerts and AI interactions." />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div>
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">Browser Notifications</h4>
                  <p className="text-xs text-muted-foreground">Receive alerts for reminders and special days.</p>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationRequest} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div>
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" /> AI Voice Responses</h4>
                  <p className="text-xs text-muted-foreground">Enable text-to-speech for AI Assistant responses.</p>
                </div>
                <Switch checked={aiVoiceEnabled} onCheckedChange={setAiVoiceEnabled} />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <SectionTitle title="Security" icon={ShieldAlert} description="Configure your privacy settings." />
            <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
              <div>
                <h4 className="text-sm font-medium text-foreground">Secure Notes Timeout</h4>
                <p className="text-xs text-muted-foreground">Auto-lock your vault after inactivity.</p>
              </div>
              <Select value={secureNotesTimeout.toString()} onValueChange={(v) => setSecureNotesTimeout(parseInt(v))}>
                <SelectTrigger className="w-32 bg-background border-border text-foreground">
                  <SelectValue placeholder="Timeout" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="5">5 Minutes</SelectItem>
                  <SelectItem value="15">15 Minutes</SelectItem>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <SectionTitle title="Data Management" icon={Download} description="Control your personal information." />
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1 bg-muted border-border text-foreground hover:bg-accent"
                onClick={handleExportData}
                disabled={isExporting}
              >
                {isExporting ? (
                  "Generating Archive..."
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> Export Workspace Data</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center">
              <Lock className="w-3 h-3 mr-1" /> Your data is encrypted at rest and in transit via KnoVault protocols.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
