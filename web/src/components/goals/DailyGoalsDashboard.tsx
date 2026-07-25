"use client";

import { ProgressRing } from "./ProgressRing";
import { AnimatedCounter } from "./AnimatedCounter";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface DailyGoalsDashboardProps {
  completed: number;
  total: number;
  streak: number;
}

export function DailyGoalsDashboard({
  completed,
  total,
  streak,
}: DailyGoalsDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-[28px] p-5 sm:p-7 md:p-8"
      style={{
        background: "linear-gradient(135deg, #6D4CFF 0%, #8E5CFF 50%, #A78BFA 100%)",
      }}
    >
      {/* Decorative blur blobs */}
      <div className="absolute top-[-30px] right-[-30px] w-[120px] h-[120px] rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-[-20px] left-[-20px] w-[100px] h-[100px] rounded-full bg-purple-300/10 blur-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-xl font-extrabold" style={{ color: '#ffffff' }}>Daily Goals</h3>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Track your daily achievements
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full"
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
            <AnimatedCounter value={streak} /> Days
          </span>
        </motion.div>
      </div>

      {/* Progress Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-10 relative z-10">
        <ProgressRing
          completed={completed}
          total={total}
          size={140}
          strokeWidth={10}
          textColor="#FFFFFF"
          trackColor="rgba(255,255,255,0.2)"
          progressColor="#FFFFFF"
        />

        <div className="flex-1 flex flex-col items-center gap-5">
          <div className="text-center">
            <div className="text-3xl font-black leading-none" style={{ color: '#ffffff' }}>
              <AnimatedCounter value={completed} />
            </div>
            <div className="text-xs font-semibold mt-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Completed
            </div>
          </div>
          <div className="w-3/5 h-px bg-white/20" />
          <div className="text-center">
            <div className="text-3xl font-black leading-none" style={{ color: '#ffffff' }}>
              <AnimatedCounter value={total} />
            </div>
            <div className="text-xs font-semibold mt-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Total Tasks
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
