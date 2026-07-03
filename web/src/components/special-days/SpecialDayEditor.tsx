/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SpecialDay } from "@/types/SpecialDay";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
import api from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const specialDaySchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["birthday", "anniversary", "engagement", "graduation", "wedding", "custom"]),
  is_recurring: z.boolean(),
  custom_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  gift_ideas: z.string().optional().nullable(),
  celebration_plans: z.string().optional().nullable(),
  reminder_notes: z.string().optional().nullable(),
  message_draft: z.string().optional().nullable(),
  recipient_email: z.string().optional().nullable(),
  auto_send_email: z.boolean(),
  email_subject: z.string().optional().nullable(),
  email_message: z.string().optional().nullable(),
  email_send_time: z.string().optional().nullable(),
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
          message: "Please enter a valid email address",
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
        message: "Email message is required when auto email is enabled",
        path: ["email_message"],
      });
    }
  }
});

type SpecialDayFormValues = z.infer<typeof specialDaySchema>;

interface SpecialDayEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialDay?: SpecialDay | null;
}

export function SpecialDayEditor({ open, onOpenChange, specialDay }: SpecialDayEditorProps) {
  const { createSpecialDay, updateSpecialDay } = useSpecialDaysStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: SpecialDayFormValues = {
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    type: "birthday",
    is_recurring: true,
    custom_type: "",
    notes: "",
    gift_ideas: "",
    celebration_plans: "",
    reminder_notes: "",
    message_draft: "",
    recipient_email: "",
    auto_send_email: false,
    email_subject: "",
    email_message: "",
    email_send_time: "09:00",
  };

  const form = useForm<SpecialDayFormValues>({
    resolver: zodResolver(specialDaySchema as any),
    defaultValues,
  });

  const watchType = form.watch("type");

  useEffect(() => {
    if (specialDay) {
      form.reset({
        title: specialDay.title,
        date: specialDay.date,
        type: specialDay.type as any,
        is_recurring: specialDay.is_recurring,
        custom_type: specialDay.custom_type || "",
        notes: specialDay.notes || "",
        gift_ideas: specialDay.gift_ideas || "",
        celebration_plans: specialDay.celebration_plans || "",
        reminder_notes: specialDay.reminder_notes || "",
        message_draft: specialDay.message_draft || "",
        recipient_email: specialDay.recipient_email || "",
        auto_send_email: !!specialDay.auto_send_email,
        email_subject: specialDay.email_subject || "",
        email_message: specialDay.email_message || "",
        email_send_time: specialDay.email_send_time || "09:00",
      });
    } else {
      form.reset(defaultValues);
    }
  }, [specialDay, open, form]);

  const [isGeneratingWish, setIsGeneratingWish] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const handleGenerateWish = async () => {
    const titleVal = form.getValues("title");
    const typeVal = form.getValues("type");
    const customTypeVal = form.getValues("custom_type");

    setIsGeneratingWish(true);
    try {
      const response = await api.post("/api/important-days/generate-wish", {
        type: typeVal,
        person_name: titleVal || "Recipient",
        custom_type: typeVal === "custom" ? customTypeVal : null,
      });
      if (response.data) {
        form.setValue("email_subject", response.data.subject || "");
        form.setValue("email_message", response.data.message || "");
        toast.success("AI Wish generated and populated!");
      }
    } catch (error) {
      console.error("Failed to generate AI wish:", error);
      toast.error("Failed to generate AI wish. Using fallback template.");
      const personName = titleVal || "Recipient";
      form.setValue("email_subject", `Happy ${typeVal}! 🎉`);
      form.setValue("email_message", `Dear ${personName},\n\nWishing you a wonderful ${typeVal}! Have a great day!`);
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
    } catch (error) {
      console.error("Failed to send test email:", error);
      toast.error("Failed to send test email. Check server configuration.");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (specialDay) {
        await updateSpecialDay(specialDay.id, data as any);
        toast.success("Event updated successfully");
      } else {
        await createSpecialDay(data as any);
        toast.success("Event created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      // Handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-background border-border text-foreground p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500" />
        
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-card/30">
          <DialogTitle className="text-2xl font-bold">
            {specialDay ? "Edit Celebration" : "Create Celebration"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            {specialDay ? "Update the details for this special day." : "Add a new birthday, anniversary, or milestone to your calendar."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[85vh]">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-8 py-6">
              
              {/* SECTION 1: Basic Information */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">1</div>
                  <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Event Title</Label>
                    <Input
                      {...form.register("title")}
                      placeholder="e.g. Emma's 30th Birthday, 5th Anniversary"
                      className="bg-card border-border/50 focus-visible:ring-pink-500 text-base py-5"
                    />
                    {form.formState.errors.title && (
                      <p className="text-red-400 text-sm font-medium">{form.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Event Date</Label>
                    <Controller
                      control={form.control}
                      name="date"
                      render={({ field }) => {
                        const dateVal = field.value ? new Date(field.value) : undefined;
                        // To prevent timezone drift on the date picker
                        if (dateVal) {
                          dateVal.setMinutes(dateVal.getMinutes() + dateVal.getTimezoneOffset());
                        }
                        
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-card border-border/50 py-5",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-pink-500" />
                                {field.value ? format(new Date(field.value), "MMMM do, yyyy") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                              <Calendar
                                mode="single"
                                selected={dateVal}
                                onSelect={(d) => {
                                  if (d) {
                                    // ensure local timezone format
                                    const yyyy = d.getFullYear();
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const dd = String(d.getDate()).padStart(2, '0');
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
                      <p className="text-red-400 text-sm font-medium">{form.formState.errors.date.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Event Type</Label>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-card border-border/50 py-5">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            <SelectItem value="birthday">Birthday</SelectItem>
                            <SelectItem value="anniversary">Anniversary</SelectItem>
                            <SelectItem value="engagement">Milestone</SelectItem>
                            <SelectItem value="graduation">Achievement</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {watchType === "custom" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                    <Label className="text-sm font-medium">Custom Label</Label>
                    <Input
                      {...form.register("custom_type")}
                      placeholder="e.g. Work Anniversary"
                      className="bg-card border-border/50"
                    />
                  </motion.div>
                )}

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-base">Repeats Yearly</Label>
                    <p className="text-xs text-muted-foreground">Automatically track this event every year.</p>
                  </div>
                  <Controller
                    control={form.control}
                    name="is_recurring"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-pink-500" />
                    )}
                  />
                </div>
              </div>

              {/* SECTION 2: Celebration Planning */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-xs font-bold">2</div>
                  <h3 className="text-lg font-semibold text-foreground">Planning & Ideas</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Gift Ideas</Label>
                    <Textarea
                      {...form.register("gift_ideas")}
                      placeholder="Things they might like..."
                      className="bg-card border-border/50 resize-none h-24"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Celebration Plans</Label>
                    <Textarea
                      {...form.register("celebration_plans")}
                      placeholder="Dinner reservations, surprise party..."
                      className="bg-card border-border/50 resize-none h-24"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Message Draft</Label>
                  <Textarea
                    {...form.register("message_draft")}
                    placeholder="Draft a nice message or text to send them..."
                    className="bg-card border-border/50 resize-none h-20"
                  />
                </div>
                
                <div className="space-y-2 pb-2">
                  <Label className="text-sm font-medium">Additional Notes</Label>
                  <Textarea
                    {...form.register("notes")}
                    placeholder="Sizes, preferences, or any other details..."
                    className="bg-card border-border/50 resize-none h-20"
                  />
                </div>
              </div>

              {/* SECTION 3: Auto Email Wishes */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 text-xs font-bold">3</div>
                  <h3 className="text-lg font-semibold text-foreground">Auto Email Wishes</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-base">Enable Auto Email Wishes</Label>
                    <p className="text-xs text-muted-foreground">Automatically send a greeting email to the recipient on this day.</p>
                  </div>
                  <Controller
                    control={form.control}
                    name="auto_send_email"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-pink-500" />
                    )}
                  />
                </div>

                {form.watch("auto_send_email") && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Recipient Email</Label>
                      <Input
                        {...form.register("recipient_email")}
                        placeholder="e.g. friend@example.com"
                        type="email"
                        className="bg-card border-border/50"
                      />
                      {form.formState.errors.recipient_email && (
                        <p className="text-red-400 text-sm font-medium">{form.formState.errors.recipient_email.message}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Email Content</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateWish}
                        disabled={isGeneratingWish}
                        className="text-pink-500 hover:text-pink-600 border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10"
                      >
                        {isGeneratingWish ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        ✨ Generate AI Wish
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email Subject</Label>
                      <Input
                        {...form.register("email_subject")}
                        placeholder="e.g. Wishing you a happy birthday!"
                        className="bg-card border-border/50"
                      />
                      {form.formState.errors.email_subject && (
                        <p className="text-red-400 text-sm font-medium">{form.formState.errors.email_subject.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email Message Body</Label>
                      <Textarea
                        {...form.register("email_message")}
                        placeholder="Write your email wishes here..."
                        className="bg-card border-border/50 resize-none h-32"
                      />
                      {form.formState.errors.email_message && (
                        <p className="text-red-400 text-sm font-medium">{form.formState.errors.email_message.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Send Email Time</Label>
                        <Input
                          {...form.register("email_send_time")}
                          type="time"
                          className="bg-card border-border/50"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendTestEmail}
                        disabled={isSendingTestEmail}
                        className="w-full text-foreground border-border/50 hover:bg-muted"
                      >
                        {isSendingTestEmail ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        ✉️ Send Test Email
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-card/50 border-t border-border/50 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)] px-8"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {specialDay ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
