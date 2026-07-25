"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AvatarOption {
  id: string;
  emoji: string;
  name: string;
  category: string;
}

export const AVATAR_LIST: AvatarOption[] = [
  { id: "brain", emoji: "🧠", name: "Brain", category: "Mind" },
  { id: "lightning", emoji: "⚡", name: "Lightning", category: "Energy" },
  { id: "rocket", emoji: "🚀", name: "Rocket", category: "Space" },
  { id: "bulb", emoji: "💡", name: "Light Bulb", category: "Idea" },
  { id: "calendar", emoji: "📅", name: "Calendar", category: "Time" },
  { id: "target", emoji: "🎯", name: "Target", category: "Goal" },
  { id: "crystal", emoji: "🔮", name: "Crystal Ball", category: "Magic" },
  { id: "shield", emoji: "🛡", name: "Shield", category: "Security" },
  { id: "briefcase", emoji: "💼", name: "Briefcase", category: "Work" },
  { id: "palette", emoji: "🎨", name: "Palette", category: "Art" },
  { id: "crown", emoji: "👑", name: "Crown", category: "Royalty" },
  { id: "rainbow", emoji: "🌈", name: "Rainbow", category: "Nature" },
  { id: "robot", emoji: "🤖", name: "Robot", category: "Tech" },
  { id: "fire", emoji: "🔥", name: "Fire", category: "Energy" },
  { id: "star", emoji: "🌟", name: "Star", category: "Space" },
  { id: "diamond", emoji: "💎", name: "Diamond", category: "Wealth" },
  { id: "unicorn", emoji: "🦄", name: "Unicorn", category: "Magic" },
  { id: "trophy", emoji: "🏆", name: "Trophy", category: "Achievement" },
  { id: "owl", emoji: "🦉", name: "Owl", category: "Animal" },
  { id: "lion", emoji: "🦁", name: "Lion", category: "Animal" },
  { id: "panda", emoji: "🐼", name: "Panda", category: "Animal" },
  { id: "cat", emoji: "🐱", name: "Cat", category: "Animal" },
  { id: "dog", emoji: "🐶", name: "Dog", category: "Animal" },
  { id: "fox", emoji: "🦊", name: "Fox", category: "Animal" },
];

interface AvatarPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar: string;
  userName: string;
  userEmail: string;
  onSaveAvatar: (newAvatar: string) => void;
}

export function AvatarPickerModal({
  open,
  onOpenChange,
  currentAvatar,
  userName,
  userEmail,
  onSaveAvatar,
}: AvatarPickerModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || "🧠");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedAvatar(currentAvatar || "🧠");
      setSearchQuery("");
    }
  }, [open, currentAvatar]);

  const filteredAvatars = useMemo(() => {
    if (!searchQuery.trim()) return AVATAR_LIST;
    const q = searchQuery.toLowerCase().trim();
    return AVATAR_LIST.filter(
      (a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.emoji.includes(q)
    );
  }, [searchQuery]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  };

  const handleSave = () => {
    onSaveAvatar(selectedAvatar);
    onOpenChange(false);
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedAvatar]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-2xl border-purple-500/20 text-foreground max-w-[580px] w-full rounded-[28px] shadow-2xl p-6 sm:p-7 space-y-6 overflow-hidden">
        
        {/* Header */}
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2 tracking-tight">
            <Sparkles className="w-5 h-5 text-purple-500" /> Choose Profile Avatar
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            Select an avatar that represents your style and personality.
          </DialogDescription>
        </DialogHeader>

        {/* Live Preview Card */}
        <div className="p-4 rounded-[22px] bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent border border-purple-500/20 flex items-center gap-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-card border-2 border-purple-500 flex items-center justify-center text-3xl shadow-md shrink-0">
            {selectedAvatar}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">
              {getGreeting()}
            </span>
            <h4 className="text-base font-black text-foreground truncate">{userName} {selectedAvatar}</h4>
            <p className="text-xs font-semibold text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search avatar..."
            className="pl-10 h-11 bg-muted/40 border-border/50 rounded-2xl text-xs font-semibold focus-visible:ring-purple-500/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Avatar Grid (80x80px Cards) */}
        <div className="max-h-[300px] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3.5">
            {filteredAvatars.map((avatar) => {
              const isSelected = selectedAvatar === avatar.emoji;

              return (
                <motion.button
                  key={avatar.id}
                  whileHover={{ y: -4, scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedAvatar(avatar.emoji)}
                  className={cn(
                    "w-20 h-20 rounded-[20px] bg-card border flex flex-col items-center justify-center cursor-pointer transition-all relative group shadow-2xs",
                    isSelected
                      ? "border-2 border-purple-600 bg-purple-600/15 shadow-md shadow-purple-500/20 ring-2 ring-purple-500/30"
                      : "border-border/60 hover:border-purple-400/60 hover:bg-purple-500/5 hover:shadow-md"
                  )}
                >
                  <span className="text-[40px] leading-none select-none transition-transform group-hover:scale-110">
                    {avatar.emoji}
                  </span>
                  
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {filteredAvatars.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs font-semibold space-y-1">
              <p>No avatars match "{searchQuery}"</p>
              <p className="text-[11px]">Try searching for brain, rocket, or cat</p>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <DialogFooter className="flex sm:justify-end items-center gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedAvatar === currentAvatar}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-black text-xs shadow-md shadow-purple-500/25 disabled:opacity-50"
          >
            Save Avatar
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
