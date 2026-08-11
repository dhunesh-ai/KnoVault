"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNotesStore } from "@/store/useNotesStore";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { useDebounce } from "@/hooks/useDebounce";
import { Note } from "@/types/Note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Loader2, StickyNote, ChevronsUpDown } from "lucide-react";
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
import { NOTE_CATEGORIES } from "@/constants/noteCategories";
import { SecurePasswordDialog } from "@/components/notes/SecurePasswordDialog";
import { notesService } from "@/services/notes";

const isNoteEncrypted = (note: Note): boolean => {
  if (!note.is_secure) return false;
  if (note.note_type === "standard" || !note.note_type) {
    return typeof note.content === "string" && note.content.startsWith("gAAAAA");
  }
  if (note.note_type === "checklist") {
    return !note.checklist_items || note.checklist_items.length === 0;
  }
  if (note.note_type === "field") {
    return !note.field_notes || note.field_notes.length === 0;
  }
  return false;
};

export default function NotesPage() {
  const router = useRouter();
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
  const [filterSearch, setFilterSearch] = useState("");
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Secure Password dialog states
  const [isSecureDialogOpen, setIsSecureDialogOpen] = useState(false);
  const [pendingSecureNote, setPendingSecureNote] = useState<Note | null>(null);
  const [secureActionType, setSecureActionType] = useState<"view" | "edit" | null>(null);
  const [unlockedNoteId, setUnlockedNoteId] = useState<number | null>(null);

  useEffect(() => {
    fetchNotes({ search: debouncedSearch });
    fetchCategories();
  }, [debouncedSearch, fetchNotes, fetchCategories]);

  // Reset unlocked session when modals close
  useEffect(() => {
    if (!viewerOpen && !editorOpen) {
      setUnlockedNoteId(null);
    }
  }, [viewerOpen, editorOpen]);

  // Keep viewing note in sync if updated
  useEffect(() => {
    if (viewingNote && notes.length > 0) {
      const updated = notes.find(n => n.id === viewingNote.id);
      if (updated) {
        if (updated.is_secure && isNoteEncrypted(updated)) {
          // Keep decrypted properties from prev, but merge metadata from updated
          setViewingNote(prev => {
            if (!prev) return null;
            return {
              ...updated,
              content: prev.content,
              checklist_items: prev.checklist_items,
              field_notes: prev.field_notes,
            };
          });
        } else {
          setViewingNote(updated);
        }
      }
    }
  }, [notes, viewingNote?.id]);

  // Client side filtering for category to avoid excessive API calls
  const filteredNotes = useMemo(() => {
    if (selectedCategory === "all") return notes;
    if (selectedCategory === "favorites") return notes.filter(n => n.is_favorite);
    return notes.filter((n) => n.category === selectedCategory);
  }, [notes, selectedCategory]);

  const handleCreate = () => {
    router.push("/notes/editor");
  };

  const handleEdit = async (note: Note) => {
    if (note.is_secure && unlockedNoteId !== note.id) {
      setPendingSecureNote(note);
      setSecureActionType("edit");
      setIsSecureDialogOpen(true);
    } else {
      const decrypted = (viewingNote && viewingNote.id === note.id) ? viewingNote : note;
      router.push(`/notes/editor?id=${decrypted.id}`);
    }
  };

  const handleView = async (note: Note) => {
    if (note.is_secure && unlockedNoteId !== note.id) {
      setPendingSecureNote(note);
      setSecureActionType("view");
      setIsSecureDialogOpen(true);
    } else {
      const decrypted = (viewingNote && viewingNote.id === note.id) ? viewingNote : note;
      setViewingNote(decrypted);
      setViewerOpen(true);
    }
  };

  const handleVerifySuccess = async () => {
    if (!pendingSecureNote || !secureActionType) return;
    
    try {
      // Fetch the decrypted full note content
      const fullNote = await notesService.getNote(pendingSecureNote.id);
      setUnlockedNoteId(pendingSecureNote.id);
      if (secureActionType === "view") {
        setViewingNote(fullNote);
        setViewerOpen(true);
      } else if (secureActionType === "edit") {
        router.push(`/notes/editor?id=${fullNote.id}`);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to decrypt note");
    } finally {
      setIsSecureDialogOpen(false);
      setPendingSecureNote(null);
      setSecureActionType(null);
    }
  };

  const handleVerifyCancel = () => {
    setIsSecureDialogOpen(false);
    setPendingSecureNote(null);
    setSecureActionType(null);
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

  const filteredFilterCategories = NOTE_CATEGORIES.filter(c =>
    c.name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategory === "all") return "All Notes";
    if (selectedCategory === "favorites") return "Favorites";
    return selectedCategory;
  }, [selectedCategory]);

  const selectedCategoryIcon = useMemo(() => {
    if (selectedCategory === "all") return "📓";
    if (selectedCategory === "favorites") return "❤️";
    return NOTE_CATEGORIES.find(c => c.name === selectedCategory)?.icon || "📋";
  }, [selectedCategory]);

  return (
    <div className="space-y-5 md:space-y-6 flex flex-col h-[calc(100vh-6.5rem)] pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-3xl font-extrabold text-foreground tracking-tight leading-none sm:leading-tight">Notes</h1>
          <p className="text-base sm:text-xs text-muted-foreground mt-1.5 sm:mt-1 font-medium">Manage and secure your thoughts, ideas, and memories.</p>
        </div>
        <motion.div whileTap={{ scale: 0.97 }} className="w-full sm:w-auto shrink-0">
          <Button 
            onClick={handleCreate} 
            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/95 hover:to-secondary/95 text-white shadow-[0_4px_16px_rgba(124,77,255,0.25)] rounded-[16px] sm:rounded-2xl h-12 sm:h-10 px-5 font-bold sm:font-semibold"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-1.5" />
            Create Note
          </Button>
        </motion.div>
      </div>

      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-card border-border/40 text-foreground w-full h-11 sm:h-10 rounded-[16px] sm:rounded-2xl focus-visible:ring-primary/40 hover:bg-accent/30 transition-all placeholder:text-muted-foreground/75"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[200px] bg-card border border-border/40 text-foreground h-11 sm:h-10 rounded-[16px] sm:rounded-2xl flex items-center justify-between hover:bg-accent/30 font-semibold text-sm sm:text-xs px-4"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{selectedCategoryIcon}</span>
                <span>{selectedCategoryLabel}</span>
              </span>
              <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[240px] p-0 bg-card border border-border rounded-2xl overflow-hidden shadow-xl" align="end">
            <div className="p-2 border-b border-border/60 flex items-center gap-2 bg-accent/20">
              <Search className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              <Input
                placeholder="Search categories..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 text-xs text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="max-h-[260px] overflow-y-auto p-1.5 space-y-0.5">
              <Button
                type="button"
                variant="ghost"
                className={`w-full justify-between font-normal h-11 sm:h-9 rounded-xl px-2.5 hover:bg-accent/40 ${selectedCategory === "all" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
                onClick={() => { setSelectedCategory("all"); setFilterSearch(""); }}
              >
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-base">📓</span>
                  <span>All Notes</span>
                </span>
                <span className="text-[10px] bg-muted/30 px-1.5 py-0.5 rounded font-mono font-semibold">{notes.length}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                className={`w-full justify-between font-normal h-11 sm:h-9 rounded-xl px-2.5 hover:bg-accent/40 ${selectedCategory === "favorites" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
                onClick={() => { setSelectedCategory("favorites"); setFilterSearch(""); }}
              >
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-base">❤️</span>
                  <span>Favorites</span>
                </span>
                <span className="text-[10px] bg-muted/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                  {notes.filter(n => n.is_favorite).length}
                </span>
              </Button>

              <div className="h-[1px] bg-border/60 my-1" />

              {filteredFilterCategories.length > 0 ? (
                filteredFilterCategories.map(cat => {
                  const categoryCount = categories.find(c => c.name === cat.name)?.count || 0;
                  return (
                    <Button
                      key={cat.name}
                      type="button"
                      variant="ghost"
                      className={`w-full justify-between font-normal h-11 sm:h-9 rounded-xl px-2.5 hover:bg-accent/40 ${selectedCategory === cat.name ? "bg-accent text-foreground" : "text-muted-foreground"}`}
                      onClick={() => { setSelectedCategory(cat.name); setFilterSearch(""); }}
                    >
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-base">{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                      <span className="text-[10px] bg-muted/30 px-1.5 py-0.5 rounded font-mono font-semibold">{categoryCount}</span>
                    </Button>
                  );
                })
              ) : (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  No categories found
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Grid content list */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-400 mb-4 font-semibold text-sm">{error}</p>
            <Button variant="outline" className="rounded-xl" onClick={() => fetchNotes({ search: debouncedSearch })}>
              Try Again
            </Button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <StickyNote className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No notes found</h3>
            <p className="text-xs text-muted-foreground max-w-xs">Get started by creating your first secure vault note today.</p>
            <Button variant="link" className="text-primary mt-2 text-xs font-bold" onClick={handleCreate}>
              Create Note
            </Button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5 pb-16"
          >
            <AnimatePresence>
              {filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="h-[200px] sm:h-[210px]"
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
        onOpenChange={(val) => {
          setEditorOpen(val);
          if (!val) setEditingNote(null);
        }}
        note={editingNote}
      />

      <NoteViewer
        open={viewerOpen}
        onOpenChange={(val) => {
          setViewerOpen(val);
          if (!val) setViewingNote(null);
        }}
        note={viewingNote}
        onEdit={handleEdit}
        onDelete={setDeleteId}
      />

      <SecurePasswordDialog
        open={isSecureDialogOpen}
        onOpenChange={setIsSecureDialogOpen}
        onVerifySuccess={handleVerifySuccess}
        onCancel={handleVerifyCancel}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card/90 backdrop-blur-2xl border-border/50 text-foreground rounded-3xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-lg">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs font-medium">
              This action cannot be undone. This will permanently delete your note from the cloud secure vaults.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="bg-accent/40 border-border/40 text-foreground hover:bg-accent/60 rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs h-9 font-bold shadow-md">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
