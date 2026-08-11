/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Note } from "@/types/Note";
import { useNotesStore } from "@/store/useNotesStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  Search,
  Lock,
  LockOpen,
  Heart,
  Download,
  Share2,
  FileText,
  CheckSquare,
  List,
  Table,
  Clock,
  Sparkles,
  Save,
  Square,
  Maximize2,
  Minimize2,
  Network,
  Calendar,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { VoiceDictationButton } from "@/components/notes/VoiceDictationButton";
import { NOTE_CATEGORIES } from "@/constants/noteCategories";
import { SecurePasswordDialog } from "@/components/notes/SecurePasswordDialog";
import { AIKnowledgePanel } from "@/components/notes/AIKnowledgePanel";
import { KnowledgeGraphPreview } from "@/components/notes/KnowledgeGraphPreview";
import { formatDistanceToNow, format } from "date-fns";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  content: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  note_type: z.enum(["standard", "checklist", "field"]),
  is_secure: z.boolean().default(false),
  color: z.string().optional().nullable(),
  is_pinned: z.boolean().default(false),
  is_favorite: z.boolean().default(false),
  checklist_items: z.array(z.object({
    id: z.number().optional(),
    text: z.string().min(1),
    completed: z.boolean().default(false),
    order: z.number().default(0),
  })).optional().nullable(),
  field_notes: z.array(z.object({
    id: z.number().optional(),
    label: z.string().min(1),
    value: z.string().min(1)
  })).optional().nullable(),
});

type NoteFormValues = z.infer<typeof noteSchema>;

interface FullScreenNoteEditorProps {
  note?: Note | null;
  onSaved?: (savedNote: Note) => void;
  onBack?: () => void;
}

export function FullScreenNoteEditor({ note, onSaved, onBack }: FullScreenNoteEditorProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { createNote, updateNote } = useNotesStore();
  
  const [activeNoteId, setActiveNoteId] = useState<number | null>(note?.id || null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(note?.updated_at ? new Date(note.updated_at) : null);
  const [createdAt] = useState<Date>(note?.created_at ? new Date(note.created_at) : new Date());

  // UI Panel Toggle States
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"ai" | "graph">("ai");

  const [categoryInput, setCategoryInput] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Secure dialog trigger states
  const [isSecureDialogOpen, setIsSecureDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: "category" | "switch"; value: any } | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const defaultValues: NoteFormValues = {
    title: note?.title || "",
    content: note?.content || "",
    category: note?.category || "General",
    note_type: ((note?.note_type as string) === "general" ? "standard" : note?.note_type) as any || "standard",
    is_secure: note?.is_secure || false,
    color: note?.color || null,
    is_pinned: note?.is_pinned || false,
    is_favorite: note?.is_favorite || false,
    checklist_items: note?.checklist_items || [],
    field_notes: note?.field_notes || [],
  };

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema) as any,
    defaultValues,
  });

  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist } = useFieldArray({
    control: form.control,
    name: "checklist_items",
  });

  const { fields: fieldNotesFields, append: appendFieldNote, remove: removeFieldNote } = useFieldArray({
    control: form.control,
    name: "field_notes",
  });

  const watchTitle = form.watch("title");
  const watchContent = form.watch("content") || "";
  const watchNoteType = form.watch("note_type");
  const watchCategory = form.watch("category") || "General";
  const watchIsSecure = form.watch("is_secure");
  const watchIsFavorite = form.watch("is_favorite");
  const watchChecklist = form.watch("checklist_items") || [];
  const watchFieldNotes = form.watch("field_notes") || [];

  const filteredCategories = useMemo(() => {
    return NOTE_CATEGORIES.filter(c => 
      c.name.toLowerCase().includes(categoryInput.toLowerCase())
    );
  }, [categoryInput]);

  const selectedCatInfo = useMemo(() => {
    return NOTE_CATEGORIES.find(c => c.name === watchCategory) || NOTE_CATEGORIES[0];
  }, [watchCategory]);

  // Focus title field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Update state when note prop changes
  useEffect(() => {
    if (note) {
      setActiveNoteId(note.id);
      form.reset({
        title: note.title,
        content: note.content || "",
        category: note.category || "General",
        note_type: ((note.note_type as string) === "general" ? "standard" : note.note_type) as any || "standard",
        is_secure: note.is_secure,
        color: note.color,
        is_pinned: note.is_pinned,
        is_favorite: note.is_favorite,
        checklist_items: note.checklist_items || [],
        field_notes: note.field_notes || [],
      });
      if (note.updated_at) {
        setLastSavedAt(new Date(note.updated_at));
      }
    }
  }, [note, form]);

  // Core save function
  const performSave = useCallback(async (data: NoteFormValues, isExplicitManual = false) => {
    if (!data.title || data.title.trim() === "") {
      if (isExplicitManual) {
        toast.error("Please enter a title for your note");
      }
      return;
    }

    setSaveStatus("saving");
    setIsSubmitting(true);
    try {
      let resultNote: Note;
      if (activeNoteId) {
        resultNote = await updateNote(activeNoteId, data as any);
      } else {
        resultNote = await createNote(data as any);
        setActiveNoteId(resultNote.id);
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", `/notes/editor?id=${resultNote.id}`);
        }
      }
      setSaveStatus("saved");
      setLastSavedAt(new Date());
      if (onSaved) onSaved(resultNote);
      if (isExplicitManual) {
        toast.success(activeNoteId ? "Note updated" : "Note created successfully");
      }
    } catch (err) {
      setSaveStatus("unsaved");
      if (isExplicitManual) {
        toast.error("Failed to save note");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [activeNoteId, createNote, updateNote, onSaved]);

  // Debounced auto-save effect
  useEffect(() => {
    const isFormDirty = form.formState.isDirty;
    if (!isFormDirty) return;

    setSaveStatus("unsaved");
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const currentValues = form.getValues();
      if (currentValues.title && currentValues.title.trim().length > 0) {
        performSave(currentValues, false);
      }
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [watchTitle, watchContent, watchNoteType, watchCategory, watchIsSecure, watchIsFavorite, watchChecklist, watchFieldNotes, form, performSave]);

  const handleCategorySelect = (categoryName: string) => {
    if (categoryName === "Secure") {
      if (watchIsSecure && watchCategory === "Secure") {
        return;
      }
      setPendingAction({ type: "category", value: "Secure" });
      setIsSecureDialogOpen(true);
    } else {
      form.setValue("category", categoryName, { shouldDirty: true });
      if (watchCategory === "Secure") {
        form.setValue("is_secure", false, { shouldDirty: true });
      }
    }
    setComboboxOpen(false);
    setCategoryInput("");
  };

  const handleSecureSwitchChange = (checked: boolean) => {
    if (checked) {
      setPendingAction({ type: "switch", value: true });
      setIsSecureDialogOpen(true);
    } else {
      form.setValue("is_secure", false, { shouldDirty: true });
      if (watchCategory === "Secure") {
        form.setValue("category", "General", { shouldDirty: true });
      }
    }
  };

  const handleVerifySuccess = () => {
    if (pendingAction) {
      if (pendingAction.type === "category") {
        form.setValue("category", "Secure", { shouldDirty: true });
        form.setValue("is_secure", true, { shouldDirty: true });
      } else if (pendingAction.type === "switch") {
        form.setValue("is_secure", true, { shouldDirty: true });
        form.setValue("category", "Secure", { shouldDirty: true });
      }
    }
    setIsSecureDialogOpen(false);
    setPendingAction(null);
  };

  const handleVerifyCancel = () => {
    setIsSecureDialogOpen(false);
    setPendingAction(null);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/notes");
    }
  };

  const handleExport = (formatType: "txt" | "md" | "json") => {
    const title = watchTitle || "Untitled Knowledge";
    let contentStr = "";
    let mimeType = "text/plain";
    let extension = "txt";

    if (formatType === "json") {
      contentStr = JSON.stringify({
        title,
        category: watchCategory,
        note_type: watchNoteType,
        is_secure: watchIsSecure,
        is_favorite: watchIsFavorite,
        content: watchContent,
        checklist_items: watchChecklist,
        field_notes: watchFieldNotes,
        updated_at: lastSavedAt,
      }, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else if (formatType === "md") {
      contentStr = `# ${title}\n\n`;
      contentStr += `> Category: ${watchCategory} | Type: ${watchNoteType}\n\n`;
      if (watchNoteType === "checklist") {
        contentStr += watchChecklist.map(i => `- [${i.completed ? "x" : " "}] ${i.text}`).join("\n");
      } else if (watchNoteType === "field") {
        contentStr += watchFieldNotes.map(f => `**${f.label}**: ${f.value}`).join("\n\n");
      } else {
        contentStr += watchContent;
      }
      mimeType = "text/markdown";
      extension = "md";
    } else {
      contentStr = `${title.toUpperCase()}\nCategory: ${watchCategory}\n-------------------------\n\n`;
      if (watchNoteType === "checklist") {
        contentStr += watchChecklist.map(i => `${i.completed ? "[✓]" : "[ ]"} ${i.text}`).join("\n");
      } else if (watchNoteType === "field") {
        contentStr += watchFieldNotes.map(f => `${f.label}: ${f.value}`).join("\n");
      } else {
        contentStr += watchContent;
      }
      mimeType = "text/plain";
      extension = "txt";
    }

    const blob = new Blob([contentStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${extension.toUpperCase()}`);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const shareUrl = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Knowledge link copied to clipboard!");
      } else {
        toast.info("Share feature coming soon!");
      }
    }
  };

  // Word count, Char count, Reading time
  const wordCount = useMemo(() => {
    let text = watchContent;
    if (watchNoteType === "checklist") {
      text = watchChecklist.map(i => i.text).join(" ");
    } else if (watchNoteType === "field") {
      text = watchFieldNotes.map(f => `${f.label} ${f.value}`).join(" ");
    }
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, [watchContent, watchNoteType, watchChecklist, watchFieldNotes]);

  const charCount = useMemo(() => {
    if (watchNoteType === "checklist") {
      return watchChecklist.reduce((acc, i) => acc + (i.text?.length || 0), 0);
    }
    if (watchNoteType === "field") {
      return watchFieldNotes.reduce((acc, f) => acc + (f.label?.length || 0) + (f.value?.length || 0), 0);
    }
    return watchContent.length;
  }, [watchContent, watchNoteType, watchChecklist, watchFieldNotes]);

  const readingTimeMinutes = useMemo(() => {
    if (wordCount === 0) return 1;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // Checklist statistics
  const checklistStats = useMemo(() => {
    const total = watchChecklist.length;
    const completed = watchChecklist.filter(i => i.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [watchChecklist]);

  // Canvas Ruled Notebook Paper Aesthetic (Napkin AI Style)
  const isDark = resolvedTheme === "dark";
  const ruledLineColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(148, 163, 184, 0.32)";
  const marginLineColor = isDark ? "rgba(248, 113, 113, 0.4)" : "rgba(239, 68, 68, 0.45)";

  const canvasPaperStyle = {
    backgroundImage: `
      linear-gradient(to right, transparent 48px, ${marginLineColor} 49px, ${marginLineColor} 50px, transparent 51px),
      linear-gradient(to bottom, transparent 35px, ${ruledLineColor} 36px)
    `,
    backgroundSize: "100% 100%, 100% 36px",
    backgroundRepeat: "no-repeat, repeat-y",
    backgroundPosition: "0 0, 0 0",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-[calc(100vh-3rem)] w-full flex flex-col bg-background text-foreground relative z-20 pb-16 overflow-x-hidden"
    >
      {/* 1. TOP FLOATING TOOLBAR (Glassmorphism inspired by Craft, Notion, Arc) */}
      {!isFocusMode && (
        <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-background/70 border-b border-purple-500/15 py-2 px-3 sm:px-6 transition-all duration-300 shadow-[0_8px_32px_rgba(124,77,255,0.06)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Left Actions: Back & Save Status */}
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="rounded-full h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-purple-500/10 flex items-center gap-1.5 text-xs font-bold transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Notes</span>
                </Button>
              </motion.div>

              <div className="h-4 w-[1px] bg-border/60 hidden sm:block" />

              {/* Auto save indicator */}
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-accent/40 border border-purple-500/10 text-muted-foreground">
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                    <span className="text-purple-600 dark:text-purple-400 font-bold hidden sm:inline">Saving...</span>
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-muted-foreground text-[11px] font-mono hidden md:inline">
                      {lastSavedAt ? `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}` : "Saved"}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-mono md:hidden">Saved</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-500 font-bold text-[11px]">Unsaved</span>
                  </>
                )}
              </div>
            </div>

            {/* Right Toolbar Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Note Type Selector */}
              <div className="hidden xl:flex items-center p-0.5 bg-accent/40 rounded-xl border border-purple-500/15">
                {[
                  { type: "standard", label: "Standard", icon: FileText },
                  { type: "checklist", label: "Checklist", icon: CheckSquare },
                  { type: "field", label: "Field", icon: Table },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = watchNoteType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => form.setValue("note_type", item.type as any, { shouldDirty: true })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                        isActive
                          ? "bg-card text-purple-600 dark:text-purple-400 shadow-sm font-bold border border-purple-500/20"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Combobox */}
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 sm:px-3 rounded-xl bg-card border-border/60 text-foreground flex items-center gap-1.5 hover:bg-purple-500/10 text-xs font-bold"
                  >
                    <span>{selectedCatInfo.icon}</span>
                    <span className="max-w-[70px] sm:max-w-[100px] truncate">{watchCategory}</span>
                    <ChevronsUpDown className="w-3 h-3 opacity-50 ml-0.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0 bg-card border border-border rounded-2xl shadow-xl z-50" align="end">
                  <div className="p-2 border-b border-border/60 flex items-center gap-2 bg-accent/20">
                    <Search className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                    <Input
                      placeholder="Search categories..."
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 text-xs text-foreground placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <div className="max-h-[220px] overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
                    {filteredCategories.map(cat => (
                      <Button
                        key={cat.name}
                        type="button"
                        variant="ghost"
                        className={`w-full justify-between font-normal h-9 rounded-xl px-2.5 hover:bg-accent/40 ${watchCategory === cat.name ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold" : "text-muted-foreground"}`}
                        onClick={() => handleCategorySelect(cat.name)}
                      >
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-base">{cat.icon}</span>
                          <span>{cat.name}</span>
                        </span>
                        {watchCategory === cat.name && <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Voice Dictation Button */}
              <VoiceDictationButton
                onTranscript={(text) => {
                  const current = form.getValues("content") || "";
                  form.setValue("content", (current ? current + " " : "") + text, { shouldDirty: true });
                  toast.success("Voice text added");
                }}
                className="h-9 w-9"
              />

              {/* Secure Note Toggle */}
              <Button
                type="button"
                variant={watchIsSecure ? "default" : "ghost"}
                size="icon"
                onClick={() => handleSecureSwitchChange(!watchIsSecure)}
                className={`h-9 w-9 rounded-full transition-all ${
                  watchIsSecure
                    ? "bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_15px_rgba(124,77,255,0.4)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-purple-500/10"
                }`}
                title={watchIsSecure ? "Secure Note Enabled" : "Make Note Secure"}
              >
                {watchIsSecure ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
              </Button>

              {/* Favorite Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => form.setValue("is_favorite", !watchIsFavorite, { shouldDirty: true })}
                className={`h-9 w-9 rounded-full transition-all ${
                  watchIsFavorite
                    ? "text-red-500 bg-red-500/10 hover:bg-red-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-purple-500/10"
                }`}
                title={watchIsFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart className={`w-4 h-4 ${watchIsFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </Button>


              {/* AI Knowledge Assistant Panel Trigger */}
              <Button
                type="button"
                variant={isSidebarOpen && sidebarTab === "ai" ? "default" : "ghost"}
                size="icon"
                onClick={() => {
                  if (isSidebarOpen && sidebarTab === "ai") {
                    setIsSidebarOpen(false);
                  } else {
                    setSidebarTab("ai");
                    setIsSidebarOpen(true);
                  }
                }}
                className={`h-9 w-9 rounded-full transition-all ${
                  isSidebarOpen && sidebarTab === "ai"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                }`}
                title="AI Knowledge Assistant"
              >
                <Sparkles className="w-4 h-4" />
              </Button>

              {/* Knowledge Graph Trigger */}
              <Button
                type="button"
                variant={isSidebarOpen && sidebarTab === "graph" ? "default" : "ghost"}
                size="icon"
                onClick={() => {
                  if (isSidebarOpen && sidebarTab === "graph") {
                    setIsSidebarOpen(false);
                  } else {
                    setSidebarTab("graph");
                    setIsSidebarOpen(true);
                  }
                }}
                className={`h-9 w-9 rounded-full transition-all ${
                  isSidebarOpen && sidebarTab === "graph"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-purple-500/10"
                }`}
                title="Obsidian Knowledge Graph"
              >
                <Network className="w-4 h-4" />
              </Button>

              {/* Focus Mode Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsFocusMode(true)}
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-purple-500/10 hidden sm:flex"
                title="Distraction-Free Focus Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-purple-500/10"
                    title="Export Note"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border border-border rounded-2xl shadow-xl p-1.5 z-50">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">Export As</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem onClick={() => handleExport("md")} className="rounded-xl text-xs font-medium cursor-pointer">
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("txt")} className="rounded-xl text-xs font-medium cursor-pointer">
                    Plain Text (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("json")} className="rounded-xl text-xs font-medium cursor-pointer">
                    JSON Data (.json)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Share Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-purple-500/10 hidden sm:flex"
                title="Share Note"
              >
                <Share2 className="w-4 h-4" />
              </Button>

              {/* Explicit Save Button */}
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={() => performSave(form.getValues(), true)}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-[0_4px_16px_rgba(124,77,255,0.3)] flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save</span>
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* FOCUS MODE EXIT BAR */}
      {isFocusMode && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFocusMode(false)}
            className="rounded-full bg-card/80 backdrop-blur-md border border-purple-500/20 text-xs font-bold shadow-lg flex items-center gap-1.5"
          >
            <Minimize2 className="w-3.5 h-3.5" /> Exit Focus
          </Button>
        </div>
      )}

      {/* MAIN CONTAINER (CANVAS + COLLAPSIBLE KNOWLEDGE SIDEBAR) */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex items-start justify-center gap-6 px-4 sm:px-8 py-6">
        
        {/* 2. NAPKIN AI WRITING CANVAS (MAX WIDTH 850px CENTERED) */}
        <div 
          className="flex-1 w-full max-w-[850px] mx-auto flex flex-col transition-all duration-300 rounded-3xl py-8 sm:py-10 pr-6 sm:pr-10 pl-16 sm:pl-20 border border-purple-500/10 bg-card/60 shadow-sm relative overflow-hidden"
          style={canvasPaperStyle}
        >
          <form onSubmit={form.handleSubmit((d) => performSave(d, true))} className="flex-1 flex flex-col">
            
            {/* Mobile Note Type Selector Bar */}
            <div className="flex xl:hidden items-center justify-center mb-6 p-1 bg-accent/40 rounded-2xl border border-purple-500/15 w-full max-w-sm mx-auto">
              {[
                { type: "standard", label: "Standard", icon: FileText },
                { type: "checklist", label: "Checklist", icon: CheckSquare },
                { type: "field", label: "Field Note", icon: Table },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = watchNoteType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => form.setValue("note_type", item.type as any, { shouldDirty: true })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-all ${
                      isActive
                        ? "bg-card text-purple-600 dark:text-purple-400 shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* HERO TITLE FIELD (Napkin AI Prominent Typography) */}
            <div className="space-y-3 mb-6">
              <Input
                {...(() => {
                  const { ref: regRef, ...rest } = form.register("title");
                  return {
                    ...rest,
                    ref: (e: HTMLInputElement | null) => {
                      regRef(e);
                      titleInputRef.current = e;
                    },
                  };
                })()}
                placeholder="Untitled Knowledge"
                className="w-full h-auto bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground placeholder:text-muted-foreground/30 tracking-tight leading-normal overflow-visible"
              />
              {form.formState.errors.title && (
                <p className="text-red-400 text-xs font-semibold px-2">{form.formState.errors.title.message}</p>
              )}

              {/* RICH METADATA ROW */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium pt-1 border-b border-border/40 pb-4 px-2">
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-md font-bold text-[11px]">
                  <span>{selectedCatInfo.icon}</span>
                  <span>{watchCategory}</span>
                </span>

                {watchIsSecure && (
                  <span className="flex items-center gap-1 text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-md font-bold text-[11px]">
                    <Lock className="w-3 h-3" /> Secure
                  </span>
                )}

                <span className="text-border">•</span>
                
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-500" />
                  <span className="font-bold text-foreground">{readingTimeMinutes} min read</span>
                </span>

                <span className="text-border">•</span>

                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{format(createdAt, "MMM d, yyyy")}</span>
                </span>

                <span className="text-border">•</span>

                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{wordCount} words</span>
                  <span className="text-muted-foreground/50">({charCount} chars)</span>
                </span>

                {watchNoteType === "checklist" && checklistStats.total > 0 && (
                  <>
                    <span className="text-border">•</span>
                    <span className="text-emerald-500 font-bold">{checklistStats.percent}% completed</span>
                  </>
                )}
              </div>
            </div>

            {/* EMPTY STATE INSPIRATIONAL HELPER TEXT */}
            {!watchTitle && !watchContent && watchChecklist.length === 0 && watchFieldNotes.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 mb-6 rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 flex flex-col space-y-2 text-xs"
              >
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>Your second brain starts here</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Capture: <span className="font-bold text-foreground">Ideas • Knowledge • Research • Thoughts • Memories • Plans</span>
                </p>
              </motion.div>
            )}

            {/* 3. WRITING CANVAS BASED ON NOTE TYPE */}
            {/* TYPE A: STANDARD LONG-FORM EDITOR */}
            {watchNoteType === "standard" && (
              <div className="flex-1 flex flex-col min-h-[400px] relative">
                <Textarea
                  {...form.register("content")}
                  placeholder="Start capturing your ideas, insights, memories, and knowledge..."
                  className="flex-1 w-full bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1 text-base sm:text-lg text-foreground/90 font-sans leading-[36px] resize-none placeholder:text-muted-foreground/35 min-h-[450px] scrollbar-none overflow-visible"
                />
              </div>
            )}

            {/* TYPE B: INTERACTIVE CHECKLIST CANVAS */}
            {watchNoteType === "checklist" && (
              <div className="flex-1 flex flex-col space-y-6 min-h-[400px]">
                {/* Progress bar */}
                {checklistStats.total > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Checklist Progress</span>
                      <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">{checklistStats.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500 rounded-full"
                        style={{ width: `${checklistStats.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Checklist items */}
                <div className="space-y-2">
                  {checklistFields.map((field, index) => {
                    const isChecked = form.watch(`checklist_items.${index}.completed`);
                    return (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          isChecked
                            ? "bg-accent/20 border-transparent text-muted-foreground"
                            : "bg-card border-border/50 hover:border-purple-500/40 shadow-sm"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            form.setValue(`checklist_items.${index}.completed`, !isChecked, { shouldDirty: true });
                          }}
                          className="shrink-0 text-purple-600 dark:text-purple-400 transition-transform active:scale-90"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground/60 hover:text-purple-500" />
                          )}
                        </button>

                        <Input
                          {...form.register(`checklist_items.${index}.text` as const)}
                          placeholder="Checklist task..."
                          className={`flex-1 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-2 py-1 text-sm font-medium ${
                            isChecked ? "line-through text-muted-foreground/70" : "text-foreground"
                          }`}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChecklist(index)}
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </motion.div>
                    );
                  })}

                  {checklistFields.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-border/60 rounded-3xl text-muted-foreground text-xs font-medium space-y-2">
                      <List className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p>No checklist items yet.</p>
                      <p className="text-muted-foreground/60">Click below to start adding tasks.</p>
                    </div>
                  )}
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendChecklist({ text: "", completed: false, order: checklistFields.length })}
                    className="rounded-2xl border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 h-10 px-4 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </Button>
                </div>
              </div>
            )}

            {/* TYPE C: KEY-VALUE FIELD CANVAS */}
            {watchNoteType === "field" && (
              <div className="flex-1 flex flex-col space-y-6 min-h-[400px]">
                <div className="space-y-3">
                  {fieldNotesFields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                    >
                      <div className="w-full sm:w-1/3">
                        <Input
                          {...form.register(`field_notes.${index}.label` as const)}
                          placeholder="Label (e.g. Account Number)"
                          className="bg-accent/40 border-border/40 rounded-xl h-9 text-xs font-bold text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                      <div className="flex-1 w-full flex items-center gap-2">
                        <Textarea
                          {...form.register(`field_notes.${index}.value` as const)}
                          placeholder="Value..."
                          className="bg-accent/20 border-border/40 rounded-xl min-h-[38px] h-9 p-2 text-xs font-medium text-foreground resize-none focus-visible:ring-purple-500/30 flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFieldNote(index)}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}

                  {fieldNotesFields.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-border/60 rounded-3xl text-muted-foreground text-xs font-medium space-y-2">
                      <Table className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p>No fields added yet.</p>
                      <p className="text-muted-foreground/60">Click below to create key-value rows.</p>
                    </div>
                  )}
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendFieldNote({ label: "", value: "" })}
                    className="rounded-2xl border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 h-10 px-4 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Field
                  </Button>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* 4. COLLAPSIBLE RIGHT KNOWLEDGE SIDEBAR (AI & GRAPH) */}
        {!isFocusMode && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 340 }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            className="hidden lg:flex flex-col shrink-0 p-5 rounded-3xl bg-card border border-purple-500/20 shadow-xl space-y-4 sticky top-16"
          >
            {/* Sidebar Tabs */}
            <div className="flex items-center p-1 bg-accent/40 rounded-2xl border border-border/30">
              <button
                type="button"
                onClick={() => setSidebarTab("ai")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  sidebarTab === "ai"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Assistant
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("graph")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  sidebarTab === "graph"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Network className="w-3.5 h-3.5" /> Knowledge Graph
              </button>
            </div>

            {/* Tab Contents */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-thin pr-1">
              {sidebarTab === "ai" ? (
                <AIKnowledgePanel
                  title={watchTitle}
                  content={watchContent}
                  onApplyTitle={(t) => form.setValue("title", t, { shouldDirty: true })}
                  onAppendContent={(t) => {
                    const curr = form.getValues("content") || "";
                    form.setValue("content", (curr ? curr + "\n" : "") + t, { shouldDirty: true });
                  }}
                  onReplaceContent={(t) => form.setValue("content", t, { shouldDirty: true })}
                  onAddChecklistItems={(items) => {
                    form.setValue("note_type", "checklist", { shouldDirty: true });
                    const existing = form.getValues("checklist_items") || [];
                    const newFields = items.map((text, idx) => ({
                      text,
                      completed: false,
                      order: existing.length + idx,
                    }));
                    form.setValue("checklist_items", [...existing, ...newFields], { shouldDirty: true });
                  }}
                />
              ) : (
                <KnowledgeGraphPreview
                  currentNoteId={activeNoteId}
                  currentTitle={watchTitle}
                  category={watchCategory}
                />
              )}
            </div>
          </motion.div>
        )}

      </div>

      {/* SECURE PASSWORD VERIFICATION DIALOG INTEGRATION */}
      <SecurePasswordDialog
        open={isSecureDialogOpen}
        onOpenChange={setIsSecureDialogOpen}
        onVerifySuccess={handleVerifySuccess}
        onCancel={handleVerifyCancel}
      />
    </motion.div>
  );
}
