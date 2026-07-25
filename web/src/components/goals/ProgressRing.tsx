"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  textColor?: string;
  trackColor?: string;
  progressColor?: string;
  className?: string;
}

export function ProgressRing({
  completed,
  total,
  size = 140,
  strokeWidth = 10,
  textColor = "#FFFFFF",
  trackColor = "rgba(255,255,255,0.2)",
  progressColor = "#FFFFFF",
  className,
}: ProgressRingProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
          }}
        />
      </svg>
      {/* Center Text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ color: textColor }}
      >
        <span className="text-3xl font-black leading-none">{percentage}%</span>
        <span className="text-[10px] font-semibold opacity-80 mt-1 uppercase tracking-wider">
          Complete
        </span>
      </div>
    </div>
  );
}
