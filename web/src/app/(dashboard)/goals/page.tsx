 
"use client";

import { useEffect, useState, useMemo } from "react";
import { useGoalsStore } from "@/store/useGoalsStore";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalEditor } from "@/components/goals/GoalEditor";
import { GoalProfile } from "@/components/goals/GoalProfile";
import { Goal } from "@/types/Goal";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Target, Search, Activity, Trophy, Flame, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GoalsPage() {
  const {
    goals,
    stats,
    isLoading,
    fetchGoals,
    deleteGoal,
  } = useGoalsStore();

  const [activeTab, setActiveTab] = useState<string>("daily_goals");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  
  const [deleteData, setDeleteData] = useState<{ id: number; type: "daily_goal" | "project" } | null>(null);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    if (selectedGoal && goals.length > 0) {
      const updated = goals.find(g => g.id === selectedGoal.id && g.goal_type === selectedGoal.goal_type);
      if (updated) setSelectedGoal(updated);
    }
  }, [goals, selectedGoal]);

  const filteredGoals = useMemo(() => {
    let filtered = goals;
    
    if (debouncedSearch) {
      const lowerQ = debouncedSearch.toLowerCase();
      filtered = filtered.filter(g => 
        g.title.toLowerCase().includes(lowerQ) || 
        (g.description && g.description.toLowerCase().includes(lowerQ))
      );
    }

    if (activeTab === "daily_goals") {
      filtered = filtered.filter(g => g.goal_type === "daily_goal" && !g.completed);
    } else if (activeTab === "projects") {
      filtered = filtered.filter(g => g.goal_type === "project" && g.status !== "Completed" && (g.progress ?? 0) < 100 && !g.completed);
    } else if (activeTab === "completed") {
      filtered = filtered.filter(g => g.completed || g.status === "Completed" || (g.progress ?? 0) >= 100);
    }
    
    return filtered;
  }, [goals, debouncedSearch, activeTab]);

  const handleCreate = () => {
    setEditingGoal(null);
    setEditorOpen(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditorOpen(true);
    setProfileOpen(false);
  };

  const handleViewProfile = (goal: Goal) => {
    setSelectedGoal(goal);
    setProfileOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteData) {
      try {
        await deleteGoal(deleteData.id, deleteData.type);
        toast.success("Goal deleted");
        if (selectedGoal?.id === deleteData.id && selectedGoal?.goal_type === deleteData.type) {
          setProfileOpen(false);
        }
      } catch (e) {
        // Handled in store
      } finally {
        setDeleteData(null);
      }
    }
  };

  const activeDailyGoals = goals.filter(g => g.goal_type === "daily_goal" && !g.completed).length;
  const activeProjects = goals.filter(g => g.goal_type === "project" && !g.completed && g.status !== "Completed").length;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            🎯 Goals & Projects
          </h1>
          <p className="text-muted-foreground mt-1">Manage daily habits and long-term ambitions.</p>
        </div>
        <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700 text-foreground shadow-[0_0_15px_rgba(147,51,234,0.4)]">
          <Plus className="w-4 h-4 mr-2" />
          Create Goal
        </Button>
      </div>

      {/* Analytics Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium uppercase">Daily Goals</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{activeDailyGoals}</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium uppercase">Projects</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{activeProjects}</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-medium uppercase">Current Streak</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{String(stats.streak || 0)} Days</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Trophy className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium uppercase">Completion Rate</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{String(stats.success_rate || 0)}%</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-4 shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="bg-card border border-border p-1 flex w-full md:w-auto">
            <TabsTrigger value="daily_goals" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-foreground flex-1 md:flex-none">Daily Goals</TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-purple-500 data-[state=active]:text-foreground flex-1 md:flex-none">Active Projects</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-accent data-[state=active]:text-foreground flex-1 md:flex-none">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative flex-1 w-full max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab === "daily_goals" ? "daily habits" : "projects"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border text-foreground w-full focus-visible:ring-purple-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
            <Target className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-medium text-foreground mb-2">No goals found</h3>
            <p className="max-w-xs mb-4">You haven't added any goals matching this filter.</p>
            <Button variant="outline" className="border-border text-foreground" onClick={handleCreate}>
              Create a Goal
            </Button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-16"
          >
            <AnimatePresence>
              {filteredGoals.map((goal) => (
                <motion.div
                  key={`${goal.goal_type}-${goal.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="h-[220px]"
                >
                  <GoalCard
                    goal={goal}
                    onClick={handleViewProfile}
                    onEdit={handleEdit}
                    onDelete={(id, type) => setDeleteData({ id, type })}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <GoalEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        goal={editingGoal}
      />

      <GoalProfile
        open={profileOpen}
        onOpenChange={setProfileOpen}
        goal={selectedGoal}
        onEdit={handleEdit}
        onDelete={(id, type) => setDeleteData({ id, type })}
      />

      <AlertDialog open={!!deleteData} onOpenChange={(open) => !open && setDeleteData(null)}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteData?.type === "daily_goal" ? "Daily Goal" : "Project"}?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently remove this record from your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
