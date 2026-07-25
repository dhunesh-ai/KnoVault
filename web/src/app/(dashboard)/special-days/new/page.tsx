/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  CalendarIcon,
  Sparkles,
  Send,
  BellRing,
  ArrowLeft,
  X,
  Gift,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Clock,
  User,
  Zap,
  MapPin,
  HeartHandshake,
  Smile,
  Save,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  CATEGORIES,
  REMINDER_TIMING_OPTIONS,
  getCategoryMeta,
  getAgeInfo,
  calculateDaysRemaining,
} from "@/lib/special-days-utils";
import { Badge } from "@/components/ui/badge";

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Birthday: "Birthdays & age years",
  "Wedding Anniversary": "Weddings & milestones",
  Engagement: "Rings & proposal dates",
  Festival: "Holidays & cultural days",
  Meeting: "Syncs & appointments",
  Achievement: "Graduations & wins",
  "Personal Memory": "Special memories",
  "Custom Event": "Custom occasions",
};

const specialDaySchema = z.object({
  title: z.string().min(1, "Event Name / Title is required").max(100),
  date: z.string().min(1, "Event Date is required"),
  type: z.string().min(1, "Event Category is required"),
  is_recurring: z.boolean(),
  custom_type: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
  favorite_color: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  emoji: z.string().optional().nullable(),
  // Section B
  reminder_enabled: z.boolean(),
  reminder_type: z.string().optional().nullable(),
  reminder_value: z.number().optional().nullable(),
  reminder_unit: z.string().optional().nullable(),
  reminder_time: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  // Section C
  auto_send_email: z.boolean(),
  recipient_email: z.string().optional().nullable(),
  email_subject: z.string().optional().nullable(),
  email_message: z.string().optional().nullable(),
  email_send_time: z.string().optional().nullable(),
  // Section D
  gift_ideas: z.string().optional().nullable(),
  celebration_plans: z.string().optional().nullable(),
  reminder_notes: z.string().optional().nullable(),
  message_draft: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  checklist: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.auto_send_email) {
    if (!data.recipient_email || !data.recipient_email.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recipient email is required when auto email is enabled",
        path: ["recipient_email"],
      });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.recipient_email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid recipient email address",
          path: ["recipient_email"],
        });
      }
    }
    if (!data.email_subject || !data.email_subject.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email subject is required when auto email is enabled",
        path: ["email_subject"],
      });
    }
    if (!data.email_message || !data.email_message.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email message body is required when auto email is enabled",
        path: ["email_message"],
      });
    }
  }
});

type SpecialDayFormValues = z.infer<typeof specialDaySchema>;

function SpecialDayEditorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdStr = searchParams.get("id");
  const editId = editIdStr ? parseInt(editIdStr, 10) : null;

  const { specialDays, createSpecialDay, updateSpecialDay, fetchSpecialDays } = useSpecialDaysStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingWish, setIsGeneratingWish] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const existingEvent = editId ? specialDays.find((sd) => sd.id === editId) : null;

  const defaultValues: SpecialDayFormValues = {
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    type: "Birthday",
    is_recurring: true,
    custom_type: "",
    relationship: "",
    favorite_color: "#7C4DFF",
    location: "",
    emoji: "🎂",
    // Section B
    reminder_enabled: false,
    reminder_type: "1_day",
    reminder_value: 1,
    reminder_unit: "days",
    reminder_time: "09:00",
    timezone: typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC",
    // Section C
    auto_send_email: false,
    recipient_email: "",
    email_subject: "",
    email_message: "",
    email_send_time: "09:00",
    // Section D
    gift_ideas: "",
    celebration_plans: "",
    reminder_notes: "",
    message_draft: "",
    notes: "",
    checklist: "",
    budget: "",
  };

  const form = useForm<SpecialDayFormValues>({
    resolver: zodResolver(specialDaySchema as any),
    defaultValues,
    mode: "onChange",
  });

  const watchTitle = form.watch("title");
  const watchDate = form.watch("date");
  const watchType = form.watch("type");
  const watchEmoji = form.watch("emoji");
  const watchRelationship = form.watch("relationship");
  const watchLocation = form.watch("location");
  const watchIsRecurring = form.watch("is_recurring");
  const watchReminderEnabled = form.watch("reminder_enabled");
  const watchReminderType = form.watch("reminder_type");
  const watchAutoEmail = form.watch("auto_send_email");
  const watchBudget = form.watch("budget");

  useEffect(() => {
    fetchSpecialDays();
  }, [fetchSpecialDays]);

  useEffect(() => {
    if (existingEvent) {
      form.reset({
        title: existingEvent.title || "",
        date: existingEvent.date || format(new Date(), "yyyy-MM-dd"),
        type: existingEvent.type || "Birthday",
        is_recurring: existingEvent.is_recurring !== undefined ? existingEvent.is_recurring : true,
        custom_type: existingEvent.custom_type || "",
        relationship: existingEvent.relationship || "",
        favorite_color: existingEvent.favorite_color || "#7C4DFF",
        location: existingEvent.location || "",
        emoji: existingEvent.emoji || "🎂",
        reminder_enabled: !!existingEvent.reminder_enabled,
        reminder_type: existingEvent.reminder_type || "1_day",
        reminder_value: existingEvent.reminder_value || 1,
        reminder_unit: existingEvent.reminder_unit || "days",
        reminder_time: existingEvent.reminder_time || "09:00",
        timezone: existingEvent.timezone || (typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC"),
        auto_send_email: !!existingEvent.auto_send_email,
        recipient_email: existingEvent.recipient_email || "",
        email_subject: existingEvent.email_subject || "",
        email_message: existingEvent.email_message || "",
        email_send_time: existingEvent.email_send_time || "09:00",
        gift_ideas: existingEvent.gift_ideas || "",
        celebration_plans: existingEvent.celebration_plans || "",
        reminder_notes: existingEvent.reminder_notes || "",
        message_draft: existingEvent.message_draft || "",
        notes: existingEvent.notes || "",
        checklist: existingEvent.checklist || "",
        budget: existingEvent.budget || "",
      });
    }
  }, [existingEvent, form]);

  const handleGenerateWish = async () => {
    const titleVal = form.getValues("title");
    const typeVal = form.getValues("type");
    const customTypeVal = form.getValues("custom_type");

    setIsGeneratingWish(true);
    try {
      const response = await api.post("/api/important-days/generate-wish", {
        type: typeVal,
        person_name: titleVal || "Recipient",
        custom_type: typeVal === "Custom Event" ? customTypeVal : null,
      });
      if (response.data) {
        form.setValue("email_subject", response.data.subject || "");
        form.setValue("email_message", response.data.message || "");
        toast.success("AI Wish generated successfully!");
      }
    } catch (error) {
      console.error("Failed to generate AI wish:", error);
      toast.error("AI service offline. Loaded custom wish template.");
      const personName = titleVal || "Recipient";
      form.setValue("email_subject", `Happy ${typeVal}, ${personName}! 🎉`);
      form.setValue("email_message", `Dear ${personName},\n\nWishing you a joyful ${typeVal}! May your day be filled with happiness and great memories.\n\nWarmly,\nFrom KnoVault`);
    } finally {
      setIsGeneratingWish(false);
    }
  };

  const handleSendTestEmail = async () => {
    const recipient = form.getValues("recipient_email");
    const subject = form.getValues("email_subject");
    const message = form.getValues("email_message");

    if (!recipient?.trim()) {
      toast.error("Please enter a recipient email first.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      toast.error("Please enter a valid recipient email.");
      return;
    }
    if (!subject?.trim()) {
      toast.error("Please enter an email subject first.");
      return;
    }
    if (!message?.trim()) {
      toast.error("Please enter an email message first.");
      return;
    }

    setIsSendingTestEmail(true);
    try {
      await api.post("/api/important-days/send-test-email", {
        recipient_email: recipient,
        email_subject: subject,
        email_message: message,
      });
      toast.success("Test email sent successfully!");
    } catch (error: any) {
      console.error("Failed to send test email:", error);
      toast.error(error.response?.data?.detail || "Failed to send test email.");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (existingEvent) {
        await updateSpecialDay(existingEvent.id, data as any);
        toast.success("Special day updated successfully");
      } else {
        await createSpecialDay(data as any);
        toast.success("Special day created successfully");
      }
      router.push("/special-days");
    } catch (error) {
      toast.error("Failed to save special day");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const element = document.querySelector(`[name="${firstErrorKey}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        (element as HTMLElement).focus();
      }
    }
  };

  const meta = getCategoryMeta(watchType);
  const ageInfo = getAgeInfo(watchDate, watchType);
  const daysLeft = calculateDaysRemaining(watchDate, watchIsRecurring);

  const getDaysFormatted = () => {
    if (daysLeft === 0) return "Today! 🎉";
    if (daysLeft === 1) return "Tomorrow ⏳";
    if (daysLeft < 0) return "Passed";
    return `${daysLeft} Days Remaining`;
  };

  return (
    <div className="min-h-screen bg-muted/10 text-foreground pb-24">
      
      {/* STICKY TOP HEADER */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/60 py-4 px-6 lg:px-10 transition-all">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/special-days")}
              className="w-10 h-10 rounded-2xl bg-card border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 shadow-2xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  FULL-PAGE WORKSPACE
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs text-muted-foreground font-semibold">Special Days</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                {existingEvent ? "✨ Edit Special Day" : "✨ Add Special Day"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/special-days")}
              className="h-12 px-5 rounded-2xl text-muted-foreground hover:text-foreground font-bold text-sm"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => toast.info("Draft saved locally")}
              className="h-12 px-5 rounded-2xl bg-card border-border/60 text-foreground font-bold text-sm gap-2"
            >
              <Save className="w-4 h-4 text-purple-500" /> Save Draft
            </Button>

            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit, onError)}
              disabled={isSubmitting || !watchTitle?.trim()}
              className="h-12 px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-lg shadow-purple-500/25 text-base transition-all gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              {existingEvent ? "Save Changes" : "Add Special Day"}
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN 2-COLUMN WORKSPACE (70% LEFT / 30% RIGHT) */}
      <main className="max-w-[1500px] mx-auto p-6 lg:p-10">
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* LEFT COLUMN (70% WIDTH / 8 COLS) - MAIN FORM WORKSPACE */}
          <div className="lg:col-span-8 space-y-12">

            {/* SECTION 1: EVENT DETAILS */}
            <section className="bg-card/80 border border-border/60 rounded-[28px] p-6 lg:p-8 shadow-xs space-y-8">
              <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl text-purple-600">
                  📅
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                    SECTION 1 • EVENT DETAILS
                  </h3>
                  <h2 className="text-xl font-black text-foreground">Basic Information & Category Selection</h2>
                </div>
              </div>

              {/* Event Name Input (52px height) */}
              <div className="space-y-2.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  EVENT NAME / TITLE *
                </Label>
                <Input
                  {...form.register("title")}
                  placeholder="e.g. Sarah's Birthday, Team Milestone Celebration"
                  className="h-[52px] bg-background border-border/60 focus-visible:ring-purple-500 text-base font-semibold rounded-[16px] px-5"
                />
                {form.formState.errors.title && (
                  <p className="text-red-500 text-xs font-semibold">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Category Selection Grid (4 columns, 140x90px cards) */}
              <div className="space-y-2.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  EVENT CATEGORY *
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {CATEGORIES.map((cat) => {
                    const isSelected = watchType === cat.value;
                    const desc = CATEGORY_DESCRIPTIONS[cat.value] || "Special occasion";
                    return (
                      <motion.button
                        type="button"
                        key={cat.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => {
                          form.setValue("type", cat.value);
                          form.setValue("emoji", cat.emoji);
                        }}
                        className={cn(
                          "h-[90px] min-h-[90px] p-3 rounded-[18px] border flex flex-col items-center justify-center text-center cursor-pointer transition-all relative overflow-hidden group",
                          isSelected
                            ? "border-purple-600 bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                            : "border-border/60 bg-background text-foreground hover:border-purple-400/60 hover:bg-purple-500/10"
                        )}
                      >
                        <span className="text-2xl leading-none mb-1 group-hover:scale-110 transition-transform">
                          {cat.emoji}
                        </span>
                        <span className="font-black text-xs truncate w-full px-1">{cat.shortLabel}</span>
                        <span className={cn("text-[10px] font-semibold truncate w-full px-1 mt-0.5", isSelected ? "text-purple-100" : "text-muted-foreground")}>
                          {desc}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {watchType === "Custom Event" && (
                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    CUSTOM EVENT TYPE
                  </Label>
                  <Input
                    {...form.register("custom_type")}
                    placeholder="e.g. Graduation, Housewarming"
                    className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                  />
                </div>
              )}

              {/* Date & Relationship */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    EVENT DATE *
                  </Label>
                  <Controller
                    control={form.control}
                    name="date"
                    render={({ field }) => {
                      const dateVal = field.value ? new Date(field.value) : undefined;
                      if (dateVal) {
                        dateVal.setMinutes(dateVal.getMinutes() + dateVal.getTimezoneOffset());
                      }

                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-[52px] justify-start text-left font-semibold bg-background border-border/60 rounded-[16px] text-base px-5",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-5 w-5 text-purple-500 shrink-0" />
                              {field.value ? format(new Date(field.value), "MMMM do, yyyy") : <span>Pick event date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-card border-border rounded-2xl shadow-xl" align="start">
                            <Calendar
                              mode="single"
                              selected={dateVal}
                              onSelect={(d) => {
                                if (d) {
                                  const yyyy = d.getFullYear();
                                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                                  const dd = String(d.getDate()).padStart(2, "0");
                                  field.onChange(`${yyyy}-${mm}-${dd}`);
                                }
                              }}
                              className="bg-card text-foreground"
                            />
                          </PopoverContent>
                        </Popover>
                      );
                    }}
                  />
                  {form.formState.errors.date && (
                    <p className="text-red-500 text-xs font-semibold">{form.formState.errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    RELATIONSHIP / PERSON
                  </Label>
                  <Input
                    {...form.register("relationship")}
                    placeholder="e.g. Best Friend, Sister, Colleague"
                    className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                  />
                </div>
              </div>

              {/* Location & Emoji */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    LOCATION / VENUE
                  </Label>
                  <Input
                    {...form.register("location")}
                    placeholder="e.g. Central Park, Grand Hotel, Zoom"
                    className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    ICON EMOJI
                  </Label>
                  <Input
                    {...form.register("emoji")}
                    placeholder="🎂, 💍, 🏆, ✨"
                    className="h-[52px] bg-background border-border/60 rounded-[16px] text-xl px-5 font-semibold"
                  />
                </div>
              </div>

              {/* Recurring Toggle Switch */}
              <div className="flex items-center justify-between p-5 bg-background rounded-[20px] border border-border/60">
                <div className="space-y-0.5">
                  <Label className="text-sm font-black text-foreground">Recurring Event</Label>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Automatically repeat this celebration every year on the same date.
                  </p>
                </div>
                <Controller
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-purple-600" />
                  )}
                />
              </div>
            </section>

            {/* SECTION 2: REMINDER SETTINGS */}
            <section className="bg-card/80 border border-border/60 rounded-[28px] p-6 lg:p-8 shadow-xs space-y-8">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-2xl text-violet-600">
                    🔔
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
                      SECTION 2 • REMINDER
                    </h3>
                    <h2 className="text-xl font-black text-foreground">Notification Schedule & Timezone</h2>
                  </div>
                </div>
                <Controller
                  control={form.control}
                  name="reminder_enabled"
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-muted-foreground">
                        {field.value ? "Enabled" : "Disabled"}
                      </span>
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-purple-600" />
                    </div>
                  )}
                />
              </div>

              <AnimatePresence initial={false}>
                {watchReminderEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2.5">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        REMINDER TIMING
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {REMINDER_TIMING_OPTIONS.map((opt) => {
                          const isSelected = watchReminderType === opt.value;
                          return (
                            <button
                              type="button"
                              key={opt.value}
                              onClick={() => form.setValue("reminder_type", opt.value)}
                              className={cn(
                                "h-12 px-4 rounded-[14px] border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer",
                                isSelected
                                  ? "border-purple-600 bg-purple-600 text-white font-extrabold shadow-sm"
                                  : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              )}
                            >
                              <BellRing className="w-4 h-4" />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {watchReminderType === "custom" && (
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="space-y-2">
                          <Label className="text-xs font-extrabold text-muted-foreground">Custom Value</Label>
                          <Input
                            type="number"
                            {...form.register("reminder_value", { valueAsNumber: true })}
                            className="h-[52px] bg-background border-border/60 rounded-[16px] px-5 font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-extrabold text-muted-foreground">Unit</Label>
                          <select
                            {...form.register("reminder_unit")}
                            className="w-full h-[52px] bg-background border border-border/60 rounded-[16px] px-4 text-sm text-foreground focus:outline-none focus:border-purple-500 font-semibold"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          REMINDER TIME
                        </Label>
                        <Input
                          type="time"
                          {...form.register("reminder_time")}
                          className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                        />
                      </div>

                      <div className="space-y-2.5">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          TIMEZONE
                        </Label>
                        <Input
                          {...form.register("timezone")}
                          placeholder="UTC / America/New_York"
                          className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* SECTION 3: AUTO EMAIL WISHES */}
            <section className="bg-card/80 border border-border/60 rounded-[28px] p-6 lg:p-8 shadow-xs space-y-8">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-2xl text-pink-600">
                    ✉️
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">
                      SECTION 3 • AUTO EMAIL WISHES
                    </h3>
                    <h2 className="text-xl font-black text-foreground">AI Greeting Generator & Auto Send</h2>
                  </div>
                </div>
                <Controller
                  control={form.control}
                  name="auto_send_email"
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-muted-foreground">
                        {field.value ? "Enabled" : "Disabled"}
                      </span>
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-pink-600" />
                    </div>
                  )}
                />
              </div>

              <AnimatePresence initial={false}>
                {watchAutoEmail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2.5">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        RECIPIENT EMAIL ADDRESS *
                      </Label>
                      <Input
                        {...form.register("recipient_email")}
                        placeholder="e.g. recipient@example.com"
                        type="email"
                        className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                      />
                      {form.formState.errors.recipient_email && (
                        <p className="text-red-500 text-xs font-semibold">{form.formState.errors.recipient_email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          EMAIL SUBJECT *
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateWish}
                          disabled={isGeneratingWish}
                          className="h-9 text-pink-600 dark:text-pink-400 hover:text-pink-700 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 rounded-xl font-black px-4 text-xs"
                        >
                          {isGeneratingWish ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-1.5 text-pink-500" />
                          )}
                          ✨ Generate AI Wish
                        </Button>
                      </div>
                      <Input
                        {...form.register("email_subject")}
                        placeholder="e.g. Happy Birthday Emma! 🎂"
                        className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                      />
                      {form.formState.errors.email_subject && (
                        <p className="text-red-500 text-xs font-semibold">{form.formState.errors.email_subject.message}</p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        MESSAGE BODY (AUTO EXPANDING, MIN 160PX) *
                      </Label>
                      <Textarea
                        {...form.register("email_message")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.stopPropagation();
                        }}
                        placeholder="Write your email greeting message here..."
                        className="min-h-[160px] bg-background border-border/60 resize-y rounded-[16px] p-5 text-base font-normal leading-relaxed"
                      />
                      {form.formState.errors.email_message && (
                        <p className="text-red-500 text-xs font-semibold">{form.formState.errors.email_message.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end pt-1">
                      <div className="space-y-2.5">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          SEND TIME
                        </Label>
                        <Input
                          type="time"
                          {...form.register("email_send_time")}
                          className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendTestEmail}
                        disabled={isSendingTestEmail}
                        className="h-[52px] w-full text-foreground border-border/60 hover:bg-muted rounded-[16px] font-bold text-sm"
                      >
                        {isSendingTestEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2 text-pink-500" />
                        )}
                        ✉️ Send Test Email
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* SECTION 4: PLANNING & IDEAS */}
            <section className="bg-card/80 border border-border/60 rounded-[28px] p-6 lg:p-8 shadow-xs space-y-8">
              <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl text-emerald-600">
                  🎁
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    SECTION 4 • PLANNING & BUDGET
                  </h3>
                  <h2 className="text-xl font-black text-foreground">Gifts, Celebration Plans & Checklists</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    GIFT IDEAS (MIN 160PX)
                  </Label>
                  <Textarea
                    {...form.register("gift_ideas")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.stopPropagation();
                    }}
                    placeholder="What would they love for their special day?"
                    className="min-h-[160px] bg-background border-border/60 resize-y rounded-[16px] p-4 text-sm"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    CELEBRATION PLANS (MIN 160PX)
                  </Label>
                  <Textarea
                    {...form.register("celebration_plans")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.stopPropagation();
                    }}
                    placeholder="Dinner party, trip, surprise plans..."
                    className="min-h-[160px] bg-background border-border/60 resize-y rounded-[16px] p-4 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    CHECKLIST (ONE ITEM PER LINE)
                  </Label>
                  <Textarea
                    {...form.register("checklist")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.stopPropagation();
                    }}
                    placeholder="Buy gift&#10;Book restaurant&#10;Confirm attendees"
                    className="min-h-[160px] bg-background border-border/60 resize-y rounded-[16px] p-4 text-sm"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    TARGET BUDGET ($ / ₹)
                  </Label>
                  <Input
                    {...form.register("budget")}
                    placeholder="e.g. ₹5000 / $150 USD"
                    className="h-[52px] bg-background border-border/60 rounded-[16px] text-base px-5 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    REMINDER NOTES (MIN 160PX)
                  </Label>
                  <Textarea
                    {...form.register("reminder_notes")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.stopPropagation();
                    }}
                    placeholder="Order cake 3 days before, send morning text..."
                    className="min-h-[160px] bg-background border-border/60 resize-y rounded-[16px] p-4 text-sm"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    CONGRATULATIONS DRAFT
                  </Label>
                  <Textarea
                    {...form.register("message_draft")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.stopPropagation();
                    }}
                    placeholder="Draft a personal congratulations or speech..."
                    className="min-h-[160px] bg-background border-border/60 resize-y rounded-[16px] p-4 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  ADDITIONAL NOTES
                </Label>
                <Textarea
                  {...form.register("notes")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.stopPropagation();
                  }}
                  placeholder="Sizes, preferences, allergies, or extra details..."
                  className="min-h-[160px] bg-background border-border/60 resize-y rounded-[16px] p-4 text-sm"
                />
              </div>
            </section>

          </div>

          {/* RIGHT SIDEBAR (30% WIDTH / 4 COLS) - STICKY LIVE EVENT PREVIEW CARD */}
          <div className="lg:col-span-4 sticky top-24 space-y-6">
            <div className="bg-card border border-border/70 rounded-[28px] p-6 lg:p-7 shadow-xl relative overflow-hidden backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" /> Live Event Preview
                </span>
                <Badge variant="outline" className="text-[10px] font-black text-purple-600 bg-purple-500/10 border-purple-500/20 px-3 py-0.5 rounded-full">
                  Updates Live
                </Badge>
              </div>

              {/* Event Title & Emoji */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-3xl shrink-0 shadow-xs">
                  {watchEmoji || meta.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-foreground text-xl leading-tight truncate">
                    {watchTitle?.trim() || "Untitled Event"}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border", meta.badgeBg)}>
                      {watchType}
                    </Badge>
                    {watchRelationship && (
                      <span className="text-xs text-muted-foreground font-bold truncate">({watchRelationship})</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Countdown Pill */}
              <div className="p-4 bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent rounded-2xl border border-purple-500/20 flex items-center justify-between">
                <span className="text-xs font-extrabold text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-500" /> Countdown
                </span>
                <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                  {getDaysFormatted()}
                </span>
              </div>

              {/* Live Details Breakdown */}
              <div className="space-y-4 text-xs font-semibold divide-y divide-border/40">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground font-bold">Event Date</span>
                  <span className="font-extrabold text-foreground">
                    {watchDate ? format(new Date(watchDate), "MMMM d, yyyy") : "—"}
                  </span>
                </div>

                {ageInfo && (
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-muted-foreground font-bold">Birthday Age</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                      Turns {ageInfo.upcomingAge}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3">
                  <span className="text-muted-foreground font-bold">Reminder Status</span>
                  <span className={cn("font-extrabold flex items-center gap-1.5", watchReminderEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                    {watchReminderEnabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {watchReminderEnabled ? "Enabled" : "Off"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-muted-foreground font-bold">Email Wishes</span>
                  <span className={cn("font-extrabold flex items-center gap-1.5", watchAutoEmail ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                    {watchAutoEmail ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {watchAutoEmail ? "Enabled" : "Off"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-muted-foreground font-bold">Recurring</span>
                  <span className={cn("font-extrabold flex items-center gap-1.5", watchIsRecurring ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground")}>
                    {watchIsRecurring ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {watchIsRecurring ? "Every Year" : "One-time"}
                  </span>
                </div>

                {watchBudget && (
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-muted-foreground font-bold">Target Budget</span>
                    <span className="font-black text-foreground truncate max-w-[140px]">
                      {watchBudget}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-bold">Theme Color</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-600 shadow-xs" />
                  <span className="text-xs font-bold text-foreground">KnoVault Purple</span>
                </div>
              </div>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}

export default function SpecialDayEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/10">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    }>
      <SpecialDayEditorForm />
    </Suspense>
  );
}
