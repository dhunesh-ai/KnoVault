"use client";

import { Note } from "@/types/Note";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Star, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SecureNoteCardProps {
  note: Note;
  isSelected: boolean;
  onClick: (note: Note) => void;
}

export function SecureNoteCard({ note, isSelected, onClick }: SecureNoteCardProps) {
  return (
    <Card 
      onClick={() => onClick(note)}
      className={cn(
        "cursor-pointer transition-all duration-300 relative overflow-hidden group",
        isSelected 
          ? "bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
          : "bg-card backdrop-blur-sm border-border hover:border-border"
      )}
    >
      <div className={cn(
        "absolute left-0 top-0 w-1 h-full transition-all duration-300",
        isSelected ? "bg-red-500" : "bg-transparent group-hover:bg-red-500/50"
      )} />
      
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <h3 className={cn(
            "font-semibold truncate text-base transition-colors",
            isSelected ? "text-red-400" : "text-foreground group-hover:text-red-300"
          )}>
            {note.title}
          </h3>
        </div>
        {note.is_favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />}
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="flex items-center justify-between mt-2">
          <Badge variant="outline" className="bg-red-500/5 text-red-400 border-red-500/20 text-[10px] uppercase font-semibold">
            Secure Vault
          </Badge>
          <div className="flex items-center text-muted-foreground">
            <span className="text-[10px] font-medium mr-2">
              {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </span>
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform duration-300",
              isSelected ? "translate-x-1 text-red-400" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
