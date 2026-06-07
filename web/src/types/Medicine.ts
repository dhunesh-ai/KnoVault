export interface MedicinePayload {
  isMedicine: boolean;
  medName: string;
  medType: string;
  dosage: string;
  foodTiming: string;
  frequency: string;
  timings: string[];
  timing_times?: Record<string, string>;
  timing?: string;
  day_number?: number;
  total_days?: number;
  series_id?: string;
  notes?: string;
  is_completed?: boolean;
}

export interface MedicineCourse {
  series_id: string;
  medName: string;
  medType: string;
  dosage: string;
  foodTiming: string;
  frequency: string;
  timings: string[];
  durationDays: number;
  startDate: string;
  endDate: string;
  notes?: string;
  totalDoses: number;
  completedDoses: number;
  nextDose?: {
    id: number;
    timing: string;
    date: string;
  };
  remainingDays: number;
  remainingDosesToday: number;
}
