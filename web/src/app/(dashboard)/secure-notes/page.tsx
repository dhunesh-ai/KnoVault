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
import { notesService } from "@/services/notes";

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
  const [decryptedNote, setDecryptedNote] = useState<Note | null>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (isUnlocked) {
      fetchSecureNotes(debouncedSearch);
    } else {
      setSelectedNote(null);
      setDecryptedNote(null);
    }
  }, [isUnlocked, debouncedSearch, fetchSecureNotes]);

  // Keep selected note in sync if updated
  useEffect(() => {
    if (selectedNote && notes.length > 0) {
      const updated = notes.find(n => n.id === selectedNote.id);
      if (updated) {
        // Load latest decrypted version on sync
        notesService.getNote(selectedNote.id)
          .then((fullNote) => {
            setDecryptedNote(fullNote);
          })
          .catch(() => {});
      } else {
        setSelectedNote(null);
        setDecryptedNote(null);
      }
    }
  }, [notes, selectedNote?.id]);

  // Load decrypted content when selectedNote changes
  useEffect(() => {
    if (selectedNote) {
      setIsNoteLoading(true);
      notesService.getNote(selectedNote.id)
        .then((fullNote) => {
          setDecryptedNote(fullNote);
        })
        .catch((e: any) => {
          toast.error(e.response?.data?.detail || "Failed to decrypt note");
          setSelectedNote(null);
          setDecryptedNote(null);
        })
        .finally(() => {
          setIsNoteLoading(false);
        });
    } else {
      setDecryptedNote(null);
    }
  }, [selectedNote?.id]);

  if (!isUnlocked) {
    return <PasswordVerification />;
  }

  const handleCreate = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const handleEdit = (note: Note) => {
    const decrypted = (decryptedNote && decryptedNote.id === note.id) ? decryptedNote : note;
    setEditingNote(decrypted);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteSecureNote(deleteId);
        if (selectedNote?.id === deleteId) {
          setSelectedNote(null);
          setDecryptedNote(null);
        }
        toast.success("Secure note deleted");
      } catch (e) {
        // Error handled in store
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 rounded-2xl border border-red-500/20">
            <Shield className="w-5.5 h-5.5 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Secure Vault</h1>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">End-to-end client-side encrypted notes locker.</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <Button 
            variant="outline" 
            onClick={() => {
              lockSession();
              setSelectedNote(null);
              setDecryptedNote(null);
            }} 
            className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 rounded-2xl h-10 px-4 font-semibold text-xs transition-all duration-200"
          >
            <LockOpen className="w-4 h-4 mr-2" />
            Lock Vault
          </Button>
          <Button 
            onClick={handleCreate} 
            className="bg-red-500 hover:bg-red-500/90 text-white shadow-[0_4px_16px_rgba(239,68,68,0.2)] rounded-2xl h-10 px-5 font-semibold text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Secure Note
          </Button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Sidebar List */}
        <div className="w-full lg:w-[380px] flex flex-col shrink-0 border border-border/40 rounded-3xl bg-card/45 backdrop-blur-md overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/40 shrink-0 bg-accent/25">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
              <Input
                placeholder="Search secure vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-card border-border/40 text-foreground w-full h-10 rounded-2xl focus-visible:ring-red-500/30 text-xs placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-hide">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-muted-foreground text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/5 flex items-center justify-center mb-3 text-red-500/30 border border-red-500/10">
                  <Shield className="w-5.5 h-5.5" />
                </div>
                <p className="text-xs font-bold text-foreground">No secure notes found</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px]">Add encrypted notes that require auth password checks to read.</p>
              </div>
            ) : (
              <AnimatePresence>
                {notes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
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

        {/* Viewer Area */}
        <div className="hidden lg:block flex-1 min-w-0 h-full">
          {isNoteLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border border-border rounded-2xl bg-muted backdrop-blur-sm border-dashed">
              <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-2" />
              <p className="text-xs text-muted-foreground font-semibold">Decrypting secure note...</p>
            </div>
          ) : (
            <SecureNoteViewer
              note={decryptedNote}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteId(id)}
            />
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <NoteEditor
        open={editorOpen}
        onOpenChange={(val) => {
          setEditorOpen(val);
          if (!val) setEditingNote(null);
        }}
        note={editingNote || ({ is_secure: true, category: "Secure" } as any)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card/90 backdrop-blur-2xl border-border/50 text-foreground rounded-3xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center font-bold text-lg">
              <Shield className="w-5 h-5 mr-2 text-red-500" /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs font-medium">
              This action cannot be undone. This will permanently delete your secure note and remove it from the encrypted vaults.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="bg-accent/40 border-border/40 text-foreground hover:bg-accent/60 rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs h-9 font-bold shadow-md">
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
