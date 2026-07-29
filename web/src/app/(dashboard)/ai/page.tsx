"use client";

import { useEffect, useRef, useState } from "react";
import { useChatThreadsStore } from "@/store/useChatThreadsStore";
import { useMemoryStore } from "@/store/useMemoryStore";
import { useMedicineStore } from "@/store/useMedicineStore";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
import { useGoalsStore } from "@/store/useGoalsStore";
import { aiService } from "@/services/ai";
import { KnoMascot } from "@/components/ai/KnoMascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Plus,
  Pin,
  Trash2,
  Edit2,
  Download,
  Brain,
  Mic,
  MicOff,
  Send,
  Volume2,
  Copy,
  Search,
  User,
  Sparkles,
  PinOff,
  Save,
  X,
  Check,
  Activity,
  Target,
  PartyPopper,
  Loader2,
  ShieldAlert,
  PanelLeft,
  Glasses,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isToday } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function AIPage() {
  const {
    threads,
    activeThreadId,
    searchQuery,
    createThread,
    deleteThread,
    renameThread,
    togglePinThread,
    setActiveThreadId,
    addMessage,
    setSearchQuery,
    exportThreadToMarkdown,
  } = useChatThreadsStore();

  const {
    memories,
    addMemory,
    deleteMemory,
    getFormattedContext,
  } = useMemoryStore();

  const { reminders: medicineReminders, fetchMedicines } = useMedicineStore();
  const { specialDays, fetchSpecialDays } = useSpecialDaysStore();
  const { stats: goalStats, fetchGoals } = useGoalsStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mascotState, setMascotState] = useState<"idle" | "thinking" | "success">("idle");
  const [isTempChat, setIsTempChat] = useState(false);
  const [tempChatMessages, setTempChatMessages] = useState<any[]>([]);
  
  // Dialog open controls
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");
  
  // Thread rename controls
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);

  useEffect(() => {
    // Fetch context data silently to build "Smart Context Cards"
    Promise.all([
      fetchMedicines(),
      fetchSpecialDays(),
      fetchGoals()
    ]).then(() => setContextLoaded(true));
  }, []);

  // Auto create a thread if none exist on load
  useEffect(() => {
    if (threads.length === 0) {
      createThread("First Conversation");
    } else if (!activeThreadId) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  // Scroll to bottom of chat
  const activeThread = threads.find((t) => t.id === activeThreadId);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [activeThread?.messages, isSending]);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeThreadId]);

  // STT Voice Speech Recognition
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
          toast.info("Listening... Speak now");
        };

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setInputVal((prev) => (prev ? prev + " " + text : text));
          toast.success("Voice transcribed!");
        };

        recognition.onerror = (event: any) => {
          console.error(event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        toast.error("Voice dictation is not supported in this browser.");
      }
    }
  };

  // TTS Read Aloud
  const handleSpeak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech is not supported in this browser");
    }
  };

  // Client-Side Secure Notes Interceptor Check
  const checkSecureNotesQuery = (message: string): boolean => {
    const lower = message.toLowerCase();
    const hasSecureKeywords = ["secure note", "locked note", "vault note", "private note", "secure notes", "locked notes", "vault notes", "private notes"].some(
      (kw) => lower.includes(kw)
    );
    if (hasSecureKeywords) return true;
    
    // Check keyword combinations
    const hasSec = ["secure", "locked", "vault", "private"].some((w) => lower.includes(w));
    const hasNot = ["note", "notes"].some((w) => lower.includes(w));
    if (hasSec && hasNot) return true;

    return false;
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);
    setMascotState("idle");
    toast.info("AI generation stopped");
  };

  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim()) return;

    const userQuery = msgText.trim();
    setInputVal("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSending(true);
    setMascotState("thinking");

    if (isTempChat) {
      const userMsg = {
        id: `temp_msg_${Date.now()}`,
        role: "user",
        content: userQuery,
        timestamp: new Date().toISOString(),
      };
      setTempChatMessages((prev) => [...prev, userMsg]);
    } else if (activeThreadId) {
      addMessage(activeThreadId, "user", userQuery);
    }

    // Client-side secure notes interceptor trigger
    if (checkSecureNotesQuery(userQuery)) {
      setTimeout(() => {
        const warning = "⚠️ KnoVault Security Shield: Secure Notes are end-to-end encrypted and completely isolated from KnoVault AI. To protect your privacy, the AI Chat Assistant cannot read, search, summarize, or retrieve contents from your Secure Notes. Please access them manually within the Secure Vault.";
        if (isTempChat) {
          const assistantMsg = {
            id: `temp_msg_${Date.now() + 1}`,
            role: "assistant",
            content: warning,
            timestamp: new Date().toISOString(),
          };
          setTempChatMessages((prev) => [...prev, assistantMsg]);
        } else if (activeThreadId) {
          addMessage(activeThreadId, "assistant", warning);
        }
        setIsSending(false);
        setMascotState("idle");
      }, 800);
      return;
    }

    // Build context string including local memory + widgets stats
    let contextStr = getFormattedContext();

    if (contextLoaded) {
      const todayMed = medicineReminders.filter((r) => isToday(new Date(r.reminder_date)));
      const todayGoalTotal = goalStats?.today_total || 0;
      const todayGoalDone = goalStats?.today_completed || 0;
      const streak = goalStats?.streak || 0;

      contextStr += `Today's Context Dashboard:\n` +
        `- Medicines: ${todayMed.length} doses scheduled, ${todayMed.filter((r) => r.is_completed).length} taken.\n` +
        `- Goals completed: ${todayGoalDone}/${todayGoalTotal}.\n` +
        `- Streak: ${streak} days.\n`;
    }

    try {
      const response = await aiService.chat(
        { message: userQuery, context: contextStr, is_temporary: isTempChat },
        controller.signal
      );
      if (isTempChat) {
        const assistantMsg = {
          id: `temp_msg_${Date.now() + 1}`,
          role: "assistant",
          content: response.response,
          timestamp: new Date().toISOString(),
        };
        setTempChatMessages((prev) => [...prev, assistantMsg]);
      } else if (activeThreadId) {
        addMessage(activeThreadId, "assistant", response.response);
      }
      setMascotState("success");
      setTimeout(() => setMascotState("idle"), 2500);
    } catch (e: any) {
      if (e?.name === "CanceledError" || e?.name === "AbortError" || e?.code === "ERR_CANCELED") {
        // Generation cancelled cleanly by user - keep already output/thread state intact
        return;
      }
      const errorMsg = "Error: I'm unable to reach the AI servers. Please check your connection.";
      if (isTempChat) {
        const assistantMsg = {
          id: `temp_msg_${Date.now() + 1}`,
          role: "assistant",
          content: errorMsg,
          timestamp: new Date().toISOString(),
        };
        setTempChatMessages((prev) => [...prev, assistantMsg]);
      } else if (activeThreadId) {
        addMessage(activeThreadId, "assistant", errorMsg);
      }
      setMascotState("idle");
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleCreateNewThread = () => {
    setIsTempChat(false);
    setTempChatMessages([]);
    const newId = createThread();
    toast.success("New chat thread created");
  };

  const handleExport = (threadId: string) => {
    const md = exportThreadToMarkdown(threadId);
    if (!md) return;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `knovault_chat_export.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Conversation exported as Markdown");
  };

  const handleAddMemory = () => {
    if (!newMemoryText.trim()) return;
    addMemory(newMemoryText.trim());
    setNewMemoryText("");
    toast.success("Details saved in Profile Memory!");
  };

  const handleRenameSubmit = (threadId: string) => {
    if (!renameText.trim()) return;
    renameThread(threadId, renameText.trim());
    setEditingThreadId(null);
    setRenameText("");
    toast.success("Conversation renamed");
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayMedsCount = medicineReminders.filter((r) => isToday(new Date(r.reminder_date)) && !r.is_completed).length;

  const renderThreadsContent = (onSelect?: () => void) => (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      {/* Search bar */}
      <div className="relative shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/80" />
        <Input
          placeholder="Search chat history..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9.5 bg-card border-border/40 text-xs h-9 rounded-xl focus-visible:ring-primary/40 text-foreground"
        />
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-hide">
        {filteredThreads.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-medium">
            No conversations found
          </div>
        ) : (
          filteredThreads.map((t) => {
            const isActive = t.id === activeThreadId;
            const isEditing = editingThreadId === t.id;

            return (
              <div
                key={t.id}
                onClick={() => {
                  if (!isEditing) {
                    setActiveThreadId(t.id);
                    if (onSelect) onSelect();
                  }
                }}
                className={`group relative rounded-2xl border p-3.5 flex flex-col justify-between transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary/10 border-primary/30 text-foreground shadow-[0_4px_12px_rgba(124,77,255,0.05)]"
                    : "bg-card/20 border-border/30 text-muted-foreground hover:bg-accent/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {isEditing ? (
                    <div className="flex gap-1.5 w-full items-center" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        className="bg-card text-xs h-7 py-0 px-2 rounded-lg"
                        autoFocus
                        maxLength={35}
                      />
                      <Button size="icon" variant="ghost" onClick={() => handleRenameSubmit(t.id)} className="w-6 h-6 shrink-0 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingThreadId(null)} className="w-6 h-6 shrink-0 rounded-lg">
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <span className="font-bold text-xs truncate max-w-[170px] text-foreground">
                      {t.title}
                    </span>
                  )}

                  {!isEditing && (
                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinThread(t.id);
                        }}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        title={t.isPinned ? "Unpin thread" : "Pin thread"}
                      >
                        {t.isPinned ? <PinOff className="w-3 h-3 text-primary" /> : <Pin className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingThreadId(t.id);
                          setRenameText(t.title);
                        }}
                        className="p-0.5 text-muted-foreground hover:text-primary"
                        title="Rename thread"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteThread(t.id);
                        }}
                        className="p-0.5 text-muted-foreground hover:text-destructive"
                        title="Delete thread"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2 font-medium">
                  <span>{t.messages.length} messages</span>
                  {t.isPinned && (
                    <span className="flex items-center gap-0.5 text-primary uppercase font-bold text-[8px] tracking-wider bg-primary/10 px-1.5 py-0.5 rounded-lg">
                      Pinned
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-6 h-[calc(100dvh-12.5rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-6.5rem)] overflow-hidden -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 md:pb-6">
      
      {/* Threads Sidebar Panel (Desktop ≥1024px) */}
      <div className="w-80 shrink-0 bg-card/45 backdrop-blur-md border border-border/40 rounded-3xl p-4 flex flex-col justify-between overflow-hidden hidden lg:flex shadow-sm">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Sidebar Header & Create button */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/20 shrink-0">
            <h2 className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
              <MessageSquare className="w-4.5 h-4.5 text-primary" /> Conversations
            </h2>
            <Button size="icon" variant="ghost" onClick={handleCreateNewThread} className="w-8 h-8 rounded-xl hover:bg-primary/10">
              <Plus className="w-4 h-4 text-foreground" />
            </Button>
          </div>

          {renderThreadsContent()}
        </div>

        {/* Sidebar Footer */}
        <div className="shrink-0 pt-4 border-t border-border/20 mt-4">
          <Button 
            onClick={() => setMemoryOpen(true)} 
            variant="outline" 
            className="w-full border-border/50 bg-card rounded-2xl font-bold text-xs hover:bg-accent/40"
          >
            <Brain className="w-4 h-4 mr-2 text-purple-500" /> AI Memory Box
          </Button>
        </div>
      </div>

      {/* Main Chat Assistant Board */}
      <div className="flex-1 bg-card/35 backdrop-blur-md border border-border/40 rounded-3xl flex flex-col overflow-hidden relative shadow-sm">
        
        {/* Top Header Bar */}
        <div className="shrink-0 py-6 px-6 md:px-8 border-b border-border/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card/60 backdrop-blur-xl z-10 shadow-xs">
          {/* Left Section: Avatar, Title, Subtitle + Mobile Drawer Trigger */}
          <div className="flex items-center gap-3.5 shrink-0 min-w-0">
            {/* Mobile/Tablet Conversations Drawer Button (< lg) */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden h-11 w-11 rounded-[14px] border-border/50 bg-card/80 text-foreground hover:bg-accent/60 shrink-0 shadow-xs"
              title="Open Conversations"
            >
              <PanelLeft className="w-5 h-5 text-primary" />
            </Button>

            <div className="relative shrink-0">
              <KnoMascot state={mascotState} className="w-11 h-11 rounded-2xl shrink-0 shadow-sm border border-border/30" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-[22px] font-bold text-foreground tracking-tight truncate max-w-[240px] sm:max-w-[360px] lg:max-w-[420px]">
                  {isTempChat ? "Incognito Session" : (activeThread?.title || "First Conversation")}
                </h1>
                {isTempChat && (
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm shrink-0">
                    <Glasses className="w-3 h-3 text-purple-400" /> Incognito
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isTempChat ? "bg-purple-400" : "bg-emerald-500"} animate-pulse shrink-0`} />
                <span>{isTempChat ? "Temporary Mode" : "Always active"}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>{isTempChat ? "History Disabled" : "Secure Assistant"}</span>
              </p>
            </div>
          </div>

          {/* Right Section: Action Buttons */}
          <div className="flex items-center gap-3 md:gap-3.5 overflow-x-auto scrollbar-hide py-0.5 shrink-0 max-w-full">
            <Button
              variant={isTempChat ? "default" : "outline"}
              onClick={() => {
                const nextState = !isTempChat;
                setIsTempChat(nextState);
                if (nextState) {
                  setTempChatMessages([]);
                  toast.info("Incognito Chat Session Started");
                } else {
                  toast.info("Returned to Normal Chat");
                }
              }}
              className={`h-11 px-4 rounded-[14px] font-semibold text-xs md:text-sm shadow-xs flex items-center gap-2 shrink-0 transition-all duration-200 ${
                isTempChat
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 border-purple-500/40"
                  : "border-border/50 bg-card/80 hover:bg-accent/60 text-foreground"
              }`}
              title={isTempChat ? "Disable Temporary Chat" : "Enable Temporary Chat"}
            >
              <Glasses className="w-4 h-4 text-purple-300 shrink-0" />
              <span>{isTempChat ? "Incognito Active" : "Temporary Chat"}</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setMemoryOpen(true)}
              className="h-11 px-4 rounded-[14px] border-border/50 bg-card/80 hover:bg-accent/60 text-foreground font-semibold text-xs md:text-sm shadow-xs flex items-center gap-2 shrink-0 transition-all duration-200"
            >
              <Brain className="w-4 h-4 text-purple-500 shrink-0" />
              <span>Memory</span>
            </Button>

            {activeThread && activeThread.messages.length > 0 && !isTempChat && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleExport(activeThread.id)}
                  className="h-11 px-4 rounded-[14px] border-border/50 bg-card/80 hover:bg-accent/60 text-foreground font-semibold text-xs md:text-sm shadow-xs flex items-center gap-2 shrink-0 transition-all duration-200"
                >
                  <Download className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Export</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => deleteThread(activeThread.id)}
                  className="h-11 px-4 rounded-[14px] border-border/50 bg-card/80 hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive font-semibold text-xs md:text-sm shadow-xs flex items-center gap-2 shrink-0 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Delete</span>
                </Button>
              </>
            )}

            <Button
              onClick={handleCreateNewThread}
              className="h-11 px-4.5 rounded-[14px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs md:text-sm shadow-md shadow-primary/20 flex items-center gap-2 shrink-0 transition-all duration-200"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>New Chat</span>
            </Button>
          </div>
        </div>

        {/* Temporary Chat Glassmorphism Banner */}
        <AnimatePresence>
          {isTempChat && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-4 md:mx-6 mt-3 px-4 py-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 backdrop-blur-md flex items-center gap-3 text-xs text-purple-200 shadow-md shrink-0"
            >
              <Glasses className="w-4.5 h-4.5 text-purple-400 shrink-0 animate-pulse" />
              <span className="font-medium">
                This conversation won't appear in your history and won't be used to improve memory.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Feed Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0 scrollbar-hide" ref={scrollRef}>
          {((isTempChat ? tempChatMessages : (activeThread?.messages || [])).length === 0) ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center pt-8 pb-8 text-center"
            >
              <KnoMascot state="idle" className="w-20 h-20 mb-4" />
              <h3 className="text-lg font-extrabold text-foreground mb-1">
                {isTempChat ? "Incognito AI Chat" : "Welcome to KnoVault AI"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                {isTempChat 
                  ? "Temporary chat session. Messages are processed in real-time but discarded when closed." 
                  : "I can summarize medicines, check streaks, log goals, and lookup files."}
              </p>

              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
                <div
                  className="bg-card/50 border border-border/40 hover:border-rose-500/30 rounded-2xl p-4.5 text-left hover:bg-accent/20 transition-all cursor-pointer shadow-sm"
                  onClick={() => handleSendMessage("What is my medicine schedule for today?")}
                >
                  <Activity className="w-5 h-5 text-rose-500 mb-2" />
                  <h4 className="font-bold text-foreground text-xs mb-0.5">Medicines</h4>
                  <p className="text-[10px] text-muted-foreground/80 font-medium">
                    {todayMedsCount > 0 ? `${todayMedsCount} doses remaining` : "All caught up"}
                  </p>
                </div>
                <div
                  className="bg-card/50 border border-border/40 hover:border-purple-500/30 rounded-2xl p-4.5 text-left hover:bg-accent/20 transition-all cursor-pointer shadow-sm"
                  onClick={() => handleSendMessage("What are my goal analytics looking like?")}
                >
                  <Target className="w-5 h-5 text-purple-500 mb-2" />
                  <h4 className="font-bold text-foreground text-xs mb-0.5">Goal Streak</h4>
                  <p className="text-[10px] text-muted-foreground/80 font-medium">
                    {goalStats?.streak ? `${goalStats.streak} day streak` : "Check progress"}
                  </p>
                </div>
                <div
                  className="bg-card/50 border border-border/40 hover:border-pink-500/30 rounded-2xl p-4.5 text-left hover:bg-accent/20 transition-all cursor-pointer shadow-sm"
                  onClick={() => handleSendMessage("Are there any upcoming special days?")}
                >
                  <PartyPopper className="w-5 h-5 text-pink-500 mb-2" />
                  <h4 className="font-bold text-foreground text-xs mb-0.5">Special Days</h4>
                  <p className="text-[10px] text-muted-foreground/80 font-medium">
                    {specialDays.length > 0 ? `${specialDays.length} logs saved` : "Track events"}
                  </p>
                </div>
              </div>

              {/* Prompt Suggestions */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                {[
                  "What's my schedule today?",
                  "Analyze my daily goals"
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug)}
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto pb-4 md:pb-6">
              <AnimatePresence>
                {(isTempChat ? tempChatMessages : (activeThread?.messages || [])).map((msg: any) => {
                  const isUser = msg.role === "user";
                  const isSecurityAlert = msg.content.includes("KnoVault Security Shield");

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {isUser ? (
                          <div className="w-8 h-8 rounded-full bg-accent border border-border/40 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <KnoMascot state="idle" className="w-8 h-8 rounded-xl" />
                        )}
                      </div>

                      <div className="space-y-1.5 max-w-[85%] sm:max-w-[75%]">
                        <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap shadow-sm font-medium ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : isSecurityAlert
                            ? "bg-red-500/10 border border-red-500/25 text-foreground rounded-tl-sm"
                            : "bg-card border border-border/40 text-foreground rounded-tl-sm"
                        }`}>
                          {!isUser && (
                            <span className="text-[9px] uppercase font-extrabold tracking-wider text-purple-500 block mb-1">
                              {isSecurityAlert ? "🔒 Security Shield Block" : "✨ KnoVault AI"}
                            </span>
                          )}
                          {msg.content}
                        </div>

                        {!isUser && !isSecurityAlert && (
                          <div className="flex gap-2 pl-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                toast.success("Copied to clipboard");
                              }}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                              title="Copy text"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleSpeak(msg.content)}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                              title="Speak out loud"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isSending && (
                <div className="flex items-start gap-3.5">
                  <KnoMascot state="thinking" className="w-8 h-8 rounded-xl" />
                  <div className="bg-card border border-border/40 rounded-2xl px-4 py-3.5 flex items-center gap-1.5 w-16 h-10">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-px w-full" />
            </div>
          )}
        </div>

        {/* Input Bar Docked to Bottom */}
        <div className="shrink-0 p-4 border-t border-border/20 bg-card/60 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputVal);
            }}
            className="max-w-3xl mx-auto flex gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleSpeechRecognition}
              className={`rounded-2xl border-border/40 shrink-0 h-11 w-11 transition-colors ${
                isListening ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" : "bg-card"
              }`}
            >
              {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
            </Button>

            <Input
              placeholder={isTempChat ? "Ask temporary question (Incognito mode)..." : "Ask a question about medicines, streak, goals..."}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-card border-border/40 rounded-2xl text-xs h-11 focus-visible:ring-primary/30"
              disabled={isSending}
            />

            {isSending ? (
              <Button
                type="button"
                onClick={handleStopGeneration}
                className="bg-destructive hover:bg-destructive/90 text-white rounded-2xl shrink-0 h-11 px-4 flex items-center gap-1.5 font-bold text-xs shadow-md transition-all duration-200"
                title="Stop AI Generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!inputVal.trim()} className="bg-primary hover:bg-primary/90 text-white rounded-2xl shrink-0 h-11 w-11 transition-all duration-200">
                <Send className="w-4.5 h-4.5" />
              </Button>
            )}
          </form>
        </div>
      </div>

      {/* Memory Profile Box Modal */}
      <Dialog open={memoryOpen} onOpenChange={setMemoryOpen}>
        <DialogContent className="bg-card/90 backdrop-blur-2xl border-border/50 text-foreground rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-lg">
              <Brain className="w-5.5 h-5.5 text-purple-500" /> AI Profile Memories
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-semibold">
              Manage facts or custom prompt style guidelines saved for your chatbot assistant context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            
            {/* Add memory item */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Remember a fact/preference:</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Speak in bullet points. I work as a team lead..."
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  className="bg-accent/25 border-border/40 text-xs rounded-2xl h-10"
                />
                <Button size="sm" onClick={handleAddMemory} className="rounded-2xl bg-primary text-white h-10 px-4 font-bold text-xs shrink-0 shadow-sm">Save</Button>
              </div>
            </div>

            {/* List memories */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pt-1 scrollbar-hide">
              <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider block mb-1">
                Saved memories ({memories.length})
              </span>
              
              {memories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No memories saved yet.</p>
              ) : (
                memories.map((m) => (
                  <div key={m.id} className="flex justify-between items-center text-xs bg-accent/30 px-3 py-2 border border-border/30 rounded-xl gap-2">
                    <span className="text-foreground font-semibold">{m.content}</span>
                    <button
                      onClick={() => {
                        deleteMemory(m.id);
                        toast.success("Memory deleted");
                      }}
                      className="text-red-500 hover:text-red-600 text-[10px] font-bold shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>

          <DialogFooter>
            <Button onClick={() => setMemoryOpen(false)} className="rounded-xl bg-accent text-foreground hover:bg-accent/80 font-bold text-xs h-9">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Conversations Slide-over Drawer (< lg) */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-[340px] p-5 bg-card/95 backdrop-blur-2xl border-r border-border/40 text-foreground flex flex-col justify-between h-full">
          <SheetHeader className="p-0 pb-3 border-b border-border/20 flex flex-row items-center justify-between">
            <SheetTitle className="font-extrabold text-foreground text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Conversations
            </SheetTitle>
            <Button
              size="sm"
              onClick={() => {
                handleCreateNewThread();
                setMobileDrawerOpen(false);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-8 px-3 flex items-center gap-1 shrink-0 mr-8"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0 pt-4">
            {renderThreadsContent(() => setMobileDrawerOpen(false))}
          </div>

          <div className="shrink-0 pt-4 border-t border-border/20 mt-3">
            <Button 
              onClick={() => {
                setMemoryOpen(true);
                setMobileDrawerOpen(false);
              }} 
              variant="outline" 
              className="w-full border-border/50 bg-card rounded-2xl font-bold text-xs h-10 hover:bg-accent/40"
            >
              <Brain className="w-4 h-4 mr-2 text-purple-500" /> AI Memory Box
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
