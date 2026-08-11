"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useNotesStore } from "@/store/useNotesStore";
import { FullScreenNoteEditor } from "@/components/notes/FullScreenNoteEditor";
import { SecurePasswordDialog } from "@/components/notes/SecurePasswordDialog";
import { notesService } from "@/services/notes";
import { Note } from "@/types/Note";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

function NoteEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const noteIdParam = searchParams.get("id");
  
  const { notes, fetchNotes } = useNotesStore();
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!noteIdParam);
  
  // Secure lock handling
  const [isSecureDialogOpen, setIsSecureDialogOpen] = useState(false);
  const [unlockedNote, setUnlockedNote] = useState<Note | null>(null);

  useEffect(() => {
    async function loadTargetNote() {
      if (!noteIdParam) {
        setCurrentNote(null);
        setIsLoading(false);
        return;
      }

      const noteId = Number(noteIdParam);
      if (isNaN(noteId)) {
        toast.error("Invalid note ID");
        router.push("/notes");
        return;
      }

      setIsLoading(true);
      try {
        let foundNote = notes.find((n) => n.id === noteId);
        if (!foundNote) {
          foundNote = await notesService.getNote(noteId);
        }

        if (foundNote) {
          if (foundNote.is_secure && isNoteEncrypted(foundNote)) {
            setCurrentNote(foundNote);
            setIsSecureDialogOpen(true);
          } else {
            setCurrentNote(foundNote);
          }
        } else {
          toast.error("Note not found");
          router.push("/notes");
        }
      } catch (err) {
        toast.error("Failed to load note details");
        router.push("/notes");
      } finally {
        setIsLoading(false);
      }
    }

    loadTargetNote();
  }, [noteIdParam, notes, router]);

  const handleVerifySuccess = async () => {
    if (!currentNote) return;
    try {
      const fullDecryptedNote = await notesService.getNote(currentNote.id);
      setUnlockedNote(fullDecryptedNote);
      setCurrentNote(fullDecryptedNote);
      setIsSecureDialogOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to decrypt note");
    }
  };

  const handleVerifyCancel = () => {
    setIsSecureDialogOpen(false);
    router.push("/notes");
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Opening full-screen editor...</p>
      </div>
    );
  }

  const activeNote = unlockedNote || currentNote;

  if (activeNote?.is_secure && isNoteEncrypted(activeNote) && !unlockedNote) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <SecurePasswordDialog
          open={isSecureDialogOpen}
          onOpenChange={setIsSecureDialogOpen}
          onVerifySuccess={handleVerifySuccess}
          onCancel={handleVerifyCancel}
        />
      </div>
    );
  }

  return (
    <FullScreenNoteEditor
      note={activeNote}
      onBack={() => router.push("/notes")}
    />
  );
}

export default function NoteEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Loading note editor...</p>
        </div>
      }
    >
      <NoteEditorContent />
    </Suspense>
  );
}
