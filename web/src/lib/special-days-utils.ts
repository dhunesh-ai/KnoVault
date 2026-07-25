import { SpecialDay } from "@/types/SpecialDay";
import { isPast, isToday, addYears, differenceInDays } from "date-fns";

export const CATEGORIES = [
  {
    label: "🎂 Birthday",
    value: "Birthday",
    shortLabel: "Birthday",
    emoji: "🎂",
    color: "from-amber-400 to-orange-400",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-amber-500/20",
    badgeBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    accentHex: "#F59E0B",
  },
  {
    label: "💍 Anniversary",
    value: "Wedding Anniversary",
    shortLabel: "Anniversary",
    emoji: "💍",
    color: "from-rose-400 to-pink-400",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    border: "border-rose-500/20",
    badgeBg: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    accentHex: "#F43F5E",
  },
  {
    label: "💎 Engagement",
    value: "Engagement",
    shortLabel: "Engagement",
    emoji: "💎",
    color: "from-sky-400 to-blue-400",
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    border: "border-sky-500/20",
    badgeBg: "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    accentHex: "#0EA5E9",
  },
  {
    label: "🎊 Festival",
    value: "Festival",
    shortLabel: "Festival",
    emoji: "🎊",
    color: "from-orange-400 to-amber-500",
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    border: "border-orange-500/20",
    badgeBg: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    accentHex: "#F97316",
  },
  {
    label: "🤝 Meeting",
    value: "Meeting",
    shortLabel: "Meeting",
    emoji: "🤝",
    color: "from-blue-400 to-indigo-400",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    border: "border-blue-500/20",
    badgeBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    accentHex: "#3B82F6",
  },
  {
    label: "🏆 Achievement",
    value: "Achievement",
    shortLabel: "Achievement",
    emoji: "🏆",
    color: "from-purple-400 to-violet-500",
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    border: "border-purple-500/20",
    badgeBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    accentHex: "#7C4DFF",
  },
  {
    label: "📸 Memory",
    value: "Personal Memory",
    shortLabel: "Memory",
    emoji: "📸",
    color: "from-sky-400 to-indigo-400",
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    border: "border-sky-500/20",
    badgeBg: "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    accentHex: "#38BDF8",
  },
  {
    label: "✨ Custom",
    value: "Custom Event",
    shortLabel: "Custom",
    emoji: "✨",
    color: "from-slate-400 to-gray-500",
    text: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    border: "border-slate-500/20",
    badgeBg: "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
    accentHex: "#64748B",
  },
];

export const getCategoryMeta = (type: string) => {
  const t = (type || "").toLowerCase();
  if (t.includes("birthday")) return CATEGORIES[0];
  if (t.includes("wedding") || t.includes("anniversary")) return CATEGORIES[1];
  if (t.includes("engagement")) return CATEGORIES[2];
  if (t.includes("festival")) return CATEGORIES[3];
  if (t.includes("meeting")) return CATEGORIES[4];
  if (t.includes("achievement") || t.includes("graduation")) return CATEGORIES[5];
  if (t.includes("memory")) return CATEGORIES[6];
  return CATEGORIES[7];
};

export const parseEventDateParts = (dateStr: string) => {
  if (!dateStr) return null;
  const cleanStr = dateStr.split("T")[0];
  const parts = cleanStr.split("-");
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
};

export const isEventOnDate = (sd: SpecialDay, targetDate: Date) => {
  if (!sd || !sd.date) return false;
  const parsed = parseEventDateParts(sd.date);
  if (!parsed) return false;

  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  if (sd.is_recurring) {
    return parsed.month === targetMonth && parsed.day === targetDay;
  }

  return parsed.year === targetYear && parsed.month === targetMonth && parsed.day === targetDay;
};

export const getNextOccurrence = (eventDateStr: string, isRecurring: boolean = true) => {
  if (!eventDateStr) return new Date();
  const parsed = parseEventDateParts(eventDateStr);
  if (!parsed) return new Date(eventDateStr);

  const today = new Date();
  if (!isRecurring) {
    return new Date(parsed.year, parsed.month, parsed.day);
  }

  let nextDate = new Date(today.getFullYear(), parsed.month, parsed.day);

  if (isPast(nextDate) && !isToday(nextDate)) {
    nextDate = addYears(nextDate, 1);
  }
  return nextDate;
};

export const calculateDaysRemaining = (eventDateStr: string, isRecurring: boolean = true) => {
  if (!eventDateStr) return 0;
  const nextDate = getNextOccurrence(eventDateStr, isRecurring);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDate.setHours(0, 0, 0, 0);

  if (!isRecurring && isPast(nextDate) && !isToday(nextDate)) {
    return -1;
  }
  return differenceInDays(nextDate, today);
};

export const getAgeInfo = (eventDateStr: string, type: string) => {
  if (!eventDateStr || !type.toLowerCase().includes("birthday")) return null;
  const parsed = parseEventDateParts(eventDateStr);
  if (!parsed) return null;
  const birthDate = new Date(parsed.year, parsed.month, parsed.day);
  const today = new Date();

  let currentAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    currentAge--;
  }
  const upcomingAge = currentAge + 1;
  return { currentAge: Math.max(0, currentAge), upcomingAge: Math.max(1, upcomingAge) };
};

/**
 * Intelligent Smart Hero Event Selection Algorithm
 * Priorities:
 * 1. Today's Birthday
 * 2. Today's Anniversary
 * 3. Today's Festival
 * 4. Today's Achievement
 * 5. Today's Meeting
 * 6. Today's Memory
 * 7. Today's Custom Event
 * 8. Upcoming within next 7 days (nearest)
 * 9. Upcoming within this month (nearest)
 * 10. If nothing near, return nearest future event or null if >30 days away to trigger empty hero state
 */
export const selectSmartHeroEvent = (processedEvents: (SpecialDay & { nextDate: Date; daysLeft: number })[]) => {
  if (!processedEvents || processedEvents.length === 0) return { event: null, heroType: "none" };

  const todayEvents = processedEvents.filter((e) => e.daysLeft === 0);

  if (todayEvents.length > 0) {
    const todayBirthday = todayEvents.find((e) => e.type.toLowerCase().includes("birthday"));
    if (todayBirthday) return { event: todayBirthday, heroType: "today_birthday" };

    const todayAnniversary = todayEvents.find((e) => e.type.toLowerCase().includes("anniversary") || e.type.toLowerCase().includes("wedding"));
    if (todayAnniversary) return { event: todayAnniversary, heroType: "today_anniversary" };

    const todayFestival = todayEvents.find((e) => e.type.toLowerCase().includes("festival"));
    if (todayFestival) return { event: todayFestival, heroType: "today_festival" };

    const todayAchievement = todayEvents.find((e) => e.type.toLowerCase().includes("achievement") || e.type.toLowerCase().includes("graduation"));
    if (todayAchievement) return { event: todayAchievement, heroType: "today_achievement" };

    const todayMeeting = todayEvents.find((e) => e.type.toLowerCase().includes("meeting"));
    if (todayMeeting) return { event: todayMeeting, heroType: "today_meeting" };

    const todayMemory = todayEvents.find((e) => e.type.toLowerCase().includes("memory"));
    if (todayMemory) return { event: todayMemory, heroType: "today_memory" };

    return { event: todayEvents[0], heroType: "today_custom" };
  }

  // Check upcoming within 7 days
  const upcoming7Days = processedEvents
    .filter((e) => e.daysLeft > 0 && e.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (upcoming7Days.length > 0) {
    return { event: upcoming7Days[0], heroType: "upcoming_7days" };
  }

  // Check upcoming within 30 days
  const upcomingMonth = processedEvents
    .filter((e) => e.daysLeft > 0 && e.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (upcomingMonth.length > 0) {
    return { event: upcomingMonth[0], heroType: "upcoming_month" };
  }

  // Nearest future event
  const futureEvents = processedEvents
    .filter((e) => e.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  
  if (futureEvents.length > 0) {
    // If the nearest event is >30 days away (e.g. 347 days), return with heroType 'far' to render Empty Hero State!
    if (futureEvents[0].daysLeft > 30) {
      return { event: futureEvents[0], heroType: "far" };
    }
    return { event: futureEvents[0], heroType: "upcoming_future" };
  }

  return { event: null, heroType: "none" };
};

export const REMINDER_TIMING_OPTIONS = [
  { label: "On Event Day", value: "on_day" },
  { label: "1 Day Before", value: "1_day" },
  { label: "3 Days Before", value: "3_days" },
  { label: "1 Week Before", value: "1_week" },
  { label: "2 Weeks Before", value: "2_weeks" },
  { label: "1 Month Before", value: "1_month" },
  { label: "Custom", value: "custom" },
];
