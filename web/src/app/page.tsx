"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import { 
  Sparkles, 
  Mic, 
  Lock, 
  FolderGit2, 
  Target, 
  Calendar, 
  Gift, 
  Pill, 
  Cloud, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Play, 
  ChevronDown, 
  Smartphone, 
  Globe, 
  Cpu, 
  Laptop, 
  ShieldCheck,
  Check,
  Star,
  Users,
  Menu,
  X,
  Flame,
  Volume2,
  Send,
  Zap,
  Bookmark,
  ChevronRight,
  TrendingUp,
  Clock,
  Fingerprint,
  ChevronLeft,
  Mail,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Trusted Partners Mockup Logos
const TRUSTED_PARTNERS = [
  { name: "Y Combinator", logo: "YC" },
  { name: "Product Hunt", logo: "Product Hunt" },
  { name: "Vercel", logo: "Vercel" },
  { name: "Stripe", logo: "Stripe" },
  { name: "Linear", logo: "Linear" },
  { name: "Notion", logo: "Notion" }
];

const FEATURES_LIST = [
  { title: "AI Assistant", desc: "A smart copilot trained on your workspace to answer queries and summarize logs.", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10", border: "hover:border-purple-500/30" },
  { title: "Voice Notes", desc: "Speak naturally and receive instant, high-quality speech transcriptions.", icon: Mic, color: "text-rose-500", bg: "bg-rose-500/10", border: "hover:border-rose-500/30" },
  { title: "Secure Notes", desc: "E2E encrypted secure notes guarded by biometric passcode locks.", icon: Lock, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/30" },
  { title: "Projects Kanban", desc: "Track tasks, tag priorities, assign members, and manage checklists.", icon: FolderGit2, color: "text-blue-500", bg: "bg-blue-500/10", border: "hover:border-blue-500/30" },
  { title: "Goal Milestones", desc: "Establish shared milestones and trace completion streak rates.", icon: Target, color: "text-amber-500", bg: "bg-amber-500/10", border: "hover:border-amber-500/30" },
  { title: "Smart Calendar", desc: "Schedule meetings and trigger automatic conflict locator reports.", icon: Calendar, color: "text-sky-500", bg: "bg-sky-500/10", border: "hover:border-sky-500/30" },
  { title: "Special Days", desc: "Log anniversaries, birthdays, and upcoming milestones with ease.", icon: Gift, color: "text-pink-500", bg: "bg-pink-500/10", border: "hover:border-pink-500/30" },
  { title: "Medicine Tracker", desc: "Log active medical doses and reset routine logs daily on login.", icon: Pill, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "hover:border-indigo-500/30" },
  { title: "Cloud Backup", desc: "Offline database caches synced safely on network recovery.", icon: Cloud, color: "text-teal-500", bg: "bg-teal-500/10", border: "hover:border-teal-500/30" },
  { title: "Leaderboard Analytics", desc: "Compare productivity scores among team workspace members.", icon: Activity, color: "text-violet-500", bg: "bg-violet-500/10", border: "hover:border-violet-500/30" },
];

const FAQS = [
  { q: "Is KnoVault really end-to-end encrypted?", a: "Yes. KnoVault encrypts all Secure Notes client-side before synchronization. The plaintext values are never uploaded to the cloud and remain entirely hidden from the AI assistant." },
  { q: "How does the AI Assistant analyze my database?", a: "The assistant reads your active workspace metadata (tasks, notes, events, goals) as context files. It automatically ignores notes flagged with category 'Secure' to maintain absolute privacy." },
  { q: "What happens when storage exceeds 5 MB?", a: "The web client tracks your local storage capacity. If local caches approach 5 MB, KnoVault prompts you to sync to database cloud storage to keep local operations responsive." },
  { q: "Can I coordinate with a team?", a: "Yes. Workspaces allow you to invite team members with specific roles (Owner, Admin, Member, Viewer) to share Kanban, wiki documents, and calendar updates." },
];

const TESTIMONIALS = [
  { name: "Sarah Jenkins", role: "Lead Product Manager", quote: "The AI summary feature is a game-changer for project meetings. Plus, I can safely store credentials knowing secure notes are truly isolated.", stars: 5, initial: "S" },
  { name: "David Miller", role: "Software Architect", quote: "KnoVault unified my goals, checklists, and calendar notes. The 5 MB local storage check ensures my browser stays lightweight and responsive.", stars: 5, initial: "D" },
  { name: "Elena Rostova", role: "Digital Designer", quote: "Having access to collaborative workspaces with kanbans, meeting minutes, and brainstorm boards in one client package completely replaced Notion.", stars: 5, initial: "E" },
  { name: "Marcus Chen", role: "Tech Founder", quote: "Absolute masterpiece. The end-to-end encryption details are incredibly solid, and the AI chatbot helps me recap sprints in seconds.", stars: 5, initial: "M" }
];

// Count-Up Animation Component
function AnimatedCounter({ value, suffix = "", duration = 1.5 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = value;
      if (start === end) return;

      const totalMiliseconds = duration * 1000;
      const incrementTime = 25;
      const steps = totalMiliseconds / incrementTime;
      const increment = (end - start) / steps;

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          clearInterval(timer);
          setCount(end);
        } else {
          setCount(Math.floor(start));
        }
      }, incrementTime);

      return () => clearInterval(timer);
    }
  }, [isInView, value, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// macOS Premium Browser Mockup Wrapper
function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full bg-[#111827] rounded-[24px] p-1.5 shadow-[0_30px_70px_rgba(0,0,0,0.18)] border border-white/10 relative overflow-hidden">
      {/* Top address bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/60 rounded-t-[18px] border-b border-white/5">
        <div className="flex gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
        </div>
        <div className="bg-[#1F2937] border border-white/5 rounded-full px-8 py-1 text-[9px] text-gray-400 font-bold w-2/5 text-center truncate">
          https://knovault.app/dashboard
        </div>
        <div className="w-8" />
      </div>
      {/* Browser Body */}
      <div className="bg-[#FAFAFC] rounded-b-[18px] min-h-[380px] relative text-gray-900 p-6 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MASCOT INLINE SVG POSES
// -----------------------------------------------------------------------------
function MascotBase({ children, className = "w-24 h-24" }: { children?: React.ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="mascotGlow" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#mascotGlow)" className="stroke-white stroke-2 shadow-xl" />
      <ellipse cx="36" cy="46" rx="5.5" ry="7.5" fill="#111827" />
      <ellipse cx="64" cy="46" rx="5.5" ry="7.5" fill="#111827" />
      <circle cx="34.5" cy="43.5" r="1.8" fill="white" />
      <circle cx="62.5" cy="43.5" r="1.8" fill="white" />
      <path d="M 38 60 Q 50 68 62 60" stroke="#111827" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="30" cy="53" rx="4.5" ry="2.5" fill="#F59E0B" opacity="0.3" />
      <ellipse cx="70" cy="53" rx="4.5" ry="2.5" fill="#F59E0B" opacity="0.3" />
      {children}
    </svg>
  );
}

// Hero: Floating on cloud
function MascotHero() {
  return (
    <div className="relative">
      <MascotBase className="w-32 h-32" />
      <svg className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 w-40 h-10" viewBox="0 0 100 30" fill="none">
        <path d="M10 20 Q 30 10 50 20 Q 70 10 90 20 Q 100 25 80 28 Q 50 30 20 28 Q 0 25 10 20 Z" fill="white" opacity="0.9" className="shadow-md" />
      </svg>
    </div>
  );
}

// AI: Dialog chat bubbles
function MascotAI() {
  return (
    <div className="relative">
      <MascotBase className="w-28 h-28" />
      <svg className="absolute top-[-25px] right-[-25px] w-16 h-16" viewBox="0 0 50 50" fill="none">
        <rect x="5" y="5" width="40" height="30" rx="8" fill="#7C4DFF" />
        <path d="M20 35 L25 42 L30 35 Z" fill="#7C4DFF" />
        <circle cx="17" cy="20" r="2" fill="white" />
        <circle cx="25" cy="20" r="2" fill="white" />
        <circle cx="33" cy="20" r="2" fill="white" />
      </svg>
    </div>
  );
}

// Notes: Holding notebook
function MascotNotes() {
  return (
    <div className="relative">
      <MascotBase className="w-28 h-28">
        {/* Miniature notebook overlay */}
        <rect x="62" y="60" width="18" height="24" rx="3" fill="#FFFFFF" stroke="#7C4DFF" strokeWidth="2.5" />
        <line x1="66" y1="66" x2="76" y2="66" stroke="#7C4DFF" strokeWidth="2" />
        <line x1="66" y1="72" x2="76" y2="72" stroke="#7C4DFF" strokeWidth="2" />
        <line x1="66" y1="78" x2="72" y2="78" stroke="#7C4DFF" strokeWidth="2" />
      </MascotBase>
    </div>
  );
}

// Voice: Microphone
function MascotVoice() {
  return (
    <div className="relative">
      <MascotBase className="w-28 h-28">
        {/* Mic illustration */}
        <rect x="68" y="58" width="8" height="15" rx="4" fill="#E0E7FF" stroke="#7C4DFF" strokeWidth="2" />
        <path d="M64 66 A 6 6 0 0 0 76 66" stroke="#7C4DFF" strokeWidth="2" fill="none" />
        <line x1="70" y1="72" x2="70" y2="79" stroke="#7C4DFF" strokeWidth="2" />
      </MascotBase>
    </div>
  );
}

// Projects: Holding board
function MascotProjects() {
  return (
    <div className="relative">
      <MascotBase className="w-28 h-28">
        {/* Kanban Board overlay */}
        <rect x="65" y="55" width="22" height="22" rx="4" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="2" />
        <rect x="69" y="60" width="6" height="5" rx="1" fill="#38BDF8" />
        <rect x="77" y="60" width="6" height="7" rx="1" fill="#7C4DFF" />
        <rect x="69" y="68" width="6" height="6" rx="1" fill="#22C55E" />
      </MascotBase>
    </div>
  );
}

// Security: Shield & key
function MascotSecurity() {
  return (
    <div className="relative">
      <MascotBase className="w-28 h-28">
        {/* Shield overlay */}
        <path d="M 66 58 Q 74 53 82 58 Q 82 72 74 80 Q 66 72 66 58 Z" fill="#22C55E" className="stroke-white stroke-1" />
        <path d="M 74 63 L 74 72" stroke="white" strokeWidth="2" />
        <path d="M 71 67 L 77 67" stroke="white" strokeWidth="2" />
      </MascotBase>
    </div>
  );
}

// Cloud: Sitting on cloud
function MascotCloud() {
  return (
    <div className="relative">
      <MascotBase className="w-28 h-28" />
      <svg className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-32 h-8" viewBox="0 0 100 30" fill="none">
        <path d="M10 20 Q 30 10 50 20 Q 70 10 90 20 Q 100 25 80 28 Q 50 30 20 28 Q 0 25 10 20 Z" fill="#38BDF8" opacity="0.3" />
      </svg>
    </div>
  );
}

// CTA: Waving goodbye
function MascotCTA() {
  return (
    <div className="relative">
      <MascotBase className="w-32 h-32">
        {/* Waving arm */}
        <path d="M 76 60 Q 88 50 94 38" stroke="#FFFFFF" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="94" cy="38" r="3.5" fill="#FFFFFF" />
      </MascotBase>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Testimonials Carousel Controls
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Active Showcase Tab
  const [activeShowcase, setActiveShowcase] = useState<string>("notes");

  // Animated Chat states
  const [aiChatLogs, setAiChatLogs] = useState([
    { role: "user", text: "Read my about me secure note." },
    { role: "ai", text: "🔒 Privacy Protection: Secure notes are client-side encrypted and completely isolated from AI processing. I cannot access secure notes." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileMenuOpen(false);
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || chatTyping) return;
    const userText = chatInput;
    setAiChatLogs(prev => [...prev, { role: "user", text: userText }]);
    setChatInput("");
    setChatTyping(true);

    setTimeout(() => {
      let reply = "I've scanned your workspace log files. All items are synchronized.";
      if (userText.toLowerCase().includes("secure") || userText.toLowerCase().includes("lock")) {
        reply = "🔒 Privacy Shield Warning: Locked secure notes are end-to-end encrypted and completely isolated. The AI assistant cannot read secure data.";
      } else if (userText.toLowerCase().includes("goal")) {
        reply = "🔥 Goal Streak: Your habits streak is active at 12 days! You have completed 82% of shared milestones.";
      }
      setAiChatLogs(prev => [...prev, { role: "ai", text: reply }]);
      setChatTyping(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-[#111827] overflow-x-hidden relative selection:bg-purple-500/20">
      
      {/* BACKGROUND FLOATING LIGHTS */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-gradient-to-tr from-[#7C4DFF]/10 to-[#8B5CF6]/5 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[120vh] left-[-10vw] w-[600px] h-[600px] bg-gradient-to-br from-cyan-400/5 to-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[20vh] right-[-10vw] w-[800px] h-[800px] bg-gradient-to-tr from-[#8B5CF6]/10 to-pink-500/5 rounded-full blur-[150px] pointer-events-none z-0" />
      
      {/* Noise background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808007_1px,transparent_1px),linear-gradient(to_bottom,#80808007_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] z-0" />

      {/* Navigation Header */}
      <motion.header 
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-white/80 dark:bg-white/70 backdrop-blur-xl border-b border-gray-200/50 py-3.5 shadow-sm" 
            : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C4DFF] via-[#8B5CF6] to-[#A855F7] flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:rotate-3 transition-transform">
              <span className="text-white font-black text-lg">K</span>
            </div>
            <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-gray-950 via-purple-900 to-indigo-950 bg-clip-text text-transparent">
              KnoVault
            </span>
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8">
            {["Features", "AI Showcase", "Security", "Ecosystem"].map((lbl) => (
              <button 
                key={lbl} 
                onClick={() => scrollToSection(lbl.toLowerCase().replace(" ", "-"))}
                className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors relative py-1 group"
              >
                {lbl}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#7C4DFF] transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </nav>

          {/* CTA Actions */}
          <div className="hidden md:flex items-center gap-5">
            <button onClick={() => router.push("/login")} className="text-sm font-bold text-gray-600 hover:text-gray-900">Sign In</button>
            <Button 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-[#7C4DFF] to-[#8B5CF6] hover:from-[#8B5CF6] hover:to-[#A855F7] text-white font-extrabold rounded-2xl px-6 py-5 shadow-lg shadow-purple-500/10 transition-all hover:scale-[1.02]"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 text-gray-700 bg-white/50 border border-gray-200/30 rounded-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-4 right-4 bg-white/95 backdrop-blur-2xl border border-gray-200/50 p-6 rounded-3xl mt-2 space-y-4 shadow-2xl md:hidden"
            >
              {["Features", "AI Showcase", "Security", "Ecosystem"].map((lbl) => (
                <button 
                  key={lbl} 
                  onClick={() => scrollToSection(lbl.toLowerCase().replace(" ", "-"))}
                  className="block w-full text-left py-2.5 font-bold text-gray-700 hover:text-gray-900"
                >
                  {lbl}
                </button>
              ))}
              <div className="h-px bg-gray-100 my-2" />
              <div className="flex gap-4">
                <Button onClick={() => router.push("/login")} variant="outline" className="flex-1 rounded-2xl">Sign In</Button>
                <Button onClick={handleGetStarted} className="flex-1 bg-[#7C4DFF] text-white rounded-2xl">Get Started</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* 1. HERO SECTION (MASCOT AS CENTERPIECE) */}
      <section className="min-h-screen pt-32 pb-16 md:pt-40 md:pb-20 flex flex-col items-center justify-center relative z-10 max-w-5xl mx-auto px-6 text-center">
        
        {/* Animated Gradient Lighting Ring */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 via-[#7C4DFF] to-cyan-400 rounded-full blur-3xl opacity-30 animate-pulse scale-150" />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 p-4"
          >
            <MascotHero />
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-6"
        >
          <div className="inline-flex bg-purple-50 border border-purple-100 text-[#7C4DFF] px-4 py-2 rounded-full text-xs font-black tracking-wide shadow-sm">
            🚀 The Encryption Unified Hub
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[84px] font-black tracking-tighter text-gray-950 leading-[1.02]">
            Your Second Brain. <br />
            <span className="bg-gradient-to-r from-[#7C4DFF] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
              Completely Isolated.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto">
            A beautiful workspace coordinating notes, timeline schedulers, checklists, goals, and voice transcription—secured by E2E passcode hashes.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button 
              onClick={handleGetStarted}
              className="bg-gradient-to-tr from-[#7C4DFF] to-[#8B5CF6] hover:from-[#8B5CF6] hover:to-[#A855F7] text-white font-extrabold rounded-2xl px-9 py-8 text-base shadow-xl shadow-purple-500/25 transition-all hover:scale-[1.02] group"
            >
              Get Started Free 
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => setDemoOpen(true)}
              className="border-gray-200 bg-white/60 text-gray-700 font-extrabold rounded-2xl px-8 py-8 text-base shadow-sm backdrop-blur-md"
            >
              <Play className="w-4.5 h-4.5 mr-2 fill-gray-500 text-gray-500" /> Watch Walkthrough
            </Button>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <div className="mt-20 animate-bounce flex flex-col items-center text-gray-400 gap-1.5 cursor-pointer" onClick={() => scrollToSection("numbers")}>
          <span className="text-[10px] font-black uppercase tracking-widest">Explore KnoVault</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* 2. NUMBERS SECTION (WITH ANIMATED COUNTERS) */}
      <section id="numbers" className="py-20 bg-white border-y border-gray-200/40 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { value: 100000, suffix: "+", label: "Notes Created" },
            { value: 50000, suffix: "+", label: "AI Conversations" },
            { value: 99.9, suffix: "%", label: "Uptime SLA", isFloat: true },
            { value: 100, suffix: "%", label: "Private Secure Notes" }
          ].map((stat, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </h4>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-black">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. PREMIUM FEATURE CARDS SECTION */}
      <section className="py-24 max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-xl mx-auto space-y-4 mb-20">
          <span className="text-[#7C4DFF] text-xs font-bold uppercase tracking-widest bg-purple-50 px-3.5 py-1.5 rounded-full font-black">FEATURES MATRIX</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-950">
            A comprehensive unified toolset.
          </h2>
          <p className="text-gray-500 font-medium">Coordinate your workspace logs without switching applications.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {FEATURES_LIST.map((feat, idx) => {
            const FeatIcon = feat.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`bg-white/80 border border-gray-200/60 backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 flex flex-col justify-between ${feat.border}`}
              >
                <div className="space-y-4">
                  <div className={`p-3 w-fit rounded-2xl ${feat.bg} ${feat.color}`}>
                    <FeatIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-950">{feat.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 4. PRODUCT SHOWCASE DEVICE MOCKUPS */}
      <section id="features" className="py-24 bg-white/40 border-y border-gray-200/30 backdrop-blur-xl relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-xl mx-auto space-y-4 mb-16">
            <span className="text-[#7C4DFF] text-xs font-bold uppercase tracking-widest bg-purple-50 px-3.5 py-1.5 rounded-full font-black">INTERACTIVE PLAYGROUND</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-950">
              Interactive Dashboard Mockups
            </h2>
            <p className="text-gray-500 font-medium">Click tabs to change the active browser view mockup.</p>
          </div>

          {/* Tabs header */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {[
              { id: "notes", label: "📝 Smart Notes" },
              { id: "kanban", label: "📋 Projects Kanban" },
              { id: "calendar", label: "📅 Event Planner" },
              { id: "vault", label: "🔒 Secure Vault" },
              { id: "voice", label: "🎙️ Voice Waveforms" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveShowcase(tab.id)}
                className={`px-5 py-3 rounded-full text-xs font-black border transition-all ${
                  activeShowcase === tab.id 
                    ? "bg-gray-950 text-white border-gray-950 shadow-md" 
                    : "bg-[#FAFAFC] text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Browser frame */}
          <div className="max-w-4xl mx-auto">
            <BrowserFrame>
              <AnimatePresence mode="wait">
                {activeShowcase === "notes" && (
                  <motion.div 
                    key="notes"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4 text-xs"
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#7C4DFF] bg-purple-50 px-2.5 py-0.5 rounded">Category: Engineering Logs</span>
                        <span className="text-[10px] text-gray-400">Edited 5 minutes ago</span>
                      </div>
                      <MascotNotes />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Sprint Backlog Requirements</h3>
                    <p className="text-gray-600 leading-relaxed">
                      We need to synchronize medicine trackers and habit streak badges. Sensitive passwords stay encrypted locally on device.
                    </p>
                    <div className="p-4 bg-purple-50/50 border border-dashed border-purple-500/20 rounded-2xl text-[11px] text-purple-700 font-bold leading-relaxed">
                      ✨ AI Bullet Summary: <br />
                      • Synchronize active goal milestone lists. <br />
                      • Ensure secure notes are skipped during AI searches.
                    </div>
                  </motion.div>
                )}

                {activeShowcase === "kanban" && (
                  <motion.div 
                    key="kanban"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"
                  >
                    {[
                      { title: "To Do", count: 2, task: "Database sync setup", priority: "Low", date: "Jul 10" },
                      { title: "In Progress", count: 1, task: "Biometrics PIN keypad UI", priority: "High", date: "Jul 6" },
                      { title: "Done", count: 4, task: "Storage limit warning check", priority: "Medium", date: "Jul 4" }
                    ].map((col, idx) => (
                      <div key={idx} className="bg-white border border-gray-200/50 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-gray-800">{col.title}</span>
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-black">{col.count}</span>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 p-3 rounded-xl space-y-2 hover:border-[#7C4DFF]/30 transition-all">
                          <h5 className="font-extrabold text-[11px] text-gray-900 leading-tight">{col.task}</h5>
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className={`px-2 py-0.5 rounded ${
                              col.priority === "High" ? "bg-red-50 text-red-500" : col.priority === "Medium" ? "bg-amber-50 text-amber-500" : "bg-gray-100 text-gray-500"
                            }`}>{col.priority}</span>
                            <span className="text-gray-400">{col.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeShowcase === "calendar" && (
                  <motion.div 
                    key="calendar"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-gray-900 text-sm">📅 Calendar Timeline Conflicts</span>
                      <MascotProjects />
                    </div>
                    <div className="p-3.5 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                      <span className="text-base">⚠️</span>
                      <div>
                        <p className="font-extrabold text-[11px] text-gray-900">Schedule Overlap scans</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">"Medicine dose reminder" overlaps with "Engineering roadmap checkin" tomorrow at 10:00 AM.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeShowcase === "vault" && (
                  <motion.div 
                    key="vault"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-6 text-center space-y-4"
                  >
                    <MascotSecurity />
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-gray-900">Secure Vault unlocked locally</h4>
                      <p className="text-[10px] text-gray-400">Scan biometrics or type credentials PIN</p>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((d) => (
                        <span key={d} className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeShowcase === "voice" && (
                  <motion.div 
                    key="voice"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-rose-500 font-extrabold flex items-center gap-1.5"><span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" /> Dictating Audio...</span>
                      <MascotVoice />
                    </div>
                    <div className="flex gap-1 h-6 items-center justify-center bg-gray-50 rounded-xl p-2">
                      {[3, 6, 8, 2, 9, 4, 7, 5, 8, 9, 3, 6, 4, 8, 2, 9, 3].map((v, i) => (
                        <span key={i} className="w-1 bg-rose-400 rounded-full" style={{ height: `${v * 10}%` }} />
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 italic bg-gray-100/50 p-2.5 rounded-lg">
                      "KnoVault is our second brain, coordinating checklists and timeline schedulers..."
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </BrowserFrame>
          </div>

        </div>
      </section>

      {/* 5. SEPARATING CURVED SVG DIVIDER */}
      <div className="w-full overflow-hidden leading-none relative z-10">
        <svg className="relative block w-full h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V120H0V56.44Z" fill="#FAFAFC" />
        </svg>
      </div>

      {/* 6. AI SHOWCASE & REALISTIC CHAT DEMONSTRATION */}
      <section id="ai-showcase" className="py-24 bg-[#FAFAFC] relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 text-purple-600 bg-purple-50 border border-purple-100 px-3.5 py-1.5 rounded-full text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" /> CONTEXT AI
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                An intelligent brain <br />
                <span className="bg-gradient-to-r from-[#7C4DFF] to-[#8B5CF6] bg-clip-text text-transparent">trained on your life.</span>
              </h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                Interact with the mock chat module below. Query schedules, medicine dosages, or goal lists. Enjoy complete privacy isolation.
              </p>
              
              {/* Mascot pose talks with bubbles */}
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-200/50 rounded-3xl">
                <MascotAI />
                <div className="text-xs">
                  <h4 className="font-extrabold text-gray-950">Mascot AI Helper</h4>
                  <p className="text-gray-500 mt-0.5">"I coordinate your daily milestones and checklist entries, but I can never access secure passwords."</p>
                </div>
              </div>
            </div>

            {/* Chat Sandbox */}
            <div className="lg:col-span-7 bg-white border border-gray-200/60 rounded-[32px] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="font-bold text-xs text-gray-900">KnoVault Assistant context scanner</span>
                </div>
                <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded font-black">E2E Shield Active</span>
              </div>

              {/* logs */}
              <div className="h-64 overflow-y-auto space-y-4 pr-1 text-xs">
                {aiChatLogs.map((msg, idx) => (
                  <div key={idx} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-extrabold text-[10px] ${
                      msg.role === "user" ? "bg-purple-100 text-purple-600" : "bg-red-50 text-red-500"
                    }`}>
                      {msg.role === "user" ? "ME" : "AI"}
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[85%] ${
                      msg.role === "user" 
                        ? "bg-[#7C4DFF] text-white rounded-tr-sm" 
                        : "bg-gray-50 border border-gray-100 text-gray-700 rounded-tl-sm leading-relaxed"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {chatTyping && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-[9px] font-black">AI</div>
                    <div className="bg-gray-50 border border-gray-100 px-3 py-2.5 rounded-2xl flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Send */}
              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Ask: 'Summarize my goals' or 'Read secure password note'..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs outline-none focus:border-[#7C4DFF]"
                />
                <button 
                  onClick={handleSendChat}
                  className="p-3 bg-[#7C4DFF] hover:bg-[#8B5CF6] text-white rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. DEEP VAULT SECURITY CORES */}
      <section id="security" className="py-24 bg-white border-y border-gray-200/40 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            <div className="lg:col-span-6 flex justify-center relative h-[360px]">
              <div className="absolute inset-0 bg-emerald-500/5 rounded-full blur-[80px] animate-pulse" />
              <MascotSecurity />
            </div>

            <div className="lg:col-span-6 space-y-6">
              <span className="inline-flex bg-emerald-50 text-emerald-600 border border-emerald-100 px-3.5 py-1.5 rounded-full text-xs font-black">E2E CRYPTOGRAPHY VAULT</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                Absolute local keys ciphers
              </h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                Plaintext Secure Notes are decrypted in-memory locally on-device. Backups uploaded to databases contain encrypted cipher values only, ensuring data remains completely isolated from cloud leaks or LLM retrievals.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-gray-950">Zero AI Prompt Leak</h4>
                  <p className="text-xs text-gray-500">Secure note parameters are skipped during AI thread retrievals.</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-gray-950">Local Keypad locks</h4>
                  <p className="text-xs text-gray-500">Vaults are locked locally. Decryption key triggers upon pin validation.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8. ECOSYSTEM PLATFORMS AVAILABILITY */}
      <section id="ecosystem" className="py-24 max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-xl mx-auto space-y-4 mb-20">
          <span className="text-[#7C4DFF] text-xs font-bold uppercase tracking-widest bg-purple-50 px-3.5 py-1.5 rounded-full font-black">AVAILABILITY PLATFORMS</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-950">
            Enjoy full synchronization
          </h2>
          <p className="text-gray-500 font-medium">Synchronize everything seamlessly across web and mobile.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { title: "Web Platform", desc: "Responsive web client equipped with full dashboard widgets, threads, and workspaces.", icon: Globe, status: "Live now" },
            { title: "Android APK", desc: "Optimized mobile builds featuring biometrics authentication, STT dictation, and notifications.", icon: Smartphone, status: "Live now" },
            { title: "Cloud Synchronization", desc: "Background sync backups database entries automatically when network returns.", icon: Cloud, status: "Active" },
            { title: "Desktop Native Client", desc: "Dedicated builds for MacOS and Windows in current backlog pipeline.", icon: Laptop, status: "Soon", opacity: "opacity-60" },
          ].map((p, idx) => {
            const DeviceIcon = p.icon;
            return (
              <div key={idx} className={`bg-white border border-gray-200/50 p-6 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow ${p.opacity || ""}`}>
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 text-[#7C4DFF] rounded-2xl w-fit">
                    <DeviceIcon className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-950">{p.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
                <span className="text-[10px] font-black text-emerald-500 uppercase mt-6">{p.status}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. TESTIMONIALS SECTION (WITH SLIDE/CAROUSEL CONTROLS) */}
      <section className="py-24 bg-[#F7F5FF]/30 border-y border-gray-200/40 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
            <div className="space-y-4">
              <span className="text-[#7C4DFF] text-xs font-bold uppercase tracking-widest bg-white border border-purple-500/10 px-3.5 py-1.5 rounded-full">TESTIMONIALS</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-950">
                Loved by organized creators
              </h2>
            </div>
            
            {/* Nav Arrows */}
            <div className="flex gap-2">
              <button 
                onClick={() => setTestimonialIndex(prev => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1))}
                className="p-3 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setTestimonialIndex(prev => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1))}
                className="p-3 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Show two testimonials active */}
            {[
              TESTIMONIALS[testimonialIndex], 
              TESTIMONIALS[(testimonialIndex + 1) % TESTIMONIALS.length]
            ].map((t, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white border border-gray-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400 stroke-none" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">"{t.quote}"</p>
                </div>
                <div className="flex items-center gap-3.5 mt-8 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-[#7C4DFF]/10 flex items-center justify-center font-extrabold text-sm text-[#7C4DFF]">
                    {t.initial}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-950">{t.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 10. FAQ SECTION */}
      <section className="py-24 max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-gray-500 font-medium">Clear answers regarding local limits, sync ciphers, and workspaces.</p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-extrabold text-gray-900 text-sm md:text-base hover:bg-gray-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 border-t border-gray-100 text-xs md:text-sm text-gray-500 leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 11. FINAL CTA SECTION (WITH WAVING MASCOT) */}
      <section className="py-20 max-w-7xl mx-auto px-6 relative z-10">
        <div className="bg-gradient-to-tr from-[#7C4DFF] via-[#8B5CF6] to-[#A855F7] rounded-[48px] p-8 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-purple-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />
          <div className="absolute inset-3 border border-white/10 rounded-[38px] pointer-events-none" />
          
          <div className="max-w-2xl mx-auto flex flex-col items-center space-y-6 relative z-10">
            <MascotCTA />
            
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mt-2">Ready to organize your life?</h2>
            <p className="text-sm md:text-base text-purple-100 font-medium leading-relaxed">
              Start building your secure second brain with KnoVault today. Free offline synchronization, passcode security keys, and instant context scan logs.
            </p>
            <div className="pt-6">
              <Button 
                onClick={handleGetStarted}
                className="bg-white hover:bg-purple-50 text-[#7C4DFF] font-black rounded-2xl px-9 py-8 text-base shadow-2xl transition-all hover:scale-[1.02] flex items-center gap-2"
              >
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 12. MULTI-COLUMN FOOTER */}
      <footer className="bg-white border-t border-gray-200/50 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-12 text-xs text-gray-500">
          
          {/* Logo & Info */}
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C4DFF] to-[#8B5CF6] flex items-center justify-center text-white font-extrabold text-sm">
                K
              </div>
              <span className="text-base font-black text-gray-900 tracking-tight">KnoVault</span>
            </div>
            <p className="leading-relaxed">Your encrypted second brain workspace. Synthesize notes, timeline meetings, log streaks, and coordinate goals securely.</p>
            <p className="text-[10px] text-gray-400 pt-2">© 2026 KnoVault. All rights reserved.</p>
          </div>

          {/* Links 1 */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-gray-900 uppercase tracking-widest text-[9px]">Product</h4>
            <ul className="space-y-2.5 font-bold">
              <li><button onClick={() => scrollToSection("features")} className="hover:text-gray-900 transition-colors">Features</button></li>
              <li><button onClick={() => scrollToSection("ai-showcase")} className="hover:text-gray-900 transition-colors">AI Showcase</button></li>
              <li><button onClick={() => scrollToSection("ecosystem")} className="hover:text-gray-900 transition-colors">Ecosystem</button></li>
              <li><button onClick={() => router.push("/login")} className="hover:text-gray-900 transition-colors">Sign In</button></li>
            </ul>
          </div>

        </div>
      </footer>

      {/* WATCH WALKTHROUGH DEMO DIALOG */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl p-0 overflow-hidden rounded-3xl">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-600 fill-purple-600" /> KnoVault Walkthrough Demo
            </h3>
            <button onClick={() => setDemoOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="aspect-video w-full bg-[#111827] flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 pointer-events-none" />
            <div className="text-center p-6 space-y-3 z-10">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white shadow-lg animate-pulse">
                <Play className="w-6 h-6 fill-white" />
              </div>
              <p className="text-sm font-bold text-white">Interactive Video Walkthrough Placeholder</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">See how smart notes summaries, voice logs transcription, and collaborative workspaces synchronize in real-time.</p>
            </div>
          </div>
          <div className="p-6 bg-gray-50 flex justify-end">
            <Button onClick={() => setDemoOpen(false)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">Close Demo</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Clean custom Github icon SVG
function GithubIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
