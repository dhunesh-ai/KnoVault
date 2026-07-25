"use client";

import { useState } from "react";
import { Milestone } from "@/types/Goal";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityPills } from "./PriorityPills";
import { SubtaskList } from "./SubtaskList";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface ProjectCreatorProps {
  onCreateProject: (data: {
    title: string;
    description: string | null;
    priority: string;
    status: string;
    progress: number;
    deadline: string | null;
    subtasks: Milestone[];
  }) => void;
  isCreating?: boolean;
}

export function ProjectCreator({ onCreateProject, isCreating }: ProjectCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [subtasks, setSubtasks] = useState<Milestone[]>([]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setDeadline(undefined);
    setSubtasks([]);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreateProject({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: "Pending",
      progress: 0,
      deadline: deadline ? deadline.toISOString() : null,
      subtasks,
    });
    resetForm();
    setIsOpen(false);
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="toggle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-center gap-2 h-14 rounded-[20px] border-[1.5px] border-dashed border-primary/30 bg-card/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 transition-all duration-200 cursor-pointer group"
          >
            <PlusCircle className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
            <span className="text-sm font-bold text-primary/60 group-hover:text-primary transition-colors">
              Create New Project
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-[24px] p-5 md:p-6 shadow-lg space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-foreground">
                  New Project
                </h4>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project Title"
                className="w-full h-12 px-4 bg-muted/30 border border-border/30 rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
              />

              {/* Description */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (Optional)"
                rows={3}
                className="w-full px-4 py-3 bg-muted/30 border border-border/30 rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none transition-colors"
              />

              {/* Priority */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Priority
                </label>
                <PriorityPills value={priority} onChange={setPriority} />
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Deadline
                </label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-medium bg-muted/30 border-border/30 rounded-xl h-10 text-sm",
                          !deadline && "text-muted-foreground/50"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadline
                          ? format(deadline, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        className="bg-card text-foreground"
                      />
                    </PopoverContent>
                  </Popover>
                  {deadline && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeadline(undefined)}
                      className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer whitespace-nowrap"
                    >
                      Clear
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <SubtaskList subtasks={subtasks} onChange={setSubtasks} />

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!title.trim() || isCreating}
                className={cn(
                  "w-full h-12 rounded-2xl text-sm font-extrabold transition-all cursor-pointer",
                  title.trim()
                    ? "bg-primary text-white shadow-[0_4px_16px_rgba(124,77,255,0.25)] hover:shadow-[0_6px_20px_rgba(124,77,255,0.35)]"
                    : "bg-border/40 text-muted-foreground cursor-not-allowed"
                )}
              >
                {isCreating ? "Creating..." : "Create Project"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
