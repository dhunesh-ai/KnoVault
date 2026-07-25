"use client";

import { useState, useRef } from "react";
import { Milestone } from "@/types/Goal";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Check, Trash2, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubtaskListProps {
  subtasks: Milestone[];
  onChange: (subtasks: Milestone[]) => void;
  readonly?: boolean;
}

export function SubtaskList({ subtasks, onChange, readonly }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = (index: number) => {
    const updated = subtasks.map((st, i) =>
      i === index ? { ...st, completed: !st.completed } : st
    );
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    onChange(subtasks.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (newTitle.trim()) {
      const newSubtask: Milestone = {
        id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: newTitle.trim(),
        completed: false,
      };
      onChange([...subtasks, newSubtask]);
      setNewTitle("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleReorder = (newOrder: Milestone[]) => {
    onChange(newOrder);
  };

  const handleTitleEdit = (index: number, title: string) => {
    const updated = subtasks.map((st, i) =>
      i === index ? { ...st, title } : st
    );
    onChange(updated);
  };

  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Subtasks
        </span>
        {subtasks.length > 0 && (
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            {completedCount}/{subtasks.length}
          </span>
        )}
      </div>

      {/* Subtask Items */}
      <Reorder.Group
        axis="y"
        values={subtasks}
        onReorder={handleReorder}
        className="space-y-2"
      >
        <AnimatePresence>
          {subtasks.map((subtask, index) => (
            <Reorder.Item
              key={subtask.id || index}
              value={subtask}
              className="list-none"
            >
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className={cn(
                  "group/subtask flex items-center gap-2 p-2.5 rounded-xl border transition-all",
                  subtask.completed
                    ? "bg-primary/5 border-primary/10"
                    : "bg-muted/30 border-border/30 hover:border-primary/20"
                )}
              >
                {/* Drag Handle */}
                {!readonly && (
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Checkbox */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleToggle(index)}
                  disabled={readonly}
                  className={cn(
                    "w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-200",
                    subtask.completed
                      ? "bg-primary border-primary text-white"
                      : "border-muted-foreground/30 text-transparent hover:border-primary",
                    readonly ? "" : "cursor-pointer"
                  )}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: subtask.completed ? 1 : 0,
                      opacity: subtask.completed ? 1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </motion.div>
                </motion.button>

                {/* Title */}
                {readonly ? (
                  <span
                    className={cn(
                      "flex-1 text-xs font-semibold transition-colors",
                      subtask.completed
                        ? "text-muted-foreground/50 line-through"
                        : "text-foreground"
                    )}
                  >
                    {subtask.title}
                  </span>
                ) : (
                  <input
                    type="text"
                    value={subtask.title}
                    onChange={(e) => handleTitleEdit(index, e.target.value)}
                    className={cn(
                      "flex-1 bg-transparent text-xs font-semibold focus:outline-none",
                      subtask.completed
                        ? "text-muted-foreground/50 line-through"
                        : "text-foreground"
                    )}
                  />
                )}

                {/* Delete */}
                {!readonly && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(index)}
                    className="opacity-0 group-hover/subtask:opacity-100 transition-opacity p-1 text-muted-foreground/40 hover:text-red-500 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </motion.div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Add New Subtask */}
      {!readonly && (
        <div className="flex items-center gap-2 border border-border/30 rounded-xl pl-3 pr-1 h-10">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add subtask..."
            className="flex-1 bg-transparent text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer",
              newTitle.trim()
                ? "bg-primary text-white"
                : "bg-border/40 text-muted-foreground/40"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
