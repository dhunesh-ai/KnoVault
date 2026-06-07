 
"use client";

import { useEffect, useState, useMemo } from "react";
import { useMedicineStore } from "@/store/useMedicineStore";
import { MedicineCard } from "@/components/medicine/MedicineCard";
import { MedicineEditor } from "@/components/medicine/MedicineEditor";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pill, CheckCircle2, Clock, CalendarDays } from "lucide-react";
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
import { isToday, format } from "date-fns";
import { cn } from "@/lib/utils";
import { MedicinePayload } from "@/types/Medicine";

export default function MedicinePage() {
  const {
    courses,
    reminders,
    isLoading,
    fetchMedicines,
    deleteMedicineSeries,
    markDoseComplete,
  } = useMedicineStore();

  const [activeTab, setActiveTab] = useState<string>("courses");
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  // Derive today's doses from the reminders
  const todaysDoses = useMemo(() => {
    const today = new Date();
    return reminders
      .filter((r) => isToday(new Date(r.reminder_date)))
      .sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime());
  }, [reminders]);

  const confirmDelete = async () => {
    if (deleteSeriesId) {
      try {
        await deleteMedicineSeries(deleteSeriesId);
        toast.success("Medicine course deleted");
      } catch (e) {
        // Handled
      } finally {
        setDeleteSeriesId(null);
      }
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Medicine <Pill className="w-6 h-6 text-emerald-400" />
          </h1>
          <p className="text-muted-foreground mt-1">Track your prescriptions and daily dosages.</p>
        </div>
        <Button onClick={() => setEditorOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-foreground shadow-[0_0_15px_rgba(16,185,129,0.4)]">
          <Plus className="w-4 h-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-card border border-border p-1 w-full flex">
            <TabsTrigger value="courses" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-foreground flex-1">
              My Courses
            </TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-blue-500 data-[state=active]:text-foreground flex-1 flex items-center gap-2">
              Today's Doses
              {todaysDoses.filter(d => !d.is_completed).length > 0 && (
                <span className="bg-blue-600 text-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {todaysDoses.filter(d => !d.is_completed).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : activeTab === "courses" ? (
          courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
              <Pill className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-foreground mb-2">No active medicines</h3>
              <p className="max-w-xs mb-4">You haven't added any medication courses yet.</p>
              <Button variant="outline" className="border-border text-foreground" onClick={() => setEditorOpen(true)}>
                Add your first course
              </Button>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-16"
            >
              <AnimatePresence>
                {courses.map((course) => (
                  <motion.div
                    key={course.series_id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MedicineCard
                      course={course}
                      onDelete={(id) => setDeleteSeriesId(id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )
        ) : (
          /* Today's Doses View */
          <div className="max-w-2xl mx-auto space-y-4 pb-16">
            <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
              <div className="flex items-center gap-3 text-blue-400">
                <CalendarDays className="w-5 h-5" />
                <span className="font-semibold">{format(new Date(), 'EEEE, MMMM do')}</span>
              </div>
              <div className="text-sm text-blue-400 font-medium">
                {todaysDoses.filter(d => d.is_completed).length} of {todaysDoses.length} completed
              </div>
            </div>

            {todaysDoses.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border border-border rounded-xl border-dashed">
                <p>No doses scheduled for today.</p>
              </div>
            ) : (
              todaysDoses.map((dose) => {
                let payload: MedicinePayload | null = null;
                try {
                  if (dose.description) payload = JSON.parse(dose.description);
                } catch (e) {}

                return (
                  <div 
                    key={dose.id} 
                    className={cn(
                      "flex items-center p-4 rounded-xl border transition-all duration-300",
                      dose.is_completed 
                        ? "bg-muted border-border opacity-60" 
                        : "bg-card border-border hover:border-blue-500/30"
                    )}
                  >
                    <button
                      onClick={() => markDoseComplete(dose.id, !dose.is_completed)}
                      className="mr-4 focus:outline-none"
                    >
                      {dose.is_completed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-zinc-500 hover:border-blue-500 transition-colors" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <h4 className={cn("font-semibold text-foreground", dose.is_completed && "line-through text-muted-foreground")}>
                        {payload?.medName || dose.title.replace('💊 Take ', '')}
                      </h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="text-blue-400 font-medium">{format(new Date(dose.reminder_date), 'h:mm a')}</span>
                        <span>•</span>
                        <span>{payload?.timing || "Dose"}</span>
                        {payload?.dosage && (
                          <>
                            <span>•</span>
                            <span>{payload.dosage}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <MedicineEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />

      <AlertDialog open={!!deleteSeriesId} onOpenChange={(open) => !open && setDeleteSeriesId(null)}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine Course?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will delete the entire course and all associated reminders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-foreground">
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
