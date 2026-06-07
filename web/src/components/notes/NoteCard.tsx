"use client";

import { Note } from "@/types/Note";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, CheckSquare, AlignLeft, List, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number, is_favorite: boolean) => void;
  onClick?: () => void;
}

export function NoteCard({ note, onEdit, onDelete, onToggleFavorite, onClick }: NoteCardProps) {
  const getIcon = () => {
    if (note.is_secure) return <Shield className="w-4 h-4 text-primary" />;
    switch (note.note_type) {
      case "checklist":
        return <CheckSquare className="w-4 h-4 text-blue-400" />;
      case "field":
        return <List className="w-4 h-4 text-emerald-400" />;
      default:
        return <AlignLeft className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPreview = () => {
    if (note.is_secure) return "••••••••••••••••";
    if (note.note_type === "checklist" && note.checklist_items) {
      return `${note.checklist_items.filter(i => i.completed).length}/${note.checklist_items.length} completed`;
    }
    if (note.note_type === "field" && note.field_notes) {
      return `${note.field_notes.length} field${note.field_notes.length === 1 ? '' : 's'}`;
    }
    return note.content?.substring(0, 100) + (note.content?.length > 100 ? "..." : "") || "No content";
  };

  return (
    <Card 
      onClick={onClick}
      className={`bg-card backdrop-blur-sm border-border hover:border-border transition-all duration-300 group relative flex flex-col h-full overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`}
    >
      {note.color && (
        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: note.color }} />
      )}
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center space-x-2 overflow-hidden">
          {getIcon()}
          <h3 className="font-semibold text-foreground truncate text-base">{note.title}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-yellow-400"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(note.id, note.is_favorite);
            }}
          >
            <Star className={`w-4 h-4 ${note.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onEdit(note)} className="cursor-pointer">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(note.id)} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground mb-4 flex-1 whitespace-pre-wrap break-words">
          {getPreview()}
        </p>
        <div className="flex items-center justify-between mt-auto">
          {note.category && (
            <Badge variant="outline" className="bg-accent text-foreground border-border text-[10px] uppercase font-semibold">
              {note.category}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto font-medium">
            {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
