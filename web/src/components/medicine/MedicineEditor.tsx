"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMedicineStore } from "@/store/useMedicineStore";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { format } from "date-fns";
import { DateTimePicker } from "@/components/reminders/DateTimePicker";

const TIMING_OPTIONS = [
  "Breakfast 🍳", "Lunch 🍱", "Evening ☕", "Dinner 🍲", "Night 🌙", "Bedtime 🛏️"
];

const medicineSchema = z.object({
  medName: z.string().min(1, "Name is required"),
  medType: z.string().min(1),
  dosage: z.string().min(1),
  foodTiming: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  start_date: z.string().min(1),
  timings: z.array(z.string()).min(1, "Select at least one timing"),
  timing_times: z.record(z.string(), z.string()).optional(),
});

type MedicineFormValues = z.infer<typeof medicineSchema>;

interface MedicineEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MedicineEditor({ open, onOpenChange }: MedicineEditorProps) {
  const { createMedicine } = useMedicineStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      medName: "",
      medType: "Tablet 💊",
      dosage: "1 tablet",
      foodTiming: "After Food",
      frequency: "Daily",
      duration: "5 days",
      start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      timings: ["Breakfast 🍳"],
      timing_times: {
        "Breakfast 🍳": "08:00 AM",
        "Lunch 🍱": "01:00 PM",
        "Evening ☕": "05:00 PM",
        "Dinner 🍲": "08:00 PM",
        "Night 🌙": "10:00 PM",
        "Bedtime 🛏️": "11:00 PM"
      }
    },
  });

  const onSubmit = async (data: MedicineFormValues) => {
    setIsSubmitting(true);
    try {
      // We format this into the payload expected by the backend generate_medicine_reminders logic
      const d = new Date(data.start_date);
      
      const payload = {
        title: `💊 Take ${data.medName}`,
        type: "medicine",
        reminder_date: d.toISOString(),
        description: JSON.stringify({
          isMedicine: true,
          medName: data.medName,
          medType: data.medType,
          dosage: data.dosage,
          foodTiming: data.foodTiming,
          frequency: data.frequency,
          duration: data.duration,
          timings: data.timings,
          timing_times: data.timing_times
        })
      };

      await createMedicine(payload);
      toast.success("Medicine course created");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border text-foreground p-0">
        <DialogHeader className="p-6 pb-2 border-b border-border">
          <DialogTitle>Add New Medication</DialogTitle>
          <DialogDescription className="sr-only">
            Fill out the details to add a new medicine
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medicine Name</Label>
              <Input
                {...form.register("medName")}
                placeholder="e.g. Amoxicillin"
                className="bg-card border-border"
              />
              {form.formState.errors.medName && (
                <p className="text-red-400 text-sm">{form.formState.errors.medName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Controller
                name="start_date"
                control={form.control}
                render={({ field }) => (
                  <DateTimePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : "")}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select onValueChange={(v) => form.setValue("medType", v)} defaultValue={form.getValues("medType")}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="Tablet 💊">Tablet</SelectItem>
                  <SelectItem value="Syrup 🥄">Syrup</SelectItem>
                  <SelectItem value="Injection 💉">Injection</SelectItem>
                  <SelectItem value="Drops 💧">Drops</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dosage</Label>
              <Input
                {...form.register("dosage")}
                placeholder="e.g. 500mg or 1 tablet"
                className="bg-card border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Food Timing</Label>
              <Select onValueChange={(v) => form.setValue("foodTiming", v)} defaultValue={form.getValues("foodTiming")}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="Before Food">Before Food</SelectItem>
                  <SelectItem value="After Food">After Food</SelectItem>
                  <SelectItem value="With Food">With Food</SelectItem>
                  <SelectItem value="Anytime">Anytime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                {...form.register("duration")}
                placeholder="e.g. 5 days, 1 week, 30 days"
                className="bg-card border-border"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Schedule Timings</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller
                name="timings"
                control={form.control}
                render={({ field }) => (
                  <>
                    {TIMING_OPTIONS.map((timing) => {
                      const isChecked = field.value.includes(timing);
                      return (
                        <div key={timing} className="flex flex-col gap-2 bg-muted/50 p-3 rounded-lg border border-border">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, timing]);
                                } else {
                                  field.onChange(field.value.filter((t: string) => t !== timing));
                                }
                              }}
                            />
                            <span className="text-sm font-medium">{timing}</span>
                          </label>
                          
                          {isChecked && (
                            <div className="pl-6 pt-1">
                              <Input
                                type="time"
                                value={
                                  // Convert "08:00 AM" back to "08:00" for input[type="time"]
                                  (() => {
                                    const raw = form.getValues(`timing_times.${timing}`) || "08:00 AM";
                                    const [time, modifier] = raw.split(" ");
                                    let [hours, minutes] = time.split(":");
                                    if (modifier === "PM" && hours !== "12") hours = String(parseInt(hours, 10) + 12).padStart(2, '0');
                                    if (modifier === "AM" && hours === "12") hours = "00";
                                    return `${hours}:${minutes}`;
                                  })()
                                }
                                onChange={(e) => {
                                  const val = e.target.value; // "14:30"
                                  const [h, m] = val.split(":");
                                  let modifier = "AM";
                                  let hourNum = parseInt(h, 10);
                                  if (hourNum >= 12) {
                                    modifier = "PM";
                                    if (hourNum > 12) hourNum -= 12;
                                  } else if (hourNum === 0) {
                                    hourNum = 12;
                                  }
                                  const formatted = `${String(hourNum).padStart(2, '0')}:${m} ${modifier}`;
                                  form.setValue(`timing_times.${timing}`, formatted);
                                }}
                                className="w-full bg-background h-8 text-xs [color-scheme:dark]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              />
            </div>
            {form.formState.errors.timings && (
              <p className="text-red-400 text-sm">{form.formState.errors.timings.message}</p>
            )}
          </div>

          <DialogFooter className="pt-6 border-t border-border">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-foreground shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
