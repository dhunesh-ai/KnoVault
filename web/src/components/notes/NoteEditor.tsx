"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Note } from "@/types/Note";

interface NoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null;
}

export function NoteEditor({ open, onOpenChange, note }: NoteEditorProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      onOpenChange(false);
      if (note && note.id) {
        router.push(`/notes/editor?id=${note.id}`);
      } else {
        router.push("/notes/editor");
      }
    }
  }, [open, note, onOpenChange, router]);

  return null;
}
