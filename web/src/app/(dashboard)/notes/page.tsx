"use client";

import { useEffect, useState, useMemo } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { CategoryManager } from "@/components/notes/CategoryManager";
import { useDebounce } from "@/hooks/useDebounce";
import { Note } from "@/types/Note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Loader2, StickyNote, Settings2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

export default function NotesPage() {
  const {
    notes,
    categories,
    isLoading,
    error,
    fetchNotes,
    fetchCategories,
    deleteNote,
    toggleFavorite,
  } = useNotesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchNotes({ search: debouncedSearch });
    fetchCategories();
  }, [debouncedSearch, fetchNotes, fetchCategories]);

  // Keep viewing note in sync if updated
  useEffect(() => {
    if (viewingNote && notes.length > 0) {
      const updated = notes.find(n => n.id === viewingNote.id);
      if (updated) setViewingNote(updated);
    }
  }, [notes, viewingNote?.id]);

  // Client side filtering for category to avoid excessive API calls
  const filteredNotes = useMemo(() => {
    if (selectedCategory === "all") return notes;
    if (selectedCategory === "favorites") return notes.filter(n => n.is_favorite);
    return notes.filter((n) => n.category === selectedCategory);
  }, [notes, selectedCategory]);

  const handleCreate = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setEditorOpen(true);
  };

  const handleView = (note: Note) => {
    setViewingNote(note);
    setViewerOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteNote(deleteId);
        toast.success("Note deleted");
      } catch (e) {
        // toast error handled
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Notes</h1>
          <p className="text-muted-foreground mt-1">Manage your thoughts and ideas.</p>
        </div>
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-foreground shadow-[0_0_15px_rgba(124,77,255,0.4)]">
          <Plus className="w-4 h-4 mr-2" />
          Create Note
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border text-foreground w-full"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border text-foreground">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Notes</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.name} value={cat.name}>
                {cat.name} <span className="text-muted-foreground ml-1">({cat.count})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setManagerOpen(true)} className="border-border text-muted-foreground hover:text-foreground shrink-0">
          <Settings2 className="w-4 h-4 mr-2" />
          Manage Categories
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchNotes({ search: debouncedSearch })}>
              Try Again
            </Button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <StickyNote className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-medium text-foreground mb-2">No notes found</h3>
            <p>Get started by creating your first note.</p>
            <Button variant="link" className="text-primary mt-2" onClick={handleCreate}>
              Create Note
            </Button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-16"
          >
            <AnimatePresence>
              {filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="h-[200px]"
                >
                  <NoteCard
                    note={note}
                    onEdit={handleEdit}
                    onDelete={setDeleteId}
                    onToggleFavorite={toggleFavorite}
                    onClick={() => handleView(note)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editingNote}
      />

      <NoteViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        note={viewingNote}
        onEdit={handleEdit}
        onDelete={setDeleteId}
      />

      <CategoryManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete your note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted hover:text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
