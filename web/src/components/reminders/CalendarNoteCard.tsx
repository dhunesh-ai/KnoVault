"use client";

import { motion } from "framer-motion";
import { ChevronRight, Pin, FileText } from "lucide-react";
import { CalendarNote } from "@/types/CalendarNote";
import { cn } from "@/lib/utils";

interface CalendarNoteCardProps {
  note: CalendarNote;
  onClick: (note: CalendarNote) => void;
}

export function CalendarNoteCard({ note, onClick }: CalendarNoteCardProps) {
  const cardColor = note.color || "#6D4CFF";

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick(note)}
      className="group relative flex items-center justify-between p-4 rounded-2xl bg-card/90 backdrop-blur-md border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Left Colored Strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
        style={{ backgroundColor: cardColor }}
      />

      <div className="flex-1 min-w-0 pl-2 pr-3 space-y-1">
        <div className="flex items-center gap-2">
          {note.is_pinned && (
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
          )}
          <h4 className="text-sm font-extrabold text-foreground truncate">
            {note.title}
          </h4>
        </div>

        {note.content && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
            {note.content}
          </p>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
            <FileText className="w-3 h-3" />
            Calendar Note
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </motion.div>
  );
}
