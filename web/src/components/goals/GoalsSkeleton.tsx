"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GoalsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card/50 backdrop-blur-md border border-border/40 rounded-3xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-md" />
              <Skeleton className="w-20 h-3 rounded-md" />
            </div>
            <Skeleton className="w-16 h-7 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Dashboard Card Skeleton */}
      <div className="rounded-[28px] p-8 bg-gradient-to-br from-primary/20 to-purple-400/20 border border-border/20">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="w-32 h-6 rounded-lg bg-white/10" />
            <Skeleton className="w-48 h-4 rounded-lg bg-white/10" />
          </div>
          <Skeleton className="w-24 h-8 rounded-full bg-white/10" />
        </div>
        <div className="flex items-center gap-8">
          <Skeleton className="w-[140px] h-[140px] rounded-full bg-white/10" />
          <div className="flex-1 space-y-4">
            <Skeleton className="w-20 h-10 rounded-lg bg-white/10 mx-auto" />
            <Skeleton className="w-32 h-3 rounded-lg bg-white/10 mx-auto" />
            <div className="w-3/5 h-px bg-white/10 mx-auto" />
            <Skeleton className="w-20 h-10 rounded-lg bg-white/10 mx-auto" />
            <Skeleton className="w-32 h-3 rounded-lg bg-white/10 mx-auto" />
          </div>
        </div>
      </div>

      {/* Quick Add Skeleton */}
      <Skeleton className="w-full h-14 rounded-[20px]" />

      {/* List Items Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card/50 border border-border/40 rounded-2xl p-4 flex items-center gap-4"
          >
            <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
            <Skeleton className="flex-1 h-5 rounded-lg" />
            <Skeleton className="w-5 h-5 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
