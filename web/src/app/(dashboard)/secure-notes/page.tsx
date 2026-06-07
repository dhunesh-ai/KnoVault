/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useSecureNotesStore } from "@/store/useSecureNotesStore";
import { PasswordVerification } from "@/components/secure-notes/PasswordVerification";
import { SecureNoteCard } from "@/components/secure-notes/SecureNoteCard";
import { SecureNoteViewer } from "@/components/secure-notes/SecureNoteViewer";
import { NoteEditor } from "@/components/notes/NoteEditor"; // Reusing the editor
import { useDebounce } from "@/hooks/useDebounce";
import { Note } from "@/types/Note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Shield, LockOpen } from "lucide-react";
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

export default function SecureNotesPage() {
  const {
    notes,
    isLoading,
    isUnlocked,
    fetchSecureNotes,
    lockSession,
    deleteSecureNote,
  } = useSecureNotesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (isUnlocked) {
      fetchSecureNotes(debouncedSearch);
    }
  }, [isUnlocked, debouncedSearch, fetchSecureNotes]);

  // Keep selected note in sync if updated
  useEffect(() => {
    if (selectedNote && notes.length > 0) {
      const updated = notes.find(n => n.id === selectedNote.id);
      if (updated) setSelectedNote(updated);
    }
  }, [notes, selectedNote]);

  if (!isUnlocked) {
    return <PasswordVerification />;
  }

  const handleCreate = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteSecureNote(deleteId);
        if (selectedNote?.id === deleteId) setSelectedNote(null);
        toast.success("Secure note deleted");
      } catch (e) {
        // Error handled in store
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Secure Vault</h1>
            <p className="text-muted-foreground mt-1">End-to-end encrypted notes.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={lockSession} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
            <LockOpen className="w-4 h-4 mr-2" />
            Lock Vault
          </Button>
          <Button onClick={handleCreate} className="bg-red-500 hover:bg-red-600 text-foreground shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            <Plus className="w-4 h-4 mr-2" />
            New Secure Note
          </Button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Sidebar List */}
        <div className="w-full lg:w-[400px] flex flex-col shrink-0 border border-border rounded-2xl bg-card/20 overflow-hidden">
          <div className="p-4 border-b border-border shrink-0 bg-background/50 backdrop-blur-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search secure vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border text-foreground w-full focus-visible:ring-red-500/50"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center px-4">
                <Shield className="w-10 h-10 mb-3 opacity-20" />
                <p>No secure notes found.</p>
              </div>
            ) : (
              <AnimatePresence>
                {notes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <SecureNoteCard
                      note={note}
                      isSelected={selectedNote?.id === note.id}
                      onClick={setSelectedNote}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Viewer Area (Hidden on mobile if a note isn't selected, but here we just hide it on very small screens or let it stack) */}
        <div className="hidden lg:block flex-1 min-w-0 h-full">
          <SecureNoteViewer
            note={selectedNote}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteId(id)}
          />
        </div>
      </div>

      {/* Editor Modal (reusing standard editor but it will lock is_secure=true) */}
      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editingNote || { is_secure: true, category: "Secure" } as any} // Force secure for new notes here
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-background border-red-500/20 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center">
              <Shield className="w-5 h-5 mr-2" /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete your secure note and remove it from the encrypted vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-foreground">
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
