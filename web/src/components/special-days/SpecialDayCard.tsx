"use client";

import { SpecialDay } from "@/types/SpecialDay";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronRight, MoreVertical, Edit2, Trash2, MailCheck, BellRing, HeartHandshake } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getCategoryMeta, getNextOccurrence, calculateDaysRemaining, getAgeInfo } from "@/lib/special-days-utils";
import { motion } from "framer-motion";

interface SpecialDayCardProps {
  specialDay: SpecialDay;
  onClick: (day: SpecialDay) => void;
  onEdit: (day: SpecialDay) => void;
  onDelete: (id: number) => void;
}

export function SpecialDayCard({ specialDay, onClick, onEdit, onDelete }: SpecialDayCardProps) {
  const meta = getCategoryMeta(specialDay.type);
  const nextDate = getNextOccurrence(specialDay.date, specialDay.is_recurring);
  const daysLeft = calculateDaysRemaining(specialDay.date, specialDay.is_recurring);
  const isToday = daysLeft === 0;
  const isVeryClose = daysLeft > 0 && daysLeft <= 7;
  const isPassed = !specialDay.is_recurring && daysLeft < 0;

  const ageInfo = getAgeInfo(specialDay.date, specialDay.type);

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.008 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col"
    >
      <Card
        onClick={() => onClick(specialDay)}
        className={cn(
          "bg-card border border-border/60 rounded-[24px] p-6 flex flex-col justify-between min-h-[260px] h-full transition-all duration-200 group relative cursor-pointer shadow-md hover:shadow-xl hover:border-purple-400/60 overflow-hidden",
          isToday && "border-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.15)] bg-gradient-to-br from-amber-500/5 via-card to-card"
        )}
      >
        {/* MAIN BODY AREA */}
        <div className="space-y-4">
          
          {/* HEADER ROW */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center text-3xl shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                {specialDay.emoji || meta.emoji}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={cn("uppercase text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full border", meta.badgeBg)}>
                  {specialDay.custom_type || meta.shortLabel}
                </Badge>

                {specialDay.auto_send_email && (
                  <span title="Auto Email Wishes Active" className="text-pink-500 bg-pink-500/10 p-1.5 rounded-full border border-pink-500/20">
                    <MailCheck className="w-3.5 h-3.5" />
                  </span>
                )}
                {specialDay.reminder_enabled && (
                  <span title="Reminder Active" className="text-purple-500 bg-purple-500/10 p-1.5 rounded-full border border-purple-500/20">
                    <BellRing className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>

            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border shadow-xl rounded-2xl">
                  <DropdownMenuItem onClick={() => onEdit(specialDay)} className="cursor-pointer font-semibold">
                    <Edit2 className="w-4 h-4 mr-2 text-purple-500" />
                    Edit Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(specialDay.id)} className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 font-semibold">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Event
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* TITLE & DETAILS */}
          <div>
            <h3 className="font-black text-foreground text-lg lg:text-xl leading-snug line-clamp-2 break-words group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {specialDay.title}
            </h3>

            <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold">
                <CalendarDays className="w-4 h-4 text-purple-500 shrink-0" />
                <span>{format(nextDate, "EEEE, MMMM do, yyyy")}</span>
              </div>

              {specialDay.relationship && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-muted px-2.5 py-1 rounded-full border border-border/40">
                  <HeartHandshake className="w-3.5 h-3.5 text-purple-500" /> {specialDay.relationship}
                </span>
              )}
            </div>

            {ageInfo && !isPassed && (
              <p className={cn("text-sm font-extrabold mt-2.5", isToday ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400")}>
                {isToday ? `🎉 Turning ${ageInfo.upcomingAge} Today!` : `🎂 Turning ${ageInfo.upcomingAge}`}
              </p>
            )}
          </div>

        </div>

        {/* BOTTOM ROW (COUNTDOWN BADGE & ARROW) */}
        <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between gap-3">
          <div>
            {isToday ? (
              <Badge className="bg-amber-500 text-white font-black text-xs px-3 py-1 rounded-full shadow-xs animate-pulse">
                Today! 🎉
              </Badge>
            ) : isPassed ? (
              <Badge variant="outline" className="text-xs text-muted-foreground font-bold px-3 py-1 rounded-full">
                Passed
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-black rounded-full px-3 py-1 border",
                  isVeryClose
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                )}
              >
                {daysLeft === 1 ? "1 Day Left" : `${daysLeft} Days Left`}
              </Badge>
            )}
          </div>

          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
