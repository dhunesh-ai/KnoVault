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
import { motion } from "framer-motion";

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
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-card/50 backdrop-blur-md border border-border/40 hover:border-primary/25 transition-all duration-300 group relative flex flex-col h-full overflow-hidden ${
        onClick ? 'cursor-pointer hover:shadow-[0_12px_32px_rgba(124,77,255,0.05)]' : ''
      } rounded-[20px] sm:rounded-xl`}
    >
      {note.color && (
        <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: note.color }} />
      )}

      {/* MOBILE LAYOUT (hidden on desktop, flex on mobile) */}
      <div className="flex sm:hidden flex-col h-full p-4 justify-between select-none">
        {/* Header */}
        <div className="flex items-center justify-between">
          {note.category ? (
            <span className="bg-primary/10 text-primary border border-primary/5 text-[10px] font-bold rounded-lg px-2 py-0.5 max-w-[85px] truncate">
              {note.category}
            </span>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-0.5">
            {note.is_secure && (
              <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center mr-1">
                <Shield className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-yellow-500 rounded-xl"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(note.id, note.is_favorite);
              }}
            >
              <Star className={`w-3.5 h-3.5 ${note.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/90 backdrop-blur-xl border-border/50 rounded-2xl p-1.5 shadow-lg">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(note); }} className="cursor-pointer rounded-xl text-xs py-2">
                  <Edit2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  Edit note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="cursor-pointer rounded-xl text-xs py-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-extrabold text-foreground text-[20px] leading-tight tracking-tight mt-2.5 mb-1 line-clamp-2">
          {note.title}
        </h3>

        {/* Body preview */}
        <p className="text-[15px] text-muted-foreground/90 font-medium leading-normal mb-3 line-clamp-3 break-words flex-1">
          {getPreview()}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20">
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground font-semibold">
            <span className="opacity-60 text-xs">🕒</span>
            <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
          </div>
          {note.is_secure && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5">
              SECURE
            </Badge>
          )}
        </div>
      </div>

      {/* DESKTOP LAYOUT (hidden on mobile, flex on desktop) */}
      <div className="hidden sm:flex flex-col h-full">
        <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2.5 overflow-hidden flex-1">
            {getIcon()}
            <h3 className="font-bold text-foreground truncate text-sm tracking-tight flex-1">{note.title}</h3>
          </div>
          <div className="flex items-center space-x-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-yellow-500 rounded-xl hover:bg-yellow-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(note.id, note.is_favorite);
              }}
            >
              <Star className={`w-4 h-4 ${note.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/90 backdrop-blur-xl border-border/50 rounded-2xl p-1.5 shadow-lg">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(note); }} className="cursor-pointer rounded-xl text-xs py-2">
                  <Edit2 className="w-4.5 h-4.5 mr-2 text-muted-foreground" />
                  Edit note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="cursor-pointer rounded-xl text-xs py-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                  <Trash2 className="w-4.5 h-4.5 mr-2" />
                  Delete note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-1.5 flex-1 flex flex-col justify-between">
          <p className="text-xs text-muted-foreground/90 font-medium mb-4 flex-1 whitespace-pre-wrap break-words leading-relaxed">
            {getPreview()}
          </p>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/20">
            {note.category ? (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[9px] uppercase font-bold tracking-wider rounded-lg px-2 py-0.5">
                {note.category}
              </Badge>
            ) : (
              <div />
            )}
            <span className="text-[9px] text-muted-foreground font-semibold">
              {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </div>
    </motion.div>
  );
}
