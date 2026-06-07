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
import { Loader2, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { VoiceDictationButton } from "@/components/notes/VoiceDictationButton";

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
  const { createNote, updateNote, categories, createCategory } = useNotesStore();
  
  const [categoryInput, setCategoryInput] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(categoryInput.toLowerCase()));

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
      // Error handled by store, toast shown there or here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border text-foreground p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{note ? "Edit Note" : "Create Note"}</DialogTitle>
          <DialogDescription className="sr-only">
            {note ? "Edit your note details below" : "Fill out the details to create a new note"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-[70vh] max-h-[800px]">
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
            
            {/* Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                {...form.register("title")}
                placeholder="Enter note title..."
                className="bg-card border-border"
              />
              {form.formState.errors.title && (
                <p className="text-red-400 text-sm">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Type & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={watchNoteType}
                  onValueChange={(val: any) => form.setValue("note_type", val)}
                >
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="standard">Standard Note</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                    <SelectItem value="field">Field Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between bg-card border-border text-foreground"
                    >
                      {watchCategory}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 bg-card border-border">
                    <div className="p-2 border-b border-border">
                      <Input
                        placeholder="Type a category..."
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && categoryInput.trim()) {
                            e.preventDefault();
                            const newCat = categoryInput.trim();
                            createCategory(newCat).then(() => {
                              form.setValue("category", newCat);
                              setComboboxOpen(false);
                              setCategoryInput("");
                            }).catch(() => {
                              toast.error("Failed to create category");
                            });
                          }
                        }}
                        className="bg-background border-border h-8"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map(cat => (
                          <Button
                            key={cat.name}
                            variant="ghost"
                            className="w-full justify-start font-normal h-8"
                            onClick={() => {
                              form.setValue("category", cat.name);
                              setComboboxOpen(false);
                              setCategoryInput("");
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${watchCategory === cat.name ? "opacity-100" : "opacity-0"}`} />
                            {cat.name}
                          </Button>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Press Enter to create &quot;{categoryInput}&quot;
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Content based on type */}
            {watchNoteType === "standard" && (
              <div className="space-y-2 flex-1 flex flex-col h-full min-h-[200px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Label>Content</Label>
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
                <Textarea
                  {...form.register("content")}
                  placeholder="Write your note here..."
                  className="bg-card border-border flex-1 resize-none"
                />
              </div>
            )}

            {watchNoteType === "checklist" && (
              <div className="space-y-4">
                <Label>Checklist Items</Label>
                <div className="space-y-2">
                  {checklistFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        {...form.register(`checklist_items.${index}.text` as const)}
                        className="bg-card border-border"
                        placeholder="Item text..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={() => removeChecklist(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:bg-accent"
                  onClick={() => appendChecklist({ text: "", completed: false })}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>
            )}

            {watchNoteType === "field" && (
              <div className="space-y-4">
                <Label>Key-Value Fields</Label>
                <div className="space-y-2">
                  {fieldNotesFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2 bg-card/50 p-2 rounded-lg border border-border">
                      <div className="flex-1 space-y-2">
                        <Input
                          {...form.register(`field_notes.${index}.label` as const)}
                          className="bg-background border-border text-sm font-medium"
                          placeholder="Label (e.g. Name, Phone)"
                        />
                        <Textarea
                          {...form.register(`field_notes.${index}.value` as const)}
                          className="bg-background border-border resize-none h-16 text-sm"
                          placeholder="Value..."
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mt-1"
                        onClick={() => removeFieldNote(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:bg-accent"
                  onClick={() => appendFieldNote({ label: "", value: "" })}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Field
                </Button>
              </div>
            )}

            {/* Options */}
            <div className="flex items-center gap-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.watch("is_secure")}
                  onCheckedChange={(val) => form.setValue("is_secure", val)}
                />
                <Label className="cursor-pointer" onClick={() => form.setValue("is_secure", !form.watch("is_secure"))}>
                  Secure Note
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.watch("is_favorite")}
                  onCheckedChange={(val) => form.setValue("is_favorite", val)}
                />
                <Label className="cursor-pointer" onClick={() => form.setValue("is_favorite", !form.watch("is_favorite"))}>
                  Favorite
                </Label>
              </div>
            </div>

          </div>

          <DialogFooter className="p-6 pt-2 bg-background/80 backdrop-blur-md border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-foreground"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {note ? "Update Note" : "Create Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
