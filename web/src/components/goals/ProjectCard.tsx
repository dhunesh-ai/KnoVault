"use client";

import { useState } from "react";
import { Project } from "@/types/Project";
import { Milestone } from "@/types/Goal";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Calendar, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { StatusPills, getStatusColor, getStatusBgColor } from "./StatusPills";
import { PriorityPills, getPriorityColor, getPriorityBgColor } from "./PriorityPills";
import { SubtaskList } from "./SubtaskList";

interface ProjectCardProps {
  project: Project;
  onUpdate: (id: number, data: Partial<Project>) => void;
  onDelete: (id: number) => void;
}

export function ProjectCard({ project, onUpdate, onDelete }: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project.title);
  const [editedDesc, setEditedDesc] = useState(project.description || "");

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle.trim() !== project.title) {
      onUpdate(project.id, { title: editedTitle.trim() });
    } else {
      setEditedTitle(project.title);
    }
    setIsEditingTitle(false);
  };

  const handleSaveDesc = () => {
    if (editedDesc.trim() !== (project.description || "")) {
      onUpdate(project.id, { description: editedDesc.trim() });
    }
  };

  const handleStatusChange = (status: string) => {
    onUpdate(project.id, { status });
  };

  const handlePriorityChange = (priority: string) => {
    onUpdate(project.id, { priority });
  };

  const handleSubtasksChange = (subtasks: Milestone[]) => {
    const total = subtasks.length;
    const completedCount = subtasks.filter((s) => s.completed).length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : project.progress;
    const isCompleted = progress === 100;
    const status = isCompleted ? "Completed" : (project.status === "Completed" ? "In Progress" : project.status);
    onUpdate(project.id, { subtasks, progress, completed: isCompleted, status });
  };

  const formattedDate = project.deadline
    ? format(new Date(project.deadline), "MMM d")
    : null;

  const isOverdue =
    project.deadline &&
    isPast(new Date(project.deadline)) &&
    !project.completed;

  const priorityColor = getPriorityColor(project.priority);
  const priorityBg = getPriorityBgColor(project.priority);
  const statusColor = getStatusColor(project.status);
  const statusBg = getStatusBgColor(project.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "rounded-2xl border transition-all duration-200",
        "bg-card/80 backdrop-blur-md border-border/40",
        isExpanded && "shadow-lg border-primary/15"
      )}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 md:p-5 flex items-start justify-between gap-3 text-left cursor-pointer group"
      >
        <div className="flex-1 min-w-0">
          {/* Title */}
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setEditedTitle(project.title);
                  setIsEditingTitle(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="text-sm font-extrabold text-foreground bg-transparent focus:outline-none w-full"
            />
          ) : (
            <h4
              className={cn(
                "text-sm font-extrabold text-foreground line-clamp-1 mb-2",
                project.completed && "line-through text-muted-foreground/60"
              )}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              {project.title}
            </h4>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Priority */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
              style={{ backgroundColor: priorityBg, color: priorityColor }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: priorityColor }}
              />
              {project.priority}
            </span>

            {/* Status */}
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
              style={{ backgroundColor: statusBg, color: statusColor }}
            >
              {project.status}
            </span>

            {/* Deadline */}
            {formattedDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold",
                  isOverdue
                    ? "text-red-500 bg-red-500/10"
                    : "text-muted-foreground bg-muted/50"
                )}
              >
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-1"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      {/* Progress Bar — always visible */}
      <div className="px-4 md:px-5 pb-4 flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full"
            initial={false}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-bold text-muted-foreground w-9 text-right">
          {project.progress}%
        </span>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-5 pb-5 space-y-5 border-t border-border/30 pt-5">
              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Description
                </label>
                <textarea
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  onBlur={handleSaveDesc}
                  placeholder="Add a detailed description..."
                  rows={2}
                  className="w-full bg-muted/30 border border-border/30 rounded-xl p-3 text-xs font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 resize-none transition-colors"
                />
              </div>

              {/* Subtasks */}
              <SubtaskList
                subtasks={(project.subtasks as Milestone[]) || []}
                onChange={handleSubtasksChange}
              />

              {/* Status Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Status
                </label>
                <StatusPills
                  value={project.status}
                  onChange={handleStatusChange}
                />
              </div>

              {/* Priority Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Priority
                </label>
                <PriorityPills
                  value={project.priority}
                  onChange={handlePriorityChange}
                />
              </div>

              {/* Delete */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDelete(project.id)}
                className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:bg-red-500/5 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-bold">Delete Project</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
