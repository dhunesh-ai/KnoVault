 
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useGoalsStore } from "@/store/useGoalsStore";
import { GoalEditor } from "@/components/goals/GoalEditor";
import { DailyGoalsDashboard } from "@/components/goals/DailyGoalsDashboard";
import { QuickAddGoal } from "@/components/goals/QuickAddGoal";
import { DailyGoalItem } from "@/components/goals/DailyGoalItem";
import { ProjectsDashboard } from "@/components/goals/ProjectsDashboard";
import { ProjectCard } from "@/components/goals/ProjectCard";
import { ProjectCreator } from "@/components/goals/ProjectCreator";
import { GoalsEmptyState } from "@/components/goals/GoalsEmptyState";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { AnimatedCounter } from "@/components/goals/AnimatedCounter";
import { Goal, Milestone } from "@/types/Goal";
import { Project } from "@/types/Project";
import { Input } from "@/components/ui/input";
import { Search, Activity, Layers, Flame, Trophy } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
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
import { cn } from "@/lib/utils";

type TabType = "daily_goals" | "projects" | "completed";

export default function GoalsPage() {
  const {
    dailyGoals,
    projects,
    stats,
    isLoading,
    isSaving,
    fetchGoals,
    quickCreateDailyGoal,
    toggleDailyGoal,
    updateGoal,
    deleteGoal,
    createProject,
    updateProject,
    deleteProject,
  } = useGoalsStore();

  const [activeTab, setActiveTab] = useState<TabType>("daily_goals");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [deleteData, setDeleteData] = useState<{
    id: number;
    type: "daily_goal" | "project";
  } | null>(null);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // ── Filtered data ──
  const filteredDailyGoals = useMemo(() => {
    let filtered = dailyGoals.filter((g) => !g.completed);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter((g) => g.title.toLowerCase().includes(q));
    }
    return filtered;
  }, [dailyGoals, debouncedSearch]);

  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(
      (p) => !p.completed && p.status !== "Completed" && p.progress < 100
    );
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.subtasks?.some((st) => st.title.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [projects, debouncedSearch]);

  const completedItems = useMemo(() => {
    const completedGoals = dailyGoals.filter((g) => g.completed);
    const completedProjects = projects.filter(
      (p) => p.completed || p.status === "Completed" || p.progress >= 100
    );
    let items = [...completedGoals, ...completedProjects];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter((item) => item.title.toLowerCase().includes(q));
    }
    return items;
  }, [dailyGoals, projects, debouncedSearch]);

  // ── Stats ──
  const activeDailyGoals = dailyGoals.filter((g) => !g.completed).length;
  const activeProjectsCount = projects.filter(
    (p) => !p.completed && p.status !== "Completed"
  ).length;
  const completedDailyCount = dailyGoals.filter((g) => g.completed).length;
  const totalDailyCount = dailyGoals.length;

  // ── Handlers ──

  const handleEditGoal = useCallback(
    (goal: Goal) => {
      setEditingGoal(goal);
      setEditorOpen(true);
    },
    []
  );

  const handleQuickAdd = useCallback(
    async (title: string) => {
      try {
        await quickCreateDailyGoal(title);
        toast.success("Goal added!");
      } catch {
        toast.error("Failed to add goal");
      }
    },
    [quickCreateDailyGoal]
  );

  const handleToggle = useCallback(
    (id: number, completed: boolean) => {
      toggleDailyGoal(id, completed);
      if (completed) {
        toast.success("Goal completed! 🎯");
      }
    },
    [toggleDailyGoal]
  );

  const handleDeleteGoal = useCallback(
    (id: number) => {
      setDeleteData({ id, type: "daily_goal" });
    },
    []
  );

  const handleEditDailyGoalTitle = useCallback(
    async (id: number, title: string) => {
      try {
        await updateGoal(id, { goal_type: "daily_goal", title });
      } catch {
        toast.error("Failed to update goal");
      }
    },
    [updateGoal]
  );

  const handleCreateProject = useCallback(
    async (data: {
      title: string;
      description: string | null;
      priority: string;
      status: string;
      progress: number;
      deadline: string | null;
      subtasks: Milestone[];
    }) => {
      try {
        await createProject(data);
        toast.success("Project created!");
      } catch {
        toast.error("Failed to create project");
      }
    },
    [createProject]
  );

  const handleUpdateProject = useCallback(
    async (id: number, data: Partial<Project>) => {
      try {
        await updateProject(id, data);
      } catch {
        toast.error("Failed to update project");
      }
    },
    [updateProject]
  );

  const handleDeleteProject = useCallback(
    (id: number) => {
      setDeleteData({ id, type: "project" });
    },
    []
  );

  const confirmDelete = async () => {
    if (deleteData) {
      try {
        if (deleteData.type === "project") {
          await deleteProject(deleteData.id);
        } else {
          await deleteGoal(deleteData.id, deleteData.type);
        }
        toast.success("Deleted successfully");
      } catch {
        toast.error("Failed to delete");
      } finally {
        setDeleteData(null);
      }
    }
  };

  // ── Tab switching ──
  const tabs: { value: TabType; label: string }[] = [
    { value: "daily_goals", label: "Daily Goals" },
    { value: "projects", label: "Projects" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* ── Header ── */}
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          🎯 Goals & Projects
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">
          Track your daily habits and long-term achievements.
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0"
      >
        <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Daily Goals
            </span>
          </div>
          <AnimatedCounter
            value={activeDailyGoals}
            className="text-2xl font-extrabold text-foreground"
          />
        </div>
        <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Layers className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Active Projects
            </span>
          </div>
          <AnimatedCounter
            value={activeProjectsCount}
            className="text-2xl font-extrabold text-foreground"
          />
        </div>
        <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Current Streak
            </span>
          </div>
          <span className="text-2xl font-extrabold text-foreground">
            <AnimatedCounter value={stats?.streak || 0} suffix=" Days" />
          </span>
        </div>
        <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Trophy className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Success Rate
            </span>
          </div>
          <AnimatedCounter
            value={stats?.success_rate || 0}
            suffix="%"
            className="text-2xl font-extrabold text-foreground"
          />
        </div>
      </motion.div>

      {/* ── Segmented Tab Control + Search ── */}
      <div className="flex flex-col md:flex-row items-center gap-4 shrink-0">
        <div className="relative bg-card/60 backdrop-blur-md border border-border/40 rounded-2xl p-1 flex w-full md:w-auto">
          {/* Sliding indicator */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-xl bg-primary"
            initial={false}
            animate={{
              left: `calc(${tabs.findIndex((t) => t.value === activeTab)} * (100% / 3) + 4px)`,
              width: `calc(100% / 3 - 8px)`,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative z-10 flex-1 md:px-6 py-2 text-xs font-bold rounded-xl transition-colors duration-200 cursor-pointer whitespace-nowrap",
                activeTab === tab.value
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 w-full max-w-md md:ml-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
          <Input
            placeholder={`Search ${activeTab === "daily_goals" ? "daily goals" : activeTab === "projects" ? "projects" : "completed items"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-card/60 border-border/40 text-foreground w-full h-10 rounded-2xl focus-visible:ring-primary/40 text-xs placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="min-w-0">
        {isLoading ? (
          <GoalsSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            {/* ──────── DAILY GOALS TAB ──────── */}
            {activeTab === "daily_goals" && (
              <motion.div
                key="daily"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 pb-16"
              >
                {/* Dashboard Card */}
                <DailyGoalsDashboard
                  completed={completedDailyCount}
                  total={totalDailyCount}
                  streak={stats?.streak || 0}
                />

                {/* Quick Add */}
                <QuickAddGoal onAdd={handleQuickAdd} isAdding={isSaving} />

                {/* Goal Items */}
                {filteredDailyGoals.length > 0 ? (
                  <div className="space-y-2.5">
                    <AnimatePresence>
                      {filteredDailyGoals.map((goal) => (
                        <DailyGoalItem
                          key={goal.id}
                          goal={goal}
                          onToggle={handleToggle}
                          onDelete={handleDeleteGoal}
                          onEdit={handleEditDailyGoalTitle}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : debouncedSearch ? (
                  <div className="text-center py-12 text-muted-foreground text-sm font-medium">
                    No goals matching &quot;{debouncedSearch}&quot;
                  </div>
                ) : (
                  <GoalsEmptyState type="daily" />
                )}
              </motion.div>
            )}

            {/* ──────── PROJECTS TAB ──────── */}
            {activeTab === "projects" && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 pb-16"
              >
                {/* Dashboard Card */}
                <ProjectsDashboard
                  totalProjects={projects.length}
                  completedProjects={
                    projects.filter((p) => p.completed).length
                  }
                  activeProjects={activeProjectsCount}
                />

                {/* Project Creator */}
                <ProjectCreator
                  onCreateProject={handleCreateProject}
                  isCreating={isSaving}
                />

                {/* Project Cards */}
                {filteredProjects.length > 0 ? (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onUpdate={handleUpdateProject}
                          onDelete={handleDeleteProject}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : debouncedSearch ? (
                  <div className="text-center py-12 text-muted-foreground text-sm font-medium">
                    No projects matching &quot;{debouncedSearch}&quot;
                  </div>
                ) : (
                  <GoalsEmptyState type="projects" onAction={() => {}} />
                )}
              </motion.div>
            )}

            {/* ──────── COMPLETED TAB ──────── */}
            {activeTab === "completed" && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-3 pb-16"
              >
                {completedItems.length > 0 ? (
                  <AnimatePresence>
                    {completedItems.map((item) => {
                      if (
                        "goal_type" in item &&
                        (item as Goal).goal_type === "daily_goal"
                      ) {
                        return (
                          <DailyGoalItem
                            key={`dg-${item.id}`}
                            goal={item as Goal}
                            onToggle={handleToggle}
                            onDelete={handleDeleteGoal}
                            onEdit={handleEditDailyGoalTitle}
                          />
                        );
                      }
                      return (
                        <ProjectCard
                          key={`pr-${item.id}`}
                          project={item as Project}
                          onUpdate={handleUpdateProject}
                          onDelete={handleDeleteProject}
                        />
                      );
                    })}
                  </AnimatePresence>
                ) : (
                  <GoalsEmptyState type="completed" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Goal Editor Modal ── */}
      <GoalEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        goal={editingGoal}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={!!deleteData}
        onOpenChange={(open) => !open && setDeleteData(null)}
      >
        <AlertDialogContent className="bg-card/95 backdrop-blur-2xl border-border/40 text-foreground rounded-3xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">
              Delete{" "}
              {deleteData?.type === "daily_goal" ? "Daily Goal" : "Project"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm font-medium">
              This action cannot be undone. This will permanently remove this
              record from your metrics history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="bg-muted/40 border-border/40 text-foreground hover:bg-muted/60 rounded-xl text-sm h-10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm h-10 font-bold shadow-md"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
