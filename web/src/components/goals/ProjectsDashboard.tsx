"use client";

import { AnimatedCounter } from "./AnimatedCounter";
import { Rocket } from "lucide-react";
import { motion } from "framer-motion";

interface ProjectsDashboardProps {
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
}

export function ProjectsDashboard({
  totalProjects,
  completedProjects,
  activeProjects,
}: ProjectsDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-[28px] p-5 sm:p-7 md:p-8"
      style={{
        background: "linear-gradient(135deg, #8B5CF6 0%, #C084FC 50%, #DDD6FE 100%)",
      }}
    >
      {/* Decorative blur blobs */}
      <div className="absolute top-[-30px] right-[-30px] w-[120px] h-[120px] rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-[-20px] left-[-20px] w-[100px] h-[100px] rounded-full bg-violet-300/10 blur-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-xl font-extrabold" style={{ color: '#ffffff' }}>Active Projects</h3>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Track your long-term roadmap
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3.5 py-1.5 rounded-full"
        >
          <Rocket className="w-4 h-4 text-white" />
          <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
            <AnimatedCounter value={activeProjects} /> Active
          </span>
        </motion.div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="flex-1 text-center">
          <div className="text-4xl font-black leading-none" style={{ color: '#ffffff' }}>
            <AnimatedCounter value={totalProjects} />
          </div>
          <div className="text-xs font-bold mt-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Total Projects
          </div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-4xl font-black leading-none" style={{ color: '#ffffff' }}>
            <AnimatedCounter value={completedProjects} />
          </div>
          <div className="text-xs font-bold mt-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Completed
          </div>
        </div>
      </div>
    </motion.div>
  );
}
