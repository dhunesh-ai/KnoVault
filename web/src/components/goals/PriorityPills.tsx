"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const PRIORITY_OPTIONS = [
  { value: "Low", color: "#10B981", bgColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)" },
  { value: "Medium", color: "#F59E0B", bgColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" },
  { value: "High", color: "#EF4444", bgColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" },
  { value: "Critical", color: "#8B5CF6", bgColor: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)" },
] as const;

interface PriorityPillsProps {
  value: string;
  onChange: (priority: string) => void;
  className?: string;
}

export function PriorityPills({ value, onChange, className }: PriorityPillsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {PRIORITY_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <motion.button
            key={option.value}
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-[11px] font-bold border-[1.5px] transition-all duration-200 cursor-pointer",
              isActive
                ? "shadow-sm"
                : "border-border/40 text-muted-foreground hover:border-border"
            )}
            style={
              isActive
                ? {
                    backgroundColor: option.bgColor,
                    borderColor: option.borderColor,
                    color: option.color,
                  }
                : undefined
            }
          >
            {option.value}
          </motion.button>
        );
      })}
    </div>
  );
}

export function getPriorityColor(priority: string): string {
  const found = PRIORITY_OPTIONS.find(p => p.value.toLowerCase() === priority.toLowerCase());
  return found?.color || "#F59E0B";
}

export function getPriorityBgColor(priority: string): string {
  const found = PRIORITY_OPTIONS.find(p => p.value.toLowerCase() === priority.toLowerCase());
  return found?.bgColor || "rgba(245,158,11,0.1)";
}
