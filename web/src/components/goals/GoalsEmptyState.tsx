"use client";

import { motion } from "framer-motion";
import { Target, Rocket, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoalsEmptyStateProps {
  type: "daily" | "projects" | "completed";
  onAction?: () => void;
}

export function GoalsEmptyState({ type, onAction }: GoalsEmptyStateProps) {
  const configs = {
    daily: {
      icon: Target,
      emoji: "🌅",
      title: "Plan your day",
      description: "Start building powerful habits. Add your first daily goal and track your progress!",
      actionLabel: "Add First Goal",
      gradient: "from-emerald-500/10 to-teal-500/10",
      iconColor: "text-emerald-500",
    },
    projects: {
      icon: Rocket,
      emoji: "🚀",
      title: "Start your first project",
      description: "Break down big ambitions into milestones and subtasks. Track progress to completion!",
      actionLabel: "Create Project",
      gradient: "from-purple-500/10 to-indigo-500/10",
      iconColor: "text-purple-500",
    },
    completed: {
      icon: PartyPopper,
      emoji: "🎉",
      title: "Nothing completed yet",
      description: "Complete your goals and projects to see them celebrated here!",
      actionLabel: undefined,
      gradient: "from-amber-500/10 to-orange-500/10",
      iconColor: "text-amber-500",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex flex-col items-center justify-center py-16 px-8 rounded-3xl bg-gradient-to-br ${config.gradient}`}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="text-5xl mb-4"
      >
        {config.emoji}
      </motion.div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`w-16 h-16 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40 flex items-center justify-center mb-5 shadow-lg ${config.iconColor}`}
      >
        <Icon className="w-8 h-8" />
      </motion.div>
      <h3 className="text-lg font-bold text-foreground mb-2">{config.title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed font-medium">
        {config.description}
      </p>
      {config.actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-6 bg-primary hover:bg-primary/90 text-white rounded-2xl h-11 px-6 font-bold shadow-[0_4px_16px_rgba(124,77,255,0.25)] cursor-pointer"
        >
          {config.actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
