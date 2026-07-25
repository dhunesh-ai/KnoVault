"use client";

import { SpecialDay } from "@/types/SpecialDay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, Edit2, Trash2, Copy, Check, BellRing, Mail, Gift, PartyPopper, MessageSquare, StickyNote, MapPin, HeartHandshake, CheckSquare, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getCategoryMeta, getNextOccurrence, calculateDaysRemaining, getAgeInfo } from "@/lib/special-days-utils";
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";

interface SpecialDayProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialDay: SpecialDay | null;
  onEdit: (day: SpecialDay) => void;
  onDelete: (id: number) => void;
}

export function SpecialDayProfile({ open, onOpenChange, specialDay, onEdit, onDelete }: SpecialDayProfileProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!specialDay) return null;

  const meta = getCategoryMeta(specialDay.type);
  const nextDate = getNextOccurrence(specialDay.date, specialDay.is_recurring);
  const daysLeft = calculateDaysRemaining(specialDay.date, specialDay.is_recurring);
  const isToday = daysLeft === 0;
  const isPassed = !specialDay.is_recurring && daysLeft < 0;
  const ageInfo = getAgeInfo(specialDay.date, specialDay.type);

  const copyToClipboard = (text: string, key: string, label: string) => {
    if (!text?.trim()) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const checklistItems = specialDay.checklist
    ? specialDay.checklist.split("\n").filter((line) => line.trim().length > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] bg-background border-border text-foreground p-0 overflow-hidden shadow-2xl rounded-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{specialDay.title}</DialogTitle>
        </DialogHeader>

        {/* Hero Header with Category Gradient */}
        <div className={cn("relative p-8 text-white overflow-hidden bg-gradient-to-br", meta.color)}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-4xl shadow-xl">
                {specialDay.emoji || meta.emoji}
              </div>
              <div>
                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 uppercase text-[10px] font-black tracking-widest mb-1.5">
                  {specialDay.custom_type || meta.shortLabel}
                </Badge>
                <h2 className="text-3xl font-black tracking-tight">{specialDay.title}</h2>
                <p className="text-white/80 text-sm font-semibold flex items-center gap-1.5 mt-1">
                  <CalendarDays className="w-4 h-4" />
                  {format(nextDate, "EEEE, MMMM do, yyyy")}
                  {!specialDay.is_recurring && " (One-Time Event)"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onEdit(specialDay)}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-2xl h-11 w-11 shadow-md"
              >
                <Edit2 className="w-5 h-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onDelete(specialDay.id)}
                className="bg-red-500/30 hover:bg-red-500/50 text-white border border-red-500/40 rounded-2xl h-11 w-11 shadow-md"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[70vh] p-6 space-y-6">

          {/* Countdown & Age Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-card/80 border border-border/60 shadow-sm flex flex-col justify-center items-center text-center">
              <span className="text-3xl font-black text-purple-400">
                {isToday ? "TODAY! 🎉" : isPassed ? "Passed" : `${daysLeft} Days`}
              </span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
                {isToday ? "Celebration Time" : "Days Remaining"}
              </span>
            </div>

            {ageInfo ? (
              <div className="p-5 rounded-2xl bg-card/80 border border-border/60 shadow-sm flex flex-col justify-center items-center text-center">
                <span className="text-2xl font-black text-amber-400">
                  Turning {ageInfo.upcomingAge}
                </span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
                  Currently {ageInfo.currentAge} Years Old
                </span>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-card/80 border border-border/60 shadow-sm flex flex-col justify-center items-center text-center">
                <span className="text-base font-bold text-foreground truncate max-w-xs">
                  {specialDay.location || specialDay.relationship || "Special Celebration"}
                </span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
                  Event Highlights
                </span>
              </div>
            )}
          </div>

          {/* Meta Badges */}
          {(specialDay.relationship || specialDay.location || specialDay.budget) && (
            <div className="flex flex-wrap gap-3 py-1">
              {specialDay.relationship && (
                <Badge variant="outline" className="bg-card border-border/60 py-2 px-3 rounded-xl text-xs gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-purple-400" />
                  {specialDay.relationship}
                </Badge>
              )}
              {specialDay.location && (
                <Badge variant="outline" className="bg-card border-border/60 py-2 px-3 rounded-xl text-xs gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  {specialDay.location}
                </Badge>
              )}
              {specialDay.budget && (
                <Badge variant="outline" className="bg-card border-border/60 py-2 px-3 rounded-xl text-xs gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Budget: {specialDay.budget}
                </Badge>
              )}
            </div>
          )}

          {/* Reminder & Email Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specialDay.reminder_enabled && (
              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
                  <BellRing className="w-4 h-4" /> Reminder Scheduled
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {specialDay.reminder_type === "custom"
                    ? `${specialDay.reminder_value} ${specialDay.reminder_unit} before`
                    : specialDay.reminder_type?.replace("_", " ")} at {specialDay.reminder_time || "09:00"}
                </p>
              </div>
            )}

            {specialDay.auto_send_email && (
              <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider">
                  <Mail className="w-4 h-4" /> Auto Email Configured
                </div>
                <p className="text-sm font-semibold text-foreground truncate">
                  To: {specialDay.recipient_email} at {specialDay.email_send_time || "09:00"}
                </p>
              </div>
            )}
          </div>

          {/* Planning Details */}
          <div className="space-y-4 pt-2">
            {specialDay.gift_ideas && (
              <div className="p-5 rounded-2xl bg-card/70 border border-border/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Gift className="w-4 h-4" /> Gift Ideas
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{specialDay.gift_ideas}</p>
              </div>
            )}

            {specialDay.celebration_plans && (
              <div className="p-5 rounded-2xl bg-card/70 border border-border/60 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <PartyPopper className="w-4 h-4" /> Celebration Plans
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{specialDay.celebration_plans}</p>
              </div>
            )}

            {specialDay.message_draft && (
              <div className="p-5 rounded-2xl bg-card/70 border border-border/60 space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4" /> Congratulations Message Draft
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(specialDay.message_draft!, "draft", "Message draft")}
                    className="text-xs text-muted-foreground hover:text-foreground h-7"
                  >
                    {copiedKey === "draft" ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    Copy Draft
                  </Button>
                </div>
                <p className="text-sm text-foreground bg-muted/40 p-3 rounded-xl border border-border/40 whitespace-pre-wrap font-sans">
                  {specialDay.message_draft}
                </p>
              </div>
            )}

            {checklistItems.length > 0 && (
              <div className="p-5 rounded-2xl bg-card/70 border border-border/60 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                  <CheckSquare className="w-4 h-4" /> Planning Checklist
                </div>
                <div className="space-y-1.5 pt-1">
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-foreground">
                      <div className="w-4 h-4 rounded border border-purple-400 flex items-center justify-center text-[10px] text-purple-400">✓</div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {specialDay.notes && (
              <div className="p-5 rounded-2xl bg-card/70 border border-border/60 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <StickyNote className="w-4 h-4" /> Additional Notes
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(specialDay.notes!, "notes", "Notes")}
                    className="text-xs text-muted-foreground hover:text-foreground h-7"
                  >
                    {copiedKey === "notes" ? <Check className="w-3.5 h-3.5 text-indigo-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{specialDay.notes}</p>
              </div>
            )}

            {!specialDay.gift_ideas && !specialDay.celebration_plans && !specialDay.message_draft && !specialDay.notes && checklistItems.length === 0 && (
              <div className="p-8 text-center bg-card/40 rounded-2xl border border-dashed border-border/60">
                <p className="text-sm text-muted-foreground italic">No extra planning details recorded yet. Click Edit to add gift ideas or notes!</p>
              </div>
            )}
          </div>

          <div className="h-4" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
