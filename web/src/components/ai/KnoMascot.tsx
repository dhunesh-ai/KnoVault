/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { MascotState } from "@/store/useAIStore";
import { motion } from "framer-motion";
import { Sparkles, Bot, BrainCircuit, CheckCircle2, CalendarHeart, Pill, PartyPopper } from "lucide-react";

interface KnoMascotProps {
  state: MascotState;
  className?: string;
}

export function KnoMascot({ state, className }: KnoMascotProps) {
  const getMascotConfig = () => {
    switch (state) {
      case "thinking":
        return {
          icon: BrainCircuit,
          color: "text-purple-400",
          bg: "bg-purple-500/10 border-purple-500/20",
          animate: {
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          },
          transition: { repeat: Infinity, duration: 1.5 }
        };
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10 border-emerald-500/20",
          animate: { scale: [0.8, 1.1, 1] },
          transition: { duration: 0.4 }
        };
      case "reminder":
        return {
          icon: CalendarHeart,
          color: "text-blue-400",
          bg: "bg-blue-500/10 border-blue-500/20",
          animate: { y: [0, -5, 0] },
          transition: { repeat: Infinity, duration: 2 }
        };
      case "medicine":
        return {
          icon: Pill,
          color: "text-rose-400",
          bg: "bg-rose-500/10 border-rose-500/20",
          animate: { rotate: [0, 10, -10, 0] },
          transition: { repeat: Infinity, duration: 2 }
        };
      case "birthday":
        return {
          icon: PartyPopper,
          color: "text-pink-400",
          bg: "bg-pink-500/10 border-pink-500/20",
          animate: { scale: [1, 1.1, 1] },
          transition: { repeat: Infinity, duration: 1 }
        };
      case "idle":
      default:
        return {
          icon: Bot,
          color: "text-foreground/80",
          bg: "bg-muted border-border",
          animate: { y: [0, -3, 0] },
          transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
        };
    }
  };

  const config = getMascotConfig();
  const Icon = config.icon;

  return (
    <motion.div
      className={`relative flex items-center justify-center w-12 h-12 rounded-2xl border ${config.bg} backdrop-blur-md shadow-lg ${className}`}
      animate={config.animate}
      transition={config.transition as any}
    >
      <Icon className={`w-6 h-6 ${config.color}`} />
      
      {state === "thinking" && (
        <motion.div 
          className="absolute -top-1 -right-1 text-purple-400"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <Sparkles className="w-4 h-4" />
        </motion.div>
      )}
    </motion.div>
  );
}
