"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuickAddGoalProps {
  onAdd: (title: string) => void;
  isAdding?: boolean;
}

export function QuickAddGoal({ onAdd, isAdding }: QuickAddGoalProps) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (title.trim() && !isAdding) {
      onAdd(title.trim());
      setTitle("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex items-center gap-0 bg-card/80 backdrop-blur-md border border-border/40 rounded-[20px] pl-5 pr-1.5 h-14 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a new daily goal..."
        disabled={isAdding}
        className="flex-1 bg-transparent text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleAdd}
        disabled={!title.trim() || isAdding}
        className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer",
          title.trim()
            ? "bg-primary text-white shadow-[0_2px_12px_rgba(124,77,255,0.3)]"
            : "bg-border/60 text-muted-foreground"
        )}
      >
        <Plus className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}
