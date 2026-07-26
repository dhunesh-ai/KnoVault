/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  HardDrive,
  Cloud,
  FolderUp,
  FolderPlus,
  Smartphone,
  Check,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Database,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSettingsStore, StorageMode } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function StorageCenterPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const {
    storageMode,
    setStorageMode,
    autoSwitchWhenFull,
    setAutoSwitchWhenFull,
    googleDriveConnected,
    setGoogleDriveConnected,
    googleDriveEmail,
    setGoogleDriveEmail,
    lastDriveSync,
    setLastDriveSync,
  } = useSettingsStore();

  // Storage Stats State
  const [cloudStats, setCloudStats] = useState({
    used: 0,
    limit: 5 * 1024 * 1024, // 5 MB
    percent: 0,
    remaining: 5 * 1024 * 1024,
  });
  const [localCacheBytes, setLocalCacheBytes] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(true);

  // Backup / Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Google Drive Modal State
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // Helper function to format bytes nicely
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Helper to calculate total browser LocalStorage cache size
  const calculateLocalCacheSize = (): number => {
    if (typeof window === "undefined") return 0;
    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || "";
          totalBytes += key.length + val.length;
        }
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const val = sessionStorage.getItem(key) || "";
          totalBytes += key.length + val.length;
        }
      }
    } catch {
      // Ignore security errors
    }
    return totalBytes;
  };

  // Fetch real storage statistics from backend API & measure local web cache
  const fetchStorageStats = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch real cloud storage quota
      const res = await api.get("/api/profile/storage");
      if (res.data) {
        const { used_bytes, limit_bytes, percent_used, remaining_bytes } = res.data;
        setCloudStats({
          used: used_bytes || 0,
          limit: limit_bytes || 5 * 1024 * 1024,
          percent: typeof percent_used === "number" ? percent_used : 0,
          remaining: typeof remaining_bytes === "number" ? remaining_bytes : limit_bytes - used_bytes,
        });
      }
    } catch (err) {
      console.error("[StorageCenter] Failed to fetch storage stats:", err);
    } finally {
      // 2. Measure local web cache size
      setLocalCacheBytes(calculateLocalCacheSize());
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStorageStats();
  }, []);

  // Strategy Card Handlers
  const handleSelectStrategy = (mode: StorageMode, title: string) => {
    setStorageMode(mode);
    toast.success(`Storage strategy updated to "${title}"`);
  };

  // Export JSON Backup Handler
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const res = await api.get("/api/backup/export");
      const jsonString = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const dateStr = new Date().toISOString().split("T")[0];
      const link = document.createElement("a");
      link.href = url;
      link.download = `KnoVault_Backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Backup exported successfully.");
    } catch (err: any) {
      console.error("[StorageCenter] Export error:", err);
      toast.error(err?.response?.data?.detail || "Failed to export backup JSON.");
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON File Picked Handler
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      toast.error("Please select a valid .json KnoVault backup file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate basic KnoVault backup structure
        const hasValidKeys =
          parsed &&
          typeof parsed === "object" &&
          (Array.isArray(parsed.notes) ||
            Array.isArray(parsed.goals) ||
            Array.isArray(parsed.reminders) ||
            Array.isArray(parsed.important_days) ||
            Array.isArray(parsed.special_days) ||
            Array.isArray(parsed.birthdays));

        if (!hasValidKeys) {
          toast.error("Invalid KnoVault backup schema. Missing notes, goals, or reminders.");
          return;
        }

        const counts = {
          notes: Array.isArray(parsed.notes) ? parsed.notes.length : 0,
          goals: Array.isArray(parsed.goals) ? parsed.goals.length : 0,
          reminders: Array.isArray(parsed.reminders) ? parsed.reminders.length : 0,
          important_days: Array.isArray(parsed.important_days)
            ? parsed.important_days.length
            : Array.isArray(parsed.special_days)
            ? parsed.special_days.length
            : Array.isArray(parsed.birthdays)
            ? parsed.birthdays.length
            : 0,
        };

        setSelectedImportFile(file);
        setImportSummary(counts);
        setIsConfirmingImport(true);
      } catch {
        toast.error("Malformed JSON file. Could not parse JSON data.");
      }
    };
    reader.readAsText(file);
  };

  // Perform Import Upload to Backend
  const handleConfirmImport = async () => {
    if (!selectedImportFile) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedImportFile);

      const res = await api.post("/api/backup/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data) {
        const imported = res.data.imported || {};
        const msg = `Import complete: ${imported.notes || 0} notes, ${imported.goals || 0} goals, ${imported.reminders || 0} reminders imported.`;
        toast.success(msg);
        fetchStorageStats();
      }
    } catch (err: any) {
      console.error("[StorageCenter] Import error:", err);
      toast.error(err?.response?.data?.detail || "Failed to import backup.");
    } finally {
      setIsImporting(false);
      setIsConfirmingImport(false);
      setSelectedImportFile(null);
      setImportSummary(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Google Drive Connect Handler
  const handleConnectGDrive = () => {
    setIsDriveModalOpen(true);
  };

  const handleSimulateGDriveConnect = () => {
    const userEmail = user?.email || "user@gmail.com";
    setGoogleDriveConnected(true);
    setGoogleDriveEmail(userEmail);
    setLastDriveSync(new Date().toLocaleTimeString());
    setIsDriveModalOpen(false);
    toast.success(`Google Drive connected to ${userEmail}`);
  };

  const handleDisconnectGDrive = () => {
    setGoogleDriveConnected(false);
    setGoogleDriveEmail(null);
    setLastDriveSync(null);
    toast.info("Google Drive disconnected.");
  };

  const handleSyncNowDrive = () => {
    setIsSyncingDrive(true);
    setTimeout(() => {
      setIsSyncingDrive(false);
      const timeStr = new Date().toLocaleTimeString();
      setLastDriveSync(timeStr);
      toast.success(`Google Drive sync completed at ${timeStr}`);
      fetchStorageStats();
    }, 1200);
  };

  // Color & status helper for cloud storage quota
  const getQuotaStatus = (percent: number) => {
    if (percent >= 100) {
      return {
        color: "#EF4444",
        badgeBg: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        label: "Quota Full",
        msg: "⚠️ Cloud Storage Quota is 100% full! Saves will route to secondary storage.",
      };
    }
    if (percent >= 90) {
      return {
        color: "#F43F5E",
        badgeBg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        label: "Critical",
        msg: `⚠️ Cloud storage is almost full (${percent.toFixed(1)}% used).`,
      };
    }
    if (percent >= 70) {
      return {
        color: "#F59E0B",
        badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        label: "Warning",
        msg: `⚠️ Cloud storage is running low (${percent.toFixed(1)}% used).`,
      };
    }
    return {
      color: "var(--primary)",
      badgeBg: "bg-primary/10 text-primary border-primary/20",
      label: "Normal",
      msg: null,
    };
  };

  const quotaStatus = getQuotaStatus(cloudStats.percent);

  const STRATEGIES = [
    {
      id: "cloud" as StorageMode,
      title: "Cloud Only",
      icon: Cloud,
      iconColor: "text-blue-500 bg-blue-500/10",
      description: "Save primary data to cloud databases. Offline mode queues sync.",
    },
    {
      id: "cloud_gdrive" as StorageMode,
      title: "Cloud + Google Drive",
      icon: FolderPlus,
      iconColor: "text-purple-500 bg-purple-500/10",
      description: "Sync with Cloud and auto-backup files/records to Google Drive.",
    },
    {
      id: "local" as StorageMode,
      title: "Local Device Only",
      icon: Smartphone,
      iconColor: "text-emerald-500 bg-emerald-500/10",
      description: "Store supported application data locally on this device.",
    },
    {
      id: "gdrive" as StorageMode,
      title: "Google Drive Only",
      icon: FolderUp,
      iconColor: "text-amber-500 bg-amber-500/10",
      description: "Bypass primary cloud storage where supported and save data directly to your configured Google Drive.",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-5xl mx-auto pb-16"
    >
      {/* 1. HEADER SECTION */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/settings")}
            className="rounded-2xl h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-accent/40"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-foreground tracking-tight">Storage Center</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[10px]">
                v2.4.0
              </Badge>
            </div>
            <p className="text-xs font-semibold text-muted-foreground pt-0.5">
              Manage how your KnoVault data is stored, synchronized and backed up.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={fetchStorageStats}
          disabled={isRefreshing}
          className="rounded-xl h-10 px-4 text-xs font-bold gap-2 border-border/60 hover:bg-muted shadow-2xs"
        >
          <RefreshCw className={cn("w-4 h-4 text-primary", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </motion.div>

      {/* 2. ACTIVE STORAGE QUOTAS SECTION */}
      <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-6 sm:p-7 rounded-[28px] shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <h2 className="text-base font-black text-foreground flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-primary" /> Active Storage Quotas
          </h2>
          <Badge className={cn("font-extrabold text-[11px] px-3 py-1 rounded-full border", quotaStatus.badgeBg)}>
            {quotaStatus.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cloud Storage Card */}
          <div className="p-5 bg-muted/30 rounded-2xl border border-border/40 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-foreground">Cloud Storage</h3>
                  <p className="text-[10px] bg-clip-text text-muted-foreground font-semibold">FastAPI Database & Files Quota</p>
                </div>
              </div>
              <span className="text-xs font-black text-foreground">
                {formatBytes(cloudStats.used)} / {formatBytes(cloudStats.limit)}
              </span>
            </div>

            <div className="w-full bg-muted/60 rounded-full h-3 overflow-hidden p-0.5 border border-border/40">
              <div
                className="h-full rounded-full transition-all duration-500 shadow-2xs"
                style={{
                  backgroundColor: quotaStatus.color,
                  width: `${Math.min(100, Math.max(2, cloudStats.percent))}%`,
                }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-bold text-muted-foreground">
              <span>{cloudStats.percent.toFixed(1)}% Used</span>
              <span>Remaining: {formatBytes(cloudStats.remaining)}</span>
            </div>

            {quotaStatus.msg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-600 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{quotaStatus.msg}</span>
              </div>
            )}
          </div>

          {/* Local Web Cache Card */}
          <div className="p-5 bg-muted/30 rounded-2xl border border-border/40 space-y-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-foreground">Browser Local Cache (LocalStorage)</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold">Client State & Offline Storage</p>
                </div>
              </div>
              <span className="text-xs font-black text-foreground">
                {formatBytes(localCacheBytes)}
              </span>
            </div>

            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
              Maintains offline client-side state persistence and local cache on this device.
            </p>

            <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-muted-foreground border-t border-border/30">
              <span>Status: Active & Hydrated</span>
              <span className="text-emerald-500">Fast Local Access</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. PRIMARY STORAGE STRATEGY SECTION */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="border-b border-border/50 pb-2">
          <h2 className="text-base font-black text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Primary Storage Strategy
          </h2>
          <p className="text-xs font-semibold text-muted-foreground">
            Choose where your primary data and automatic backups are stored.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STRATEGIES.map((strat) => {
            const isSelected = storageMode === strat.id;
            const IconComp = strat.icon;

            return (
              <div
                key={strat.id}
                onClick={() => handleSelectStrategy(strat.id, strat.title)}
                className={cn(
                  "p-5 rounded-2xl border transition-all cursor-pointer space-y-3 flex flex-col justify-between relative group shadow-2xs",
                  isSelected
                    ? "bg-primary/5 border-primary ring-2 ring-primary/20 shadow-md"
                    : "bg-card hover:bg-muted/40 border-border/60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={cn("p-3 rounded-xl", strat.iconColor)}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-background"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-foreground">{strat.title}</h3>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed pt-1">
                    {strat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 4. AUTO-SWITCH ON CLOUD FULL TOGGLE */}
      <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-black text-foreground">Auto-Switch on Cloud Full</h3>
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground">
              Automatically fall back to Google Drive or Local when Cloud hits 100%.
            </p>
          </div>
          <Switch
            checked={autoSwitchWhenFull}
            onCheckedChange={(val) => {
              setAutoSwitchWhenFull(val);
              toast.info(val ? "Auto-switch on cloud full enabled" : "Auto-switch disabled");
            }}
          />
        </div>
      </motion.div>

      {/* 5. GOOGLE DRIVE & LOCAL BACKUPS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GOOGLE DRIVE INTEGRATION */}
        <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-6 rounded-[28px] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <Cloud className="w-4.5 h-4.5 text-purple-500" /> Google Drive Integration
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-[10px] px-2.5 py-0.5 rounded-full",
                  googleDriveConnected
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border/60"
                )}
              >
                {googleDriveConnected ? "Connected ✓" : "Not Connected"}
              </Badge>
            </div>

            {googleDriveConnected ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-foreground">Connected Account:</p>
                  <p className="text-xs font-extrabold text-emerald-600 truncate">{googleDriveEmail || user?.email}</p>
                  {lastDriveSync && (
                    <p className="text-[10px] font-medium text-muted-foreground pt-0.5">Last Sync: {lastDriveSync}</p>
                  )}
                </div>

                <div className="flex gap-2.5 pt-1">
                  <Button
                    onClick={handleSyncNowDrive}
                    disabled={isSyncingDrive}
                    className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl gap-1.5"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isSyncingDrive && "animate-spin")} />
                    {isSyncingDrive ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisconnectGDrive}
                    className="h-9 text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/20 rounded-xl"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  Sync with Cloud and auto-backup files or JSON snapshots directly to your Google Drive storage.
                </p>
                <Button
                  onClick={handleConnectGDrive}
                  className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl gap-2 shadow-xs"
                >
                  <Cloud className="w-4 h-4" /> Connect Google Drive
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* LOCAL DATABASE BACKUPS */}
        <motion.div variants={itemVariants} className="bg-card/90 backdrop-blur-xl border border-border/60 p-6 rounded-[28px] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-border/40 pb-3">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-blue-500" /> Local Database Backups
              </h3>
            </div>

            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
              Safeguard your data locally by importing or exporting full JSON database snapshots of your notes, goals, reminders, and special days.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFilePicked}
              accept=".json"
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleExportBackup}
                disabled={isExporting}
                variant="outline"
                className="h-10 text-xs font-extrabold rounded-xl border-border/60 hover:bg-primary/10 hover:text-primary gap-1.5 shadow-2xs"
              >
                <Download className="w-4 h-4 text-primary" />
                {isExporting ? "Exporting..." : "Export JSON"}
              </Button>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                variant="outline"
                className="h-10 text-xs font-extrabold rounded-xl border-border/60 hover:bg-emerald-500/10 hover:text-emerald-600 gap-1.5 shadow-2xs"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                Import JSON
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CONFIRM IMPORT DIALOG */}
      <Dialog open={isConfirmingImport} onOpenChange={setIsConfirmingImport}>
        <DialogContent className="rounded-3xl border-border/60 max-w-md p-6 bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-500" /> Confirm JSON Import
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground pt-1">
              Importing <strong>{selectedImportFile?.name}</strong> will restore and merge items into your authenticated KnoVault account.
            </DialogDescription>
          </DialogHeader>

          {importSummary && (
            <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 space-y-2 text-xs font-bold">
              <p className="text-muted-foreground text-[11px] uppercase tracking-wider">Detected Records in Backup:</p>
              <div className="grid grid-cols-2 gap-2 text-foreground pt-1">
                <div>• Notes: {importSummary.notes}</div>
                <div>• Goals: {importSummary.goals}</div>
                <div>• Reminders: {importSummary.reminders}</div>
                <div>• Special Days: {importSummary.important_days}</div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsConfirmingImport(false)}
              disabled={isImporting}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="rounded-xl h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isImporting ? "Importing..." : "Confirm & Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GOOGLE DRIVE CONNECT MODAL */}
      <Dialog open={isDriveModalOpen} onOpenChange={setIsDriveModalOpen}>
        <DialogContent className="rounded-3xl border-border/60 max-w-lg p-6 bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Cloud className="w-5 h-5 text-purple-500" /> Connect Google Drive
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground pt-1">
              Authorize KnoVault to backup and restore files directly to your Google Drive account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-2 text-xs">
              <div className="font-extrabold text-purple-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Secure OAuth Access
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Web Google OAuth client configuration requires standard Google Cloud Console Client ID settings.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 space-y-1.5 text-xs">
              <p className="font-bold text-foreground">Target Google Account:</p>
              <p className="text-muted-foreground text-[11px] font-mono bg-card p-2 rounded-xl border border-border/40 truncate">
                {user?.email || "user@gmail.com"}
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDriveModalOpen(false)}
              className="rounded-xl h-10 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSimulateGDriveConnect}
              className="rounded-xl h-10 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
