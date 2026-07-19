"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRemindersStore } from "@/store/useRemindersStore";
import { Reminder } from "@/types/Reminder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Users, BookOpen, Gift, Calendar as CalendarIcon, Pill, Plus, Sparkles, Check, 
  Clock, AlertTriangle, Eye, Compass, Droplet, Dumbbell, Heart, Target, 
  HelpCircle, Circle, Bell, ArrowLeft, RefreshCw, Bookmark, ArrowRight, 
  Smartphone, Monitor, CalendarDays, BarChart2, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { DateTimePicker } from "@/components/reminders/DateTimePicker";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Category Definitions with Description for the Left Navigation Card
const CATEGORIES = [
  { 
    id: "meeting", 
    label: "Meeting", 
    desc: "Sync calls, design reviews, and quick catchups", 
    icon: Users, 
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20 hover:border-blue-400/50",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    accent: "bg-blue-400"
  },
  { 
    id: "assignment", 
    label: "Assignment", 
    desc: "Exams, homework submissions, and project milestones", 
    icon: BookOpen, 
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20 hover:border-purple-400/50",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    accent: "bg-purple-400"
  },
  { 
    id: "birthday", 
    label: "Birthday", 
    desc: "Celebrate and send wishes to family, friends, and colleagues", 
    icon: Gift, 
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20 hover:border-pink-400/50",
    gradient: "from-pink-500/20 via-pink-500/5 to-transparent",
    accent: "bg-pink-400"
  },
  { 
    id: "event", 
    label: "Event", 
    desc: "Organize meetups, webinars, conferences, and parties", 
    icon: CalendarIcon, 
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20 hover:border-sky-400/50",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
    accent: "bg-sky-400"
  },
  { 
    id: "medicine", 
    label: "Medicine", 
    desc: "Pill schedules, custom timings, food instructions, and courses", 
    icon: Pill, 
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-400/50",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    accent: "bg-emerald-400"
  },
  { 
    id: "custom", 
    label: "Custom", 
    desc: "Create bespoke reminder schedules with specialized icons/colors", 
    icon: Sparkles, 
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20 hover:border-amber-400/50",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    accent: "bg-amber-400"
  },
] as const;

const MEDICINE_PRESETS = [
  "Paracetamol", "Vitamin D3", "Amoxicillin", "Metformin", "Atorvastatin", 
  "Ibuprofen", "Eye Drops", "Cough Syrup", "Insulin Dose"
];

const MEDICINE_TYPES = [
  "Tablet 💊", "Capsule 💊", "Syrup 🧴", "Injection 💉", 
  "Drops 👁️", "Ointment 🧴", "Inhaler 🌬️", "Tonic 🍯"
];

const DOSAGE_PRESETS = ["1 tablet", "5ml", "2 capsules", "2 drops", "1 puff"];

const FOOD_TIMINGS = ["Before Food", "After Food", "With Food", "Empty Stomach"];

const FREQUENCIES = [
  "Once Daily", "Twice Daily", "Three Times Daily", "Every X Hours", 
  "Weekly", "Custom Schedule"
];

const DAILY_TIMINGS = [
  "Morning 🌅", "Breakfast 🍳", "Lunch 🍱", "Evening 🌇", 
  "Dinner 🍽️", "Night 🌙"
];

const DURATION_PRESETS = ["3 days", "5 days", "1 week", "1 month"];

const CUSTOM_NAME_PRESETS = [
  "Drink Water", "Gym Workout", "Doctor Appointment", "Prayer Time", 
  "Study Break", "Stand Up Alert", "Fruit Intake"
];

const CUSTOM_ICONS = [
  { name: "🩺 Health", icon: Pill },
  { name: "📚 Study", icon: BookOpen },
  { name: "✈️ Travel", icon: Compass },
  { name: "💧 Water", icon: Droplet },
  { name: "🏋️ Fitness", icon: Dumbbell },
  { name: "🙏 Prayer", icon: Heart },
  { name: "🎯 Personal", icon: Target }
];

const CUSTOM_COLORS = [
  { name: "Purple", class: "bg-purple-500 text-purple-500 border-purple-500/40", hex: "#a855f7" },
  { name: "Blue", class: "bg-blue-500 text-blue-500 border-blue-500/40", hex: "#3b82f6" },
  { name: "Pink", class: "bg-pink-500 text-pink-500 border-pink-500/40", hex: "#ec4899" },
  { name: "Sky", class: "bg-sky-500 text-sky-500 border-sky-500/40", hex: "#0ea5e9" },
  { name: "Emerald", class: "bg-emerald-500 text-emerald-500 border-emerald-500/40", hex: "#10b981" },
  { name: "Amber", class: "bg-amber-500 text-amber-500 border-amber-500/40", hex: "#f59e0b" },
  { name: "Slate", class: "bg-slate-500 text-slate-500 border-slate-500/40", hex: "#64748b" }
];

function ReminderBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const { reminders, fetchReminders, createReminder, updateReminder } = useRemindersStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("event");
  const [previewTab, setPreviewTab] = useState<"card" | "desktop" | "mobile" | "timeline">("card");

  // Custom Category States
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState("🎯 Personal");
  const [customColor, setCustomColor] = useState("Purple");

  // Medicine Category States
  const [medName, setMedName] = useState("");
  const [medType, setMedType] = useState("Tablet 💊");
  const [dosage, setDosage] = useState("1 tablet");
  const [foodTiming, setFoodTiming] = useState("After Food");
  const [frequency, setFrequency] = useState("Once Daily");
  const [selectedTimings, setSelectedTimings] = useState<string[]>(["Breakfast 🍳"]);
  const [duration, setDuration] = useState("5 days");
  const [medNotes, setMedNotes] = useState("");
  const [timingTimes, setTimingTimes] = useState<Record<string, string>>({
    "Morning 🌅": "08:00",
    "Breakfast 🍳": "08:30",
    "Lunch 🍱": "13:00",
    "Evening 🌇": "17:00",
    "Dinner 🍽️": "20:30",
    "Night 🌙": "22:00",
  });

  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");

  // Basic Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    return d.toISOString();
  });

  // Load reminders if empty (for direct page link refreshes)
  useEffect(() => {
    if (reminders.length === 0) {
      fetchReminders();
    }
  }, [reminders.length, fetchReminders]);

  // Prepopulate edit data
  useEffect(() => {
    if (idParam && reminders.length > 0) {
      const editReminder = reminders.find((r) => r.id === Number(idParam));
      if (editReminder) {
        setReminderDate(editReminder.reminder_date);
        const typeLower = editReminder.type.toLowerCase();
        setActiveCategory(typeLower);

        let parsed: any = null;
        if (editReminder.description && editReminder.description.startsWith("{")) {
          try {
            parsed = JSON.parse(editReminder.description);
          } catch (e) {
            // ignore
          }
        }

        if (parsed) {
          setPriority(parsed.priority || "Medium");
          if (parsed.isMedicine) {
            setMedName(parsed.medName || "");
            setMedType(parsed.medType || "Tablet 💊");
            setDosage(parsed.dosage || "1 tablet");
            setFoodTiming(parsed.foodTiming || "After Food");
            setFrequency(parsed.frequency || "Once Daily");
            setSelectedTimings(parsed.timings || []);
            if (parsed.timing_times) {
              setTimingTimes(parsed.timing_times);
            }
            setDuration(parsed.duration || "5 days");
            setMedNotes(parsed.notes || "");
            setTitle("");
            setDescription("");
          } else if (parsed.isCustom) {
            setCustomName(parsed.customName || "");
            setCustomIcon(parsed.customIcon || "🎯 Personal");
            setCustomColor(parsed.customColor || "Purple");
            setTitle(editReminder.title || "");
            setDescription(parsed.notes || "");
          }
        } else {
          setTitle(editReminder.title);
          setDescription(editReminder.description || "");
          setPriority("Medium");
        }
      }
    }
  }, [idParam, reminders]);

  const toggleTiming = (dt: string) => {
    setSelectedTimings((prev) =>
      prev.includes(dt) ? prev.filter((t) => t !== dt) : [...prev, dt]
    );
  };

  const handleTimingTimeChange = (dt: string, val: string) => {
    setTimingTimes((prev) => ({
      ...prev,
      [dt]: val,
    }));
  };

  const handleReset = () => {
    if (activeCategory === "medicine") {
      setMedName("");
      setMedType("Tablet 💊");
      setDosage("1 tablet");
      setFoodTiming("After Food");
      setFrequency("Once Daily");
      setSelectedTimings(["Breakfast 🍳"]);
      setDuration("5 days");
      setMedNotes("");
    } else if (activeCategory === "custom") {
      setCustomName("");
      setCustomIcon("🎯 Personal");
      setCustomColor("Purple");
      setTitle("");
      setDescription("");
    } else {
      setTitle("");
      setDescription("");
    }
    toast.success("Editor fields cleared");
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved successfully to local storage!");
  };

  const onSubmit = async () => {
    if (activeCategory === "medicine") {
      if (!medName.trim()) {
        toast.error("Medicine Name is required");
        return;
      }
      if (!dosage.trim()) {
        toast.error("Dosage configuration is required");
        return;
      }
      if (selectedTimings.length === 0) {
        toast.error("Please select at least one dosage timing");
        return;
      }
    } else if (activeCategory === "custom") {
      if (!title.trim() && !customName.trim()) {
        toast.error("Reminder title is required");
        return;
      }
    } else {
      if (!title.trim()) {
        toast.error("Title is required");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let finalTitle = title;
      let finalDescription = description;
      let finalType = activeCategory;

      if (activeCategory === "medicine") {
        finalTitle = `💊 Take ${medName}`;
        finalDescription = JSON.stringify({
          isMedicine: true,
          medName,
          medType,
          dosage,
          foodTiming,
          frequency,
          timings: selectedTimings,
          timing_times: timingTimes,
          duration,
          notes: medNotes,
          priority,
        });
      } else if (activeCategory === "custom") {
        finalTitle = `${customIcon.split(" ")[0]} ${title || customName}`;
        finalDescription = JSON.stringify({
          isCustom: true,
          customName: customName || title,
          customIcon,
          customColor,
          notes: description,
          priority,
        });
      }

      const payload = {
        title: finalTitle,
        description: finalDescription,
        type: finalType as any,
        custom_type: activeCategory === "custom" ? customName : null,
        reminder_date: reminderDate,
      };

      if (idParam) {
        await updateReminder(Number(idParam), payload);
        toast.success("Reminder updated successfully");
      } else {
        await createReminder(payload);
        toast.success("Reminder created successfully");
      }

      router.push("/reminders");
    } catch (e) {
      // error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  const mockTitle =
    activeCategory === "medicine"
      ? `💊 Take ${medName || "Medication Name"}`
      : activeCategory === "custom"
      ? `${customIcon.split(" ")[0]} ${title || customName || "Custom Reminder"}`
      : title || "Untitled Reminder";

  const mockDate = new Date(reminderDate);

  // Helper for resolve colors
  const getSelectedColorHex = () => {
    const colObj = CUSTOM_COLORS.find((c) => c.name === customColor);
    return colObj ? colObj.hex : "#a855f7";
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)] pb-6 relative overflow-hidden">
      
      {/* 1. TOP HEADER ACTION BAR */}
      <div className="flex items-center justify-between border-b border-border/20 pb-4 shrink-0 bg-background/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/reminders")}
            className="h-10 w-10 rounded-2xl border border-border/20 hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              {idParam ? "Edit Reminder Builder" : "New Reminder Builder"}
              <Badge variant="outline" className="text-[9px] font-bold tracking-widest text-primary uppercase bg-primary/5 border-primary/20 rounded-xl px-2 py-0.5">
                Premium
              </Badge>
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Autosave active • local draft sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            className="rounded-2xl h-10 px-4 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent/30 cursor-pointer hidden sm:flex items-center gap-1.5"
          >
            <Bookmark className="w-4.5 h-4.5" />
            Save Draft
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white rounded-2xl h-10 px-6 text-xs font-bold shadow-[0_4px_16px_rgba(124,77,255,0.3)] hover:shadow-[0_4px_24px_rgba(124,77,255,0.45)] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {idParam ? "Save Changes" : "Create Reminder"}
                <ArrowRight className="w-4.5 h-4.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. THREE COLUMN LAYOUT CONTAINER */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative gap-6">
        
        {/* LEFT COLUMN (20%): Category Selector */}
        <div className="w-full lg:w-[20%] overflow-y-auto space-y-3 bg-accent/5 p-4 rounded-3xl border border-border/20 scrollbar-hide shrink-0">
          <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 block mb-1">
            Category
          </Label>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {CATEGORIES.map((c) => {
              const isSelected = activeCategory === c.id;
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-[20px] border transition-all duration-300 relative group flex items-start gap-3.5 cursor-pointer focus:outline-none",
                    isSelected
                      ? "bg-card border-primary/50 shadow-[0_4px_20px_rgba(124,77,255,0.08)]"
                      : "bg-card/25 border-border/30 hover:border-border hover:bg-card/45"
                  )}
                >
                  {isSelected && (
                    <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-[60%] rounded-r-full z-10", c.accent)} />
                  )}

                  <span className={cn(
                    "p-2.5 rounded-xl flex items-center justify-center border border-border/20 bg-background/50 transition-colors shadow-sm",
                    isSelected ? c.color : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Icon className="w-4.5 h-4.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {c.label}
                    </h4>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed font-semibold line-clamp-2 lg:block hidden">
                      {c.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN (50%): Form configurations */}
        <div className="flex-1 lg:w-[50%] overflow-y-auto space-y-6 scrollbar-hide bg-card/20 border border-border/20 p-6 rounded-3xl">
          
          {/* General Fields block */}
          <div className="space-y-4">
            <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 block">
              Parameter Settings
            </Label>

            {activeCategory !== "medicine" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold">Reminder Title / Topic</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    activeCategory === "custom"
                      ? "e.g. Drink 500ml water"
                      : `e.g. Schedule ${activeCategory}`
                  }
                  className="bg-card/40 border-border/40 focus:ring-1 focus:ring-primary rounded-xl h-10 text-xs"
                />
              </div>
            )}

            {/* Pickers grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Alert Trigger Time</Label>
                <DateTimePicker
                  value={new Date(reminderDate)}
                  onChange={(date) => {
                    if (date) setReminderDate(date.toISOString());
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Alert Urgency Priority</Label>
                <div className="flex gap-1.5 p-1 bg-accent/20 border border-border/30 rounded-xl h-10 items-center justify-between">
                  {(["Low", "Medium", "High"] as const).map((p) => {
                    const isSelected = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          "flex-1 text-[10px] font-extrabold uppercase tracking-wider h-8 rounded-lg transition-all cursor-pointer",
                          isSelected
                            ? p === "High"
                              ? "bg-red-500 text-white shadow-sm"
                              : p === "Medium"
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-blue-500 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic forms config panels */}
          <div className="border-t border-border/20 pt-5 mt-5">
            <AnimatePresence mode="wait">
              
              {/* MEDICINE SCHEDULER PANEL */}
              {activeCategory === "medicine" && (
                <motion.div
                  key="med-builder"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Presets and drug details */}
                  <div className="p-4.5 bg-accent/10 border border-border/20 rounded-2xl space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Medication Name</Label>
                      <Input
                        value={medName}
                        onChange={(e) => setMedName(e.target.value)}
                        placeholder="e.g. Ibuprofen"
                        className="bg-card/45 border-border/40 focus:ring-1 focus:ring-primary rounded-xl text-xs h-10"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {MEDICINE_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setMedName(p)}
                            className="text-[9px] font-bold px-2 py-0.5 bg-card border border-border/30 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Medication Type</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MEDICINE_TYPES.map((t) => {
                          const isSel = medType === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setMedType(t)}
                              className={cn(
                                "py-1.5 px-3 text-[10px] font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                isSel 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                                  : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/20"
                              )}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Dosage settings block */}
                  <div className="p-4.5 bg-accent/10 border border-border/20 rounded-2xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">Dose Count / Quantity</Label>
                        <Input
                          value={dosage}
                          onChange={(e) => setDosage(e.target.value)}
                          placeholder="e.g. 1 pill, 10ml"
                          className="bg-card/45 border-border/40 focus:ring-1 focus:ring-primary rounded-xl text-xs h-10"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {DOSAGE_PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setDosage(p)}
                              className="text-[9px] font-bold px-2 py-0.5 bg-card border border-border/30 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold">Food Intake Instruction</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {FOOD_TIMINGS.map((ft) => {
                            const isSel = foodTiming === ft;
                            return (
                              <button
                                key={ft}
                                type="button"
                                onClick={() => setFoodTiming(ft)}
                                className={cn(
                                  "py-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer",
                                  isSel 
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                                    : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/20"
                                )}
                              >
                                {ft}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Details block */}
                  <div className="p-4.5 bg-accent/10 border border-border/20 rounded-2xl space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Dosage Course Frequency</Label>
                      <div className="flex flex-wrap gap-2">
                        {FREQUENCIES.map((f) => {
                          const isSel = frequency === f;
                          return (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setFrequency(f)}
                              className={cn(
                                "py-1.5 px-3 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                                isSel
                                  ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                  : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/20"
                              )}
                            >
                              {f}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Select Intake Timings</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {DAILY_TIMINGS.map((dt) => {
                          const isSel = selectedTimings.includes(dt);
                          return (
                            <button
                              key={dt}
                              type="button"
                              onClick={() => toggleTiming(dt)}
                              className={cn(
                                "py-2 text-[10px] font-bold rounded-xl border transition-all flex items-center justify-center cursor-pointer",
                                isSel 
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                                  : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/20"
                              )}
                            >
                              {dt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clock triggers configuration */}
                    {selectedTimings.length > 0 && (
                      <div className="space-y-2 border-t border-border/25 pt-3.5 mt-3.5">
                        <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">Configure Dose Alarm Hours</Label>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {selectedTimings.map((dt) => {
                            const timeStr = timingTimes[dt] || "08:00";
                            return (
                              <div key={dt} className="flex items-center justify-between p-2 bg-card border border-border/30 rounded-xl">
                                <span className="text-[10px] font-bold text-muted-foreground">{dt}</span>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                  <input 
                                    type="time" 
                                    value={timeStr}
                                    onChange={(e) => handleTimingTimeChange(dt, e.target.value)}
                                    className="bg-accent/30 border border-border/40 text-xs font-bold text-foreground rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 cursor-pointer h-7"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 border-t border-border/25 pt-3.5">
                      <Label className="text-xs font-bold">Course duration days</Label>
                      <Input
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 5 days"
                        className="bg-card/45 border-border/40 focus:ring-1 focus:ring-primary rounded-xl text-xs h-10"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {DURATION_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setDuration(p)}
                            className="text-[9px] font-bold px-2 py-0.5 bg-card border border-border/30 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Special medication instructions</Label>
                    <Textarea
                      value={medNotes}
                      onChange={(e) => setMedNotes(e.target.value)}
                      placeholder="Add details like take with cold water..."
                      className="bg-accent/15 border-border/30 h-20 resize-none rounded-xl text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </motion.div>
              )}

              {/* CUSTOM SCHEDULER PANEL */}
              {activeCategory === "custom" && (
                <motion.div
                  key="custom-builder"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="p-4.5 bg-accent/10 border border-border/20 rounded-2xl space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Bespoke Category Name / Template</Label>
                      <Input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g. Water Intake, Workout"
                        className="bg-card/45 border-border/40 focus:ring-1 focus:ring-primary rounded-xl text-xs h-10"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {CUSTOM_NAME_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setCustomName(p);
                              if (!title) setTitle(p);
                            }}
                            className="text-[9px] font-bold px-2 py-0.5 bg-card border border-border/30 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Icon choices swatches */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Select Icon Label</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {CUSTOM_ICONS.map((ci) => {
                          const isSel = customIcon === ci.name;
                          const IconElem = ci.icon;
                          return (
                            <button
                              key={ci.name}
                              type="button"
                              onClick={() => setCustomIcon(ci.name)}
                              className={cn(
                                "py-2 px-3 text-[10px] font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                isSel
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/20"
                              )}
                            >
                              <IconElem className="w-3.5 h-3.5" />
                              {ci.name.split(" ")[1]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Colors swatches */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Theme Swatch Color</Label>
                      <div className="flex flex-wrap gap-2.5">
                        {CUSTOM_COLORS.map((cc) => {
                          const isSel = customColor === cc.name;
                          return (
                            <button
                              key={cc.name}
                              type="button"
                              onClick={() => setCustomColor(cc.name)}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer",
                                cc.class,
                                isSel ? "scale-110 ring-2 ring-primary/45 border-white" : "border-transparent opacity-85 hover:opacity-100"
                              )}
                            >
                              {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Description Details</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add details, target logs..."
                      className="bg-accent/15 border-border/30 h-28 resize-none rounded-xl text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </motion.div>
              )}

              {/* STANDARD PARAMETER SCHEDULERS */}
              {activeCategory !== "medicine" && activeCategory !== "custom" && (
                <motion.div
                  key="standard-editor"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Description Details / Notes</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add event information, links, meeting targets..."
                      className="bg-accent/15 border-border/30 h-36 resize-none rounded-xl text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT COLUMN (30%): Live Preview channels */}
        <div className="w-full lg:w-[30%] bg-card/25 border border-border/20 p-5 overflow-y-auto space-y-6 scrollbar-hide shrink-0 flex flex-col rounded-3xl relative bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 justify-between">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-primary/10 blur-[80px]" />
          </div>

          <div className="space-y-5 relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-border/10 pb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Live Preview Channels
              </span>
              
              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-accent/20 p-0.5 rounded-xl border border-border/20">
                <button 
                  onClick={() => setPreviewTab("card")}
                  className={cn("p-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer", previewTab === "card" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="Card View"
                >
                  Card
                </button>
                <button 
                  onClick={() => setPreviewTab("desktop")}
                  className={cn("p-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer", previewTab === "desktop" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="OS Alert View"
                >
                  OS Banner
                </button>
                <button 
                  onClick={() => setPreviewTab("mobile")}
                  className={cn("p-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer", previewTab === "mobile" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="Mobile Lockscreen"
                >
                  Mobile
                </button>
                <button 
                  onClick={() => setPreviewTab("timeline")}
                  className={cn("p-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer", previewTab === "timeline" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="Timeline Hour View"
                >
                  Timeline
                </button>
              </div>
            </div>

            {/* PREVIEW TAB CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col justify-center py-2">
              <AnimatePresence mode="wait">
                
                {/* 1. CARD VIEW PREVIEW */}
                {previewTab === "card" && (
                  <motion.div
                    key="card-view"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-card border border-border/40 rounded-3xl p-4.5 shadow-lg flex flex-col justify-between h-[180px] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-60 pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1.5 bg-background/55 border border-border/40 rounded-xl flex items-center justify-center shadow-sm">
                          {activeCategory === "meeting" && <Users className="w-3.5 h-3.5 text-blue-400" />}
                          {activeCategory === "assignment" && <BookOpen className="w-3.5 h-3.5 text-purple-400" />}
                          {activeCategory === "birthday" && <Gift className="w-3.5 h-3.5 text-pink-400" />}
                          {activeCategory === "event" && <CalendarIcon className="w-3.5 h-3.5 text-sky-400" />}
                          {activeCategory === "medicine" && <Pill className="w-3.5 h-3.5 text-emerald-400" />}
                          {activeCategory === "custom" && (
                            (() => {
                              const iconName = customIcon || "🎯 Personal";
                              if (iconName.includes("Health")) return <Pill className="w-3.5 h-3.5 text-amber-400" />;
                              if (iconName.includes("Study")) return <BookOpen className="w-3.5 h-3.5 text-amber-400" />;
                              if (iconName.includes("Travel")) return <Compass className="w-3.5 h-3.5 text-amber-400" />;
                              if (iconName.includes("Water")) return <Droplet className="w-3.5 h-3.5 text-amber-400" />;
                              if (iconName.includes("Fitness")) return <Dumbbell className="w-3.5 h-3.5 text-amber-400" />;
                              if (iconName.includes("Prayer")) return <Heart className="w-3.5 h-3.5 text-amber-400" />;
                              return <Target className="w-3.5 h-3.5 text-amber-400" />;
                            })()
                          )}
                        </span>
                        <span className={cn(
                          "text-[8px] uppercase font-bold tracking-wider rounded-lg px-2 py-0.5 border",
                          activeCategory === "meeting" && "text-blue-400 bg-blue-400/10 border-blue-400/20",
                          activeCategory === "assignment" && "text-purple-400 bg-purple-400/10 border-purple-400/20",
                          activeCategory === "birthday" && "text-pink-400 bg-pink-400/10 border-pink-400/20",
                          activeCategory === "event" && "text-sky-400 bg-sky-400/10 border-sky-400/20",
                          activeCategory === "medicine" && "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
                          activeCategory === "custom" && "text-amber-400 bg-amber-400/10 border-amber-400/20"
                        )}>
                          {activeCategory === "custom" ? customName || "Custom" : activeCategory}
                        </span>
                      </div>

                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wider",
                        priority === "High" && "bg-red-500/10 text-red-400 border-red-500/20",
                        priority === "Medium" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        priority === "Low" && "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}>
                        {priority}
                      </span>
                    </div>

                    <div className="flex gap-2 relative z-10">
                      <Circle className="w-4 h-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground text-xs leading-tight truncate">{mockTitle}</h4>
                        
                        {activeCategory === "medicine" && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-[10px] text-muted-foreground font-semibold">
                              {dosage || "1 tablet"} • {medType?.split(" ")[0]}
                            </p>
                            <p className="text-[9px] text-muted-foreground/80">
                              {foodTiming} • {frequency}
                            </p>
                            {selectedTimings[0] && (
                              <p className="text-[8px] text-primary/80 font-bold bg-primary/5 border border-primary/10 rounded-md px-1.5 py-0.5 inline-block mt-1">
                                Dose: {selectedTimings[0].split(" ")[0]}
                              </p>
                            )}
                            <div className="w-full bg-muted/30 rounded-full h-1 mt-1.5 overflow-hidden border border-border/10">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "20%" }} />
                            </div>
                          </div>
                        )}

                        {activeCategory === "custom" && description && (
                          <p className="text-[9px] text-muted-foreground line-clamp-2 mt-1 leading-normal">
                            {description}
                          </p>
                        )}

                        {activeCategory !== "medicine" && activeCategory !== "custom" && description && (
                          <p className="text-[9px] text-muted-foreground line-clamp-2 mt-1 leading-normal">
                            {description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border/20 pt-2 flex items-center justify-between mt-2 relative z-10">
                      <div className="flex items-center text-muted-foreground text-[8px] font-semibold gap-2">
                        <CalendarIcon className="w-3 h-3 text-primary/85" />
                        <span>{format(mockDate, "MMM d")}</span>
                        <Clock className="w-3 h-3 text-primary/85" />
                        <span>{format(mockDate, "h:mm a")}</span>
                      </div>
                      <span className="text-[8px] font-bold rounded-md px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Preview
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* 2. OS DESKTOP NOTIFICATION BANNER */}
                {previewTab === "desktop" && (
                  <motion.div
                    key="desktop-view"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-card/75 border border-border/30 rounded-2xl p-4 shadow-md flex items-start gap-3 select-none backdrop-blur-md"
                  >
                    <span className="p-2 bg-primary/10 text-primary border border-primary/20 rounded-xl shrink-0">
                      <Bell className="w-4.5 h-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-foreground">KnoVault App</span>
                        <span className="text-[8px] text-muted-foreground font-semibold">Just Now</span>
                      </div>
                      <h5 className="text-xs font-bold text-foreground truncate mt-1">
                        {mockTitle}
                      </h5>
                      <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed mt-1 font-medium">
                        {activeCategory === "medicine" 
                          ? `Time to take: ${dosage} • ${medType}. Intake rule: ${foodTiming}. Instructions: ${medNotes}`
                          : description || "Scheduled alert trigger details."}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* 3. MOBILE NOTIFICATION PREVIEW */}
                {previewTab === "mobile" && (
                  <motion.div
                    key="mobile-view"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between h-[210px] w-full max-w-[260px] mx-auto text-white relative overflow-hidden"
                  >
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-10" />
                    <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold px-1 mt-1">
                      <span>9:41 AM</span>
                      <div className="flex items-center gap-1">
                        <span>LTE</span>
                        <div className="w-3.5 h-1.5 bg-slate-400 rounded-sm" />
                      </div>
                    </div>

                    <div className="my-auto bg-black/45 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 mt-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="p-1 bg-primary/20 text-primary border border-primary/20 rounded-md">
                          <Bell className="w-2.5 h-2.5" />
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-300">KnoVault</span>
                        <span className="text-[7px] text-slate-500 font-semibold ml-auto">now</span>
                      </div>
                      <h6 className="text-[10px] font-bold text-white truncate">{mockTitle}</h6>
                      <p className="text-[8px] text-slate-300 line-clamp-1 mt-0.5 leading-normal">
                        {activeCategory === "medicine" ? `${dosage} • ${foodTiming}` : description || "Reminder Alarm."}
                      </p>
                    </div>

                    <div className="text-[8px] text-center text-slate-400 font-semibold mt-2">
                      Swipe up to open
                    </div>
                  </motion.div>
                )}

                {/* 4. TIMELINE PREVIEW */}
                {previewTab === "timeline" && (
                  <motion.div
                    key="timeline-view"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-card border border-border/30 rounded-3xl p-4 shadow-md flex flex-col justify-between min-h-[190px] overflow-hidden"
                  >
                    <Label className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground/75 mb-2.5 block">Daily Schedule Context</Label>
                    
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-muted-foreground w-12 shrink-0">08:00 AM</span>
                        <div className="flex-1 h-0.5 bg-border/25 relative" />
                      </div>
                      
                      {/* Active Alert Node */}
                      <div className="flex items-center gap-3 relative">
                        <span className="text-[9px] font-extrabold text-primary w-12 shrink-0">{format(mockDate, "hh:mm a")}</span>
                        <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl p-2 flex items-center gap-2 shadow-sm relative">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-[10px] font-bold text-foreground truncate">{mockTitle}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-muted-foreground w-12 shrink-0">01:00 PM</span>
                        <div className="flex-1 h-0.5 bg-border/25 relative" />
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-muted-foreground w-12 shrink-0">08:30 PM</span>
                        <div className="flex-1 h-0.5 bg-border/25 relative" />
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>

          {/* QUICK HELP TIP BOX */}
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl mt-4 relative z-10 shrink-0">
            <span className="text-[9px] font-bold text-primary flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
              Desktop Reminders Checklist
            </span>
            <p className="text-[9px] text-muted-foreground mt-1 font-semibold leading-relaxed">
              Verify the date, triggers, and dosage times. Reminders will push native browser notifications once scheduled!
            </p>
          </div>
        </div>

      </div>

      {/* 3. BOTTOM STICKY ACTION BAR */}
      <div className="p-5 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/25 rounded-3xl shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/reminders")}
            className="text-muted-foreground hover:text-foreground rounded-2xl h-11 px-5 cursor-pointer font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground rounded-2xl h-11 px-4 cursor-pointer font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Panel
          </Button>
        </div>

        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white rounded-2xl h-11 px-8 font-bold shadow-[0_4px_16px_rgba(124,77,255,0.35)] hover:shadow-[0_4px_24px_rgba(124,77,255,0.5)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {idParam ? "Save Changes" : "Create Reminder"}
              <ArrowRight className="w-4.5 h-4.5" />
            </>
          )}
        </Button>
      </div>

    </div>
  );
}

export default function ReminderBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ReminderBuilderContent />
    </Suspense>
  );
}
