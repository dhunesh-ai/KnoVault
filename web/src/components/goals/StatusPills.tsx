"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STATUS_OPTIONS = [
  { value: "Pending", color: "#94A3B8", bgColor: "rgba(148,163,184,0.1)", borderColor: "rgba(148,163,184,0.3)" },
  { value: "In Progress", color: "#3B82F6", bgColor: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)" },
  { value: "Review", color: "#8B5CF6", bgColor: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)" },
  { value: "Completed", color: "#10B981", bgColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)" },
] as const;

interface StatusPillsProps {
  value: string;
  onChange: (status: string) => void;
  className?: string;
}

export function StatusPills({ value, onChange, className }: StatusPillsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {STATUS_OPTIONS.map((option) => {
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

export function getStatusColor(status: string): string {
  const found = STATUS_OPTIONS.find(s => s.value.toLowerCase() === status.toLowerCase());
  return found?.color || "#94A3B8";
}

export function getStatusBgColor(status: string): string {
  const found = STATUS_OPTIONS.find(s => s.value.toLowerCase() === status.toLowerCase());
  return found?.bgColor || "rgba(148,163,184,0.1)";
}
