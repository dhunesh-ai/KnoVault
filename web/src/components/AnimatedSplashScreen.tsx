"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  FileText,
  Calendar,
  Target,
  Rocket,
  Bell,
  Bot,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

const MOTIVATIONAL_QUOTES = [
  "Small steps today, big achievements tomorrow.",
  "Capture. Organize. Achieve.",
  "Turn information into intelligence.",
  "Build your second brain.",
];

const ORBIT_BADGES = [
  { icon: FileText, label: "Notes", color: "from-purple-500 to-indigo-600", angle: 0 },
  { icon: Calendar, label: "Calendar", color: "from-pink-500 to-rose-600", angle: 60 },
  { icon: Target, label: "Goals", color: "from-emerald-500 to-teal-600", angle: 120 },
  { icon: Rocket, label: "Projects", color: "from-blue-500 to-cyan-600", angle: 180 },
  { icon: Bell, label: "Reminders", color: "from-amber-500 to-orange-600", angle: 240 },
  { icon: Bot, label: "AI Assistant", color: "from-cyan-400 to-blue-600", angle: 300 },
];

interface AnimatedSplashScreenProps {
  onFinish?: () => void;
  autoPlay?: boolean;
}

export default function AnimatedSplashScreen({
  onFinish,
  autoPlay = true,
}: AnimatedSplashScreenProps) {
  const [phase, setPhase] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // ── Web Audio Synth Effects ──────────────────────────────────────────
  const playSynthTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    if (!audioEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const playStartupChime = () => {
    playSynthTone(523.25, "sine", 0.8, 0.12); // C5
    setTimeout(() => playSynthTone(659.25, "sine", 0.8, 0.12), 150); // E5
    setTimeout(() => playSynthTone(783.99, "triangle", 1.2, 0.15), 300); // G5
  };

  const playBulbClick = () => {
    playSynthTone(1200, "square", 0.08, 0.08);
  };

  const playMagicSparkle = () => {
    [880, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
      setTimeout(() => playSynthTone(f, "sine", 0.4, 0.06), i * 80);
    });
  };

  // ── Master Animation Timeline ────────────────────────────────────────
  const runSequence = () => {
    setPhase(1);
    setProgress(0);
    setQuoteIndex(0);

    playStartupChime();

    // Phase 2: Smart Glass Bulb & Light Rays (1.0s)
    setTimeout(() => {
      setPhase(2);
      playBulbClick();
    }, 1000);

    // Phase 3: KnoVault Mascot & Magic Book & Orbiting Badges (2.2s)
    setTimeout(() => {
      setPhase(3);
      playMagicSparkle();
    }, 2200);

    // Phase 4: Logo Reveal & Brand Typography (3.4s)
    setTimeout(() => {
      setPhase(4);
      playStartupChime();
    }, 3400);

    // Phase 5: Productivity Progress & Rotating Quotes (4.5s)
    setTimeout(() => {
      setPhase(5);

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 4;
        });
      }, 70);

      const quoteInterval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
      }, 1300);

      // Finish Timer
      setTimeout(() => {
        clearInterval(interval);
        clearInterval(quoteInterval);
        setPhase(6);
        if (onFinish) onFinish();
      }, 2200);
    }, 4500);
  };

  useEffect(() => {
    if (autoPlay) {
      runSequence();
    }
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-between w-full h-screen min-h-[650px] bg-[#070814] text-slate-100 overflow-hidden select-none font-sans">
      {/* ── BACKGROUND GRADIENT & GRID ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070814] via-[#0D0F2A] to-[#050612] z-0" />

      {/* Ambient Mesh Glow */}
      <motion.div
        animate={{
          scale: phase >= 2 ? [1, 1.2, 1.1] : 0.8,
          opacity: phase >= 1 ? [0.4, 0.7, 0.5] : 0.2,
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-purple-600/30 via-indigo-500/20 to-cyan-400/0 blur-3xl pointer-events-none z-0"
      />

      {/* Floating Sparkles Array */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[
          { top: "20%", left: "15%", color: "text-purple-400" },
          { top: "35%", left: "80%", color: "text-cyan-400" },
          { top: "70%", left: "25%", color: "text-pink-400" },
          { top: "75%", left: "75%", color: "text-amber-400" },
          { top: "15%", left: "60%", color: "text-emerald-400" },
        ].map((sp, idx) => (
          <motion.div
            key={idx}
            animate={{
              y: [-8, 8, -8],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{ duration: 3 + idx, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute ${sp.color}`}
            style={{ top: sp.top, left: sp.left }}
          >
            <Sparkles className="w-5 h-5 opacity-80" />
          </motion.div>
        ))}
      </div>

      {/* ── 1. TOP HEADER / CONTROL BAR ── */}
      <div className="relative z-20 flex items-center justify-between w-full max-w-5xl px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
            KnoVault Personal Knowledge OS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            title="Toggle Audio Feedback"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={runSequence}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay
          </button>
        </div>
      </div>

      {/* ── 2. MAIN CENTER HERO STAGE ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl px-4">
        {/* PHASE 2: SMART GLASS BULB */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ y: -120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 14 }}
              className="relative flex flex-col items-center mb-6"
            >
              {/* Cord */}
              <div className="w-0.5 h-10 bg-gradient-to-b from-transparent to-slate-400/40" />

              {/* Light Ray Radial Bloom */}
              <motion.div
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: phase >= 2 ? [1, 1.4, 1.2] : 0.2, opacity: phase >= 2 ? 0.8 : 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute top-8 w-48 h-48 rounded-full bg-gradient-to-r from-amber-400/40 via-purple-500/30 to-cyan-400/0 blur-2xl pointer-events-none"
              />

              {/* SVG Bulb */}
              <div className="relative w-16 h-20 filter drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                <svg viewBox="0 0 70 90" className="w-full h-full">
                  <rect x="27" y="0" width="16" height="12" rx="2" fill="#94A3B8" />
                  <path
                    d="M 35 14 C 20 14 12 28 12 45 C 12 58 24 68 28 76 C 30 80 40 80 42 76 C 46 68 58 58 58 45 C 58 28 50 14 35 14 Z"
                    fill="url(#webBulbGrad)"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 28 45 L 31 30 L 35 38 L 39 30 L 42 45"
                    fill="none"
                    stroke="#FFFBEB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-pulse"
                  />
                  <defs>
                    <linearGradient id="webBulbGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 3: KNOVAULT MASCOT & MAGIC BOOK & ORBITING BADGES */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="relative flex items-center justify-center w-64 h-64 mb-6"
            >
              {/* Orbit Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-purple-500/20 rounded-full"
              >
                {ORBIT_BADGES.map((b, i) => {
                  const rad = (b.angle * Math.PI) / 180;
                  const x = 110 * Math.cos(rad);
                  const y = 110 * Math.sin(rad);
                  const Icon = b.icon;

                  return (
                    <motion.div
                      key={i}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute top-1/2 left-1/2 -mt-5 -ml-5 w-10 h-10 rounded-full bg-slate-900/80 border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center text-white bg-gradient-to-tr ${b.color}`}
                      title={b.label}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Mascot Sphere */}
              <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-400 border-2 border-white/40 shadow-[0_0_35px_rgba(139,92,246,0.6)]">
                <div className="flex flex-col items-center">
                  <div className="flex gap-3 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  </div>
                  <div className="w-4 h-1.5 border-b-2 border-white rounded-full" />
                </div>

                {/* Magic Book in Hands */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="absolute -bottom-3 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-purple-600 border border-white/40 shadow-xl flex items-center gap-1.5 text-xs font-bold text-white"
                >
                  <BookOpen className="w-4 h-4 text-amber-200 animate-pulse" />
                  <span>KnoBook</span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 4: LOGO REVEAL & SUBTITLE */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center text-center mb-6"
            >
              {/* Glass Plate */}
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-xl shadow-2xl">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-white to-purple-300">
                  KnoVault
                </h1>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mt-3 text-xs sm:text-sm font-bold tracking-[0.25em] text-slate-400 uppercase"
              >
                Your Knowledge. Your Vault. Your Success.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. BOTTOM PROGRESS RING & ROTATING QUOTES ── */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-xl px-6 pb-8">
        <AnimatePresence>
          {phase >= 5 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center w-full"
            >
              {/* SVG Circular Progress */}
              <div className="relative flex items-center justify-center w-14 h-14 mb-3">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" fill="none" />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    stroke="url(#progressGrad)"
                    strokeWidth="3.5"
                    strokeDasharray="138"
                    strokeDashoffset={138 - (138 * progress) / 100}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-150"
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-[11px] font-bold text-slate-200">{progress}%</span>
              </div>

              {/* Motivational Quote */}
              <div className="h-10 flex items-center justify-center text-center">
                <motion.p
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs sm:text-sm font-medium italic text-slate-300"
                >
                  "{MOTIVATIONAL_QUOTES[quoteIndex]}"
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip Action Button */}
        {onFinish && (
          <button
            onClick={onFinish}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
