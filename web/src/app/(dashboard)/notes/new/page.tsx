"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NewNotePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/notes/editor");
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-sm font-semibold text-muted-foreground">Opening new note workspace...</p>
    </div>
  );
}
