 
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
    <div className="space-y-6 flex flex-col h-[calc(100vh-6.5rem)] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            🎯 Goals & Projects
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Manage daily habit streaks and long-term milestones.</p>
        </div>
        <Button 
          onClick={handleCreate} 
          className="bg-primary hover:bg-primary/95 text-white shadow-[0_4px_16px_rgba(124,77,255,0.25)] rounded-2xl h-10 px-5 font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Goal
        </Button>
      </div>

      {/* Analytics Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Daily Goals</span>
            </div>
            <span className="text-2xl font-extrabold text-foreground">{activeDailyGoals}</span>
          </div>
          <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Projects</span>
            </div>
            <span className="text-2xl font-extrabold text-foreground">{activeProjects}</span>
          </div>
          <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Current Streak</span>
            </div>
            <span className="text-2xl font-extrabold text-foreground">{String(stats.streak || 0)} Days</span>
          </div>
          <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Trophy className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Success Rate</span>
            </div>
            <span className="text-2xl font-extrabold text-foreground">{String(stats.success_rate || 0)}%</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-4 shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="bg-card/55 border border-border/40 p-1 flex w-full md:w-auto gap-1 rounded-2xl">
            <TabsTrigger value="daily_goals" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl text-xs font-bold flex-1 md:flex-none py-1.5 px-4 cursor-pointer">Daily Goals</TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-xl text-xs font-bold flex-1 md:flex-none py-1.5 px-4 cursor-pointer">Active Projects</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-accent data-[state=active]:text-foreground rounded-xl text-xs font-bold flex-1 md:flex-none py-1.5 px-4 cursor-pointer">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative flex-1 w-full max-w-md ml-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
          <Input
            placeholder={`Search ${activeTab === "daily_goals" ? "daily habits" : "projects"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-card border-border/40 text-foreground w-full h-10 rounded-2xl focus-visible:ring-primary/40 text-xs placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Target className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No goals found</h3>
            <p className="text-xs text-muted-foreground max-w-xs">You don't have any pending target milestones matching this filter.</p>
            <Button variant="link" className="text-primary mt-2 text-xs font-bold" onClick={handleCreate}>
              Create a Goal
            </Button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-16"
          >
            <AnimatePresence>
              {filteredGoals.map((goal) => (
                <motion.div
                  key={`${goal.goal_type}-${goal.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="h-[230px]"
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
        <AlertDialogContent className="bg-card/90 backdrop-blur-2xl border-border/50 text-foreground rounded-3xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-lg">Delete {deleteData?.type === "daily_goal" ? "Daily Goal" : "Project"}?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs font-medium">
              This action cannot be undone. This will permanently remove this record from your metrics history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="bg-accent/40 border-border/40 text-foreground hover:bg-accent/60 rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs h-9 font-bold shadow-md">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
