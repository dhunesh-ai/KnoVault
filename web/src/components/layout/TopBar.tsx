"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, Search, Sun, Moon, Check, StickyNote, Bell as BellIcon, Target, Gift, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotesStore } from "@/store/useNotesStore";
import { useRemindersStore } from "@/store/useRemindersStore";
import { useGoalsStore } from "@/store/useGoalsStore";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Stores
  const { notes, fetchNotes } = useNotesStore();
  const { reminders, fetchReminders } = useRemindersStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { specialDays, fetchSpecialDays } = useSpecialDaysStore();

  useEffect(() => {
    setMounted(true);
    fetchNotes();
    fetchReminders();
    fetchGoals();
    fetchSpecialDays();
  }, [fetchNotes, fetchReminders, fetchGoals, fetchSpecialDays]);

  // Real Notifications State (Uncompleted Reminders + Upcoming Special Days)
  const [readIds, setReadIds] = useState<string[]>([]);
  const [clearedIds, setClearedIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRead = localStorage.getItem("knovault-read-notifications");
      const savedCleared = localStorage.getItem("knovault-cleared-notifications");
      if (savedRead) setReadIds(JSON.parse(savedRead));
      if (savedCleared) setClearedIds(JSON.parse(savedCleared));
    }
  }, []);

  const notifications = useMemo(() => {
    const now = new Date();
    const activeReminders = reminders.filter(r => !r.is_completed && new Date(r.reminder_date || '') <= now);
    // Let's say upcoming special days in the next 7 days
    const upcomingDays = specialDays.filter(sd => {
      const d = new Date(sd.date || '');
      const diff = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diff >= 0 && diff <= 7;
    });

    const combined = [
      ...activeReminders.map(r => ({ id: `rem-${r.id}`, title: r.title, time: new Date(r.reminder_date || '').toLocaleDateString(), isRead: readIds.includes(`rem-${r.id}`) })),
      ...upcomingDays.map(sd => ({ id: `sd-${sd.id}`, title: sd.title, time: new Date(sd.date || '').toLocaleDateString(), isRead: readIds.includes(`sd-${sd.id}`) }))
    ];

    return combined.filter(n => !clearedIds.includes(n.id));
  }, [reminders, specialDays, readIds, clearedIds]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    const newReadIds = Array.from(new Set([...readIds, ...notifications.map(n => n.id)]));
    setReadIds(newReadIds);
    localStorage.setItem("knovault-read-notifications", JSON.stringify(newReadIds));
  };

  const clearAllNotifications = () => {
    const newClearedIds = Array.from(new Set([...clearedIds, ...notifications.map(n => n.id)]));
    setClearedIds(newClearedIds);
    localStorage.setItem("knovault-cleared-notifications", JSON.stringify(newClearedIds));
  };

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    const query = searchQuery.toLowerCase();
    
    const matchedNotes = notes.filter(n => n.title?.toLowerCase().includes(query) || n.content?.toLowerCase().includes(query)).map(n => ({ id: `note-${n.id}`, title: n.title, icon: StickyNote, route: '/notes' }));
    const matchedReminders = reminders.filter(r => r.title?.toLowerCase().includes(query)).map(r => ({ id: `rem-${r.id}`, title: r.title, icon: BellIcon, route: '/reminders' }));
    const matchedGoals = goals.filter(g => g.title?.toLowerCase().includes(query)).map(g => ({ id: `goal-${g.id}`, title: g.title, icon: Target, route: '/goals' }));
    const matchedDays = specialDays.filter(s => s.title?.toLowerCase().includes(query)).map(s => ({ id: `sd-${s.id}`, title: s.title, icon: Gift, route: '/special-days' }));

    return [...matchedNotes, ...matchedReminders, ...matchedGoals, ...matchedDays].slice(0, 6);
  }, [searchQuery, notes, reminders, goals, specialDays]);

  const handleSearchNav = (route: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(route);
  };

  return (
    <header className="h-14 sm:h-16 rounded-2xl sm:rounded-3xl border border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all">
      <div className="flex-1 max-w-xl hidden md:flex items-center relative">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/80" />
              <Input
                placeholder="Search notes, reminders, or goals (Cmd+K)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(e.target.value.length > 0);
                }}
                onFocus={() => {
                  if (searchQuery.length > 0) setSearchOpen(true);
                }}
                className="w-full bg-accent/30 border-border/40 pl-11 text-sm h-10 rounded-2xl focus-visible:ring-primary/40 text-foreground placeholder:text-muted-foreground/75 transition-all duration-300 hover:bg-accent/50"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1.5 rounded-2xl border-border/50 bg-card/90 backdrop-blur-xl shadow-xl mt-1" align="start">
            <div className="flex flex-col p-1 gap-1 max-h-[300px] overflow-y-auto">
              {searchQuery.length > 1 ? (
                searchResults.length > 0 ? (
                  <>
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-primary/70 uppercase tracking-widest">
                      Search Results for "{searchQuery}"
                    </div>
                    {searchResults.map((res) => (
                      <Button key={res.id} variant="ghost" className="justify-start font-medium text-xs h-auto py-2.5 px-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200" onClick={() => handleSearchNav(res.route)}>
                        <res.icon className="w-4 h-4 mr-2.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{res.title}</span>
                      </Button>
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-6 text-xs text-center text-muted-foreground">
                    No results found for "{searchQuery}"
                  </div>
                )
              ) : (
                <div className="px-3 py-6 text-xs text-center text-muted-foreground">
                  Type at least 2 characters to search...
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Mobile Title */}
      <div className="md:hidden flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          KnoVault
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="text-muted-foreground hover:text-foreground relative rounded-xl h-10 w-10 hover:bg-accent/40 transition-colors"
        >
          {mounted && resolvedTheme === 'dark' ? (
            <Sun className="h-4.5 w-4.5 transition-all text-amber-500" />
          ) : (
            <Moon className="h-4.5 w-4.5 transition-all text-indigo-500" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative rounded-xl h-10 w-10 hover:bg-accent/40 transition-colors">
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background flex items-center justify-center" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-2xl border-border/50 bg-card/90 backdrop-blur-xl shadow-xl p-2 mt-1">
            <div className="flex items-center justify-between px-2 py-2">
              <DropdownMenuLabel className="p-0 text-sm font-bold text-foreground">Notifications</DropdownMenuLabel>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto py-1.5 px-2.5 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-xl" onClick={markAllAsRead}>
                    <Check className="w-3 h-3 mr-1" /> Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto py-1.5 px-2.5 text-[10px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={clearAllNotifications}>
                     Clear all
                  </Button>
                )}
              </div>
            </div>
            <DropdownMenuSeparator className="bg-border/40" />
            <div className="max-h-[300px] overflow-y-auto py-1 space-y-1">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 rounded-xl cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between w-full gap-2">
                      <span className={`text-xs ${notification.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>
                        {notification.title}
                      </span>
                      {!notification.isRead && <span className="w-1.5 h-1.5 mt-1 rounded-full bg-primary shrink-0" />}
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground">{notification.time}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
                  <Bell className="w-7 h-7 mb-2 text-muted-foreground/30" />
                  <p className="font-medium">You have no notifications</p>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
