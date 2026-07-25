"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Goal } from "@/types/Goal";

interface DailyGoalItemProps {
  goal: Goal;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, title: string) => void;
}

export function DailyGoalItem({ goal, onToggle, onDelete, onEdit }: DailyGoalItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(goal.title);

  const handleToggle = () => {
    onToggle(goal.id, !goal.completed);
  };

  const handleSave = () => {
    if (editedTitle.trim() && editedTitle.trim() !== goal.title) {
      onEdit(goal.id, editedTitle.trim());
    } else {
      setEditedTitle(goal.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditedTitle(goal.title);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group flex items-center justify-between gap-4 h-[76px] px-6 rounded-[24px] border transition-all duration-200 shadow-sm hover:shadow-md",
        goal.completed
          ? "bg-muted/20 border-border/20"
          : "bg-card/90 backdrop-blur-md border-border/40 hover:border-primary/20"
      )}
    >
      {/* Left: Circular Checkbox */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={handleToggle}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 cursor-pointer",
          goal.completed
            ? "bg-primary border-primary text-white"
            : "border-primary/50 hover:border-primary text-transparent"
        )}
        aria-label={goal.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        <motion.div
          initial={false}
          animate={{
            scale: goal.completed ? 1 : 0,
            opacity: goal.completed ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </motion.div>
      </motion.button>

      {/* Center: Goal Title Only */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full bg-transparent text-[18px] font-semibold text-foreground focus:outline-none"
          />
        ) : (
          <div
            className="relative cursor-text select-none"
            onDoubleClick={() => setIsEditing(true)}
          >
            <span
              className={cn(
                "text-[18px] font-semibold transition-all duration-300 truncate block",
                goal.completed
                  ? "text-muted-foreground/50 line-through"
                  : "text-foreground"
              )}
            >
              {goal.title}
            </span>
          </div>
        )}
      </div>

      {/* Right: Delete Icon */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onDelete(goal.id)}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
        aria-label="Delete goal"
      >
        <Trash2 className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}
