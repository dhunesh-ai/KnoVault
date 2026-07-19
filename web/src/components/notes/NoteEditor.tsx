/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Note } from "@/types/Note";
import { useNotesStore } from "@/store/useNotesStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Check, ChevronsUpDown, Search } from "lucide-react";
import { toast } from "sonner";
import { VoiceDictationButton } from "@/components/notes/VoiceDictationButton";
import { NOTE_CATEGORIES } from "@/constants/noteCategories";
import { SecurePasswordDialog } from "@/components/notes/SecurePasswordDialog";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
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
    completed: z.boolean().default(false)
  })).optional().nullable(),
  field_notes: z.array(z.object({
    id: z.number().optional(),
    label: z.string().min(1),
    value: z.string().min(1)
  })).optional().nullable(),
});

type NoteFormValues = z.infer<typeof noteSchema>;

interface NoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null; // If null, it's create mode
}

export function NoteEditor({ open, onOpenChange, note }: NoteEditorProps) {
  const { createNote, updateNote } = useNotesStore();
  
  const [categoryInput, setCategoryInput] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Secure dialog trigger states
  const [isSecureDialogOpen, setIsSecureDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: "category" | "switch"; value: any } | null>(null);

  const defaultValues: any = {
    title: "",
    content: "",
    category: "General",
    note_type: "standard",
    is_secure: false,
    color: null,
    is_pinned: false,
    is_favorite: false,
    checklist_items: [],
    field_notes: [],
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

  const watchNoteType = form.watch("note_type");
  const watchCategory = form.watch("category") || "General";
  const filteredCategories = NOTE_CATEGORIES.filter(c => 
    c.name.toLowerCase().includes(categoryInput.toLowerCase())
  );

  useEffect(() => {
    if (note) {
      form.reset({
        title: note.title,
        content: note.content || "",
        category: note.category || "General",
        note_type: ((note.note_type as string) === "general" ? "standard" : note.note_type) as "standard" | "checklist" | "field",
        is_secure: note.is_secure,
        color: note.color,
        is_pinned: note.is_pinned,
        is_favorite: note.is_favorite,
        checklist_items: note.checklist_items || [],
        field_notes: note.field_notes || [],
      });
    } else {
      form.reset(defaultValues);
    }
  }, [note, open, form]);

  const handleCategorySelect = (categoryName: string) => {
    if (categoryName === "Secure") {
      if (form.getValues("is_secure") && form.getValues("category") === "Secure") {
        return;
      }
      setPendingAction({ type: "category", value: "Secure" });
      setIsSecureDialogOpen(true);
    } else {
      form.setValue("category", categoryName);
      if (form.getValues("category") === "Secure") {
        form.setValue("is_secure", false);
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
      form.setValue("is_secure", false);
      if (form.getValues("category") === "Secure") {
        form.setValue("category", "General");
      }
    }
  };

  const handleVerifySuccess = () => {
    if (pendingAction) {
      if (pendingAction.type === "category") {
        form.setValue("category", "Secure");
        form.setValue("is_secure", true);
      } else if (pendingAction.type === "switch") {
        form.setValue("is_secure", true);
        form.setValue("category", "Secure");
      }
    }
    setIsSecureDialogOpen(false);
    setPendingAction(null);
  };

  const handleVerifyCancel = () => {
    setIsSecureDialogOpen(false);
    setPendingAction(null);
  };

  const onSubmit = async (data: NoteFormValues) => {
    setIsSubmitting(true);
    try {
      if (note) {
        await updateNote(note.id, data as any);
        toast.success("Note updated successfully");
      } else {
        await createNote(data as any);
        toast.success("Note created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCatInfo = NOTE_CATEGORIES.find(c => c.name === watchCategory) || NOTE_CATEGORIES[0];

  const paperStyle = {
    backgroundColor: "#FFFDF5",
    backgroundImage: `
      linear-gradient(to right, transparent calc(2.75rem - 1px), rgba(239, 68, 68, 0.25) calc(2.75rem - 1px), rgba(239, 68, 68, 0.25) 2.75rem, transparent 2.75rem),
      linear-gradient(rgba(124, 77, 255, 0.07) 1px, transparent 1px),
      radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.6), rgba(245, 240, 220, 0.15))
    `,
    backgroundSize: "100% 100%, 100% 2rem, 100% 100%",
    backgroundPosition: "0 0, 0 4.5rem, 0 0",
    backgroundRepeat: "no-repeat, repeat, no-repeat",
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px] bg-background border-border text-foreground p-0 overflow-hidden rounded-3xl shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-card/30 backdrop-blur-sm">
            <DialogTitle className="text-xl font-bold tracking-tight">{note ? "Edit Note" : "Create Note"}</DialogTitle>
            <DialogDescription className="sr-only">
              {note ? "Edit your note details below" : "Fill out the details to create a new note"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-[75vh] max-h-[850px]">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Title</Label>
                <Input
                  {...form.register("title")}
                  placeholder="Enter note title..."
                  className="bg-card border-border rounded-xl focus-visible:ring-primary/40 h-10 text-sm font-medium"
                />
                {form.formState.errors.title && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Type Segmented Control & Category Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div className="space-y-2 flex-1 max-w-md">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Note Type</Label>
                  <div className="relative flex p-1 bg-accent/40 backdrop-blur-md rounded-2xl border border-border/20 w-full">
                    {["standard", "checklist", "field"].map((type) => {
                      const isActive = watchNoteType === type;
                      const label = type === "standard" ? "Standard" : type === "checklist" ? "Checklist" : "Field Note";
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => form.setValue("note_type", type as any)}
                          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-300 relative ${
                            isActive
                              ? "bg-card text-primary shadow-[0_4px_16px_rgba(124,77,255,0.08)] border border-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 w-full sm:w-[220px]">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Category</Label>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="w-full justify-between bg-card border-primary/20 hover:border-primary/50 text-foreground rounded-full hover:scale-[1.01] hover:shadow-[0_4px_12px_rgba(124,77,255,0.06)] active:scale-98 transition-all duration-200 h-10 px-4"
                      >
                        <span className="flex items-center gap-2 text-xs font-medium">
                          <span className="text-sm">{selectedCatInfo.icon}</span>
                          <span>{watchCategory}</span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent disablePortal={true} className="w-[240px] p-0 bg-card border border-border rounded-2xl overflow-hidden shadow-xl" align="end">
                      <div className="p-2 border-b border-border/60 flex items-center gap-2 bg-accent/20">
                        <Search className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                        <Input
                          placeholder="Search categories..."
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value)}
                          className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 text-xs text-foreground placeholder:text-muted-foreground/60"
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map(cat => (
                            <Button
                              key={cat.name}
                              type="button"
                              variant="ghost"
                              className={`w-full justify-between font-normal h-9 rounded-xl px-2.5 hover:bg-accent/40 ${watchCategory === cat.name ? "bg-accent text-foreground" : "text-muted-foreground"}`}
                              onClick={() => handleCategorySelect(cat.name)}
                            >
                              <span className="flex items-center gap-2 text-xs">
                                <span className="text-base">{cat.icon}</span>
                                <span>{cat.name}</span>
                              </span>
                              {watchCategory === cat.name && <Check className="h-3.5 h-3.5 text-primary" />}
                            </Button>
                          ))
                        ) : (
                          <div className="p-4 text-xs text-muted-foreground text-center">
                            No categories found
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Content based on type */}
              {watchNoteType === "standard" && (
                <div className="space-y-2 flex-1 flex flex-col min-h-[260px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Content</Label>
                      <VoiceDictationButton 
                        onTranscript={(text) => {
                          const current = form.getValues("content") || "";
                          form.setValue("content", current + text, { shouldDirty: true });
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {(form.watch("content") || "").length} characters
                    </span>
                  </div>
                  <div 
                    className="relative w-full flex-1 flex flex-col rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-border/40 p-6 pt-10 pl-14 min-h-[200px] overflow-hidden group hover:shadow-[0_12px_40px_rgb(0,0,0,0.05)] transition-all duration-300"
                    style={paperStyle}
                  >
                    <Textarea
                      {...form.register("content")}
                      placeholder="Write your note here..."
                      className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 m-0 w-full flex-1 resize-none text-neutral-800 font-sans leading-8 text-base placeholder:text-neutral-400/80 scrollbar-none"
                      style={{
                        lineHeight: "2rem",
                      }}
                    />
                  </div>
                </div>
              )}

              {watchNoteType === "checklist" && (
                <div className="space-y-2 flex flex-col">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Checklist Items</Label>
                  <div 
                    className="relative w-full rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-border/40 p-6 pt-10 pl-14 min-h-[260px] overflow-hidden group hover:shadow-[0_12px_40px_rgb(0,0,0,0.05)] transition-all duration-300"
                    style={{
                      backgroundColor: "#FFFDF5",
                      backgroundImage: `
                        linear-gradient(to right, transparent calc(2.75rem - 1px), rgba(239, 68, 68, 0.25) calc(2.75rem - 1px), rgba(239, 68, 68, 0.25) 2.75rem, transparent 2.75rem),
                        linear-gradient(rgba(124, 77, 255, 0.07) 1px, transparent 1px),
                        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.6), rgba(245, 240, 220, 0.15))
                      `,
                      backgroundSize: "100% 100%, 100% 2.5rem, 100% 100%",
                      backgroundPosition: "0 0, 0 5rem, 0 0",
                      backgroundRepeat: "no-repeat, repeat, no-repeat",
                    }}
                  >
                    <div className="space-y-0">
                      {checklistFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3 h-10 select-none">
                          <Input
                            {...form.register(`checklist_items.${index}.text` as const)}
                            className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none h-8 p-0 text-neutral-800 font-sans text-sm flex-1 leading-8 placeholder:text-neutral-400/80"
                            placeholder="Item text..."
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 rounded-full shrink-0 transition-all duration-200"
                            onClick={() => removeChecklist(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      {checklistFields.length === 0 && (
                        <div className="h-10 flex items-center text-xs text-muted-foreground/80 italic select-none">
                          No items yet. Click add below to create checklist rows.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 rounded-full hover:scale-[1.01] transition-all"
                      onClick={() => appendChecklist({ text: "", completed: false })}
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Add Item
                    </Button>
                  </div>
                </div>
              )}

              {watchNoteType === "field" && (
                <div className="space-y-2 flex flex-col">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Key-Value Fields</Label>
                  <div 
                    className="relative w-full rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-border/40 p-6 pt-10 pl-14 min-h-[260px] overflow-hidden group hover:shadow-[0_12px_40px_rgb(0,0,0,0.05)] transition-all duration-300"
                    style={{
                      backgroundColor: "#FFFDF5",
                      backgroundImage: `
                        linear-gradient(to right, transparent calc(2.75rem - 1px), rgba(239, 68, 68, 0.25) calc(2.75rem - 1px), rgba(239, 68, 68, 0.25) 2.75rem, transparent 2.75rem),
                        linear-gradient(rgba(124, 77, 255, 0.07) 1px, transparent 1px),
                        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.6), rgba(245, 240, 220, 0.15))
                      `,
                      backgroundSize: "100% 100%, 100% 3rem, 100% 100%",
                      backgroundPosition: "0 0, 0 6rem, 0 0",
                      backgroundRepeat: "no-repeat, repeat, no-repeat",
                    }}
                  >
                    <div className="space-y-4">
                      {fieldNotesFields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-start border-b border-dashed border-[#e1dfd5]/60 pb-2 last:border-0">
                          <div className="w-1/3 min-w-[100px]">
                            <Input
                              {...form.register(`field_notes.${index}.label` as const)}
                              className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none h-8 p-0 text-neutral-800 font-sans text-xs font-bold uppercase tracking-wider placeholder:text-neutral-400"
                              placeholder="Label (e.g. Phone)"
                            />
                          </div>
                          <div className="flex-1 flex gap-2 items-start">
                            <Textarea
                              {...form.register(`field_notes.${index}.value` as const)}
                              className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none h-12 p-0 m-0 text-neutral-800 font-sans text-sm flex-1 leading-6 placeholder:text-neutral-400 scrollbar-none"
                              placeholder="Value..."
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 rounded-full shrink-0 transition-all duration-200 mt-1"
                              onClick={() => removeFieldNote(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {fieldNotesFields.length === 0 && (
                        <div className="h-10 flex items-center text-xs text-muted-foreground/80 italic select-none">
                          No fields yet. Click add below to create key-value rows.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 rounded-full hover:scale-[1.01] transition-all"
                      onClick={() => appendFieldNote({ label: "", value: "" })}
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Add Field
                    </Button>
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="flex items-center gap-6 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch("is_secure")}
                    onCheckedChange={handleSecureSwitchChange}
                  />
                  <Label className="cursor-pointer text-xs text-muted-foreground uppercase tracking-wider font-semibold" onClick={() => handleSecureSwitchChange(!form.watch("is_secure"))}>
                    Secure Note
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch("is_favorite")}
                    onCheckedChange={(val) => form.setValue("is_favorite", val)}
                  />
                  <Label className="cursor-pointer text-xs text-muted-foreground uppercase tracking-wider font-semibold" onClick={() => form.setValue("is_favorite", !form.watch("is_favorite"))}>
                    Favorite
                  </Label>
                </div>
              </div>

            </div>

            <DialogFooter className="p-6 pt-4 bg-background/80 backdrop-blur-md border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-[0_4px_14px_rgba(124,77,255,0.2)]"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {note ? "Update Note" : "Create Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SecurePasswordDialog
        open={isSecureDialogOpen}
        onOpenChange={setIsSecureDialogOpen}
        onVerifySuccess={handleVerifySuccess}
        onCancel={handleVerifyCancel}
      />
    </>
  );
}

