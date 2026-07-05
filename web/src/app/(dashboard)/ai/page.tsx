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
  ShieldAlert
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
  const recognitionRef = useRef<any>(null);

  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mascotState, setMascotState] = useState<"idle" | "thinking" | "success">("idle");
  
  // Dialog open controls
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");
  
  // Thread rename controls
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

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
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages, isSending]);

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

  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim() || !activeThreadId) return;

    const userQuery = msgText.trim();
    setInputVal("");
    addMessage(activeThreadId, "user", userQuery);
    setIsSending(true);
    setMascotState("thinking");

    // Client-side secure notes interceptor trigger
    if (checkSecureNotesQuery(userQuery)) {
      setTimeout(() => {
        const warning = "⚠️ KnoVault Security Shield: Secure Notes are end-to-end encrypted and completely isolated from KnoVault AI. To protect your privacy, the AI Chat Assistant cannot read, search, summarize, or retrieve contents from your Secure Notes. Please access them manually within the Secure Vault.";
        addMessage(activeThreadId, "assistant", warning);
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
      const response = await aiService.chat({ message: userQuery, context: contextStr });
      addMessage(activeThreadId, "assistant", response.response);
      setMascotState("success");
      setTimeout(() => setMascotState("idle"), 2500);
    } catch (e) {
      addMessage(activeThreadId, "assistant", "Error: I'm unable to reach the AI servers. Please check your connection.");
      setMascotState("idle");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateNewThread = () => {
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

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)] overflow-hidden -mx-4 sm:mx-0 px-4 sm:px-0">
      
      {/* Threads Sidebar Panel */}
      <div className="w-80 shrink-0 bg-card/40 border border-border/80 rounded-2xl p-4 flex flex-col justify-between overflow-hidden hidden md:flex">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Sidebar Header & Create button */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40 shrink-0">
            <h2 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary" /> Conversations
            </h2>
            <Button size="icon" variant="ghost" onClick={handleCreateNewThread} className="w-8 h-8 rounded-lg">
              <Plus className="w-4 h-4 text-foreground" />
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-card border-border text-xs focus-visible:ring-primary/50"
            />
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
            {filteredThreads.map((t) => {
              const isActive = t.id === activeThreadId;
              const isEditing = editingThreadId === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => !isEditing && setActiveThreadId(t.id)}
                  className={`group relative rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary/5 border-primary/50 text-foreground"
                      : "bg-card/40 border-border/40 text-muted-foreground hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <div className="flex gap-1.5 w-full items-center" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          className="bg-card text-xs h-7 py-0 px-2"
                          autoFocus
                          maxLength={35}
                        />
                        <Button size="icon" variant="ghost" onClick={() => handleRenameSubmit(t.id)} className="w-6 h-6 shrink-0">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingThreadId(null)} className="w-6 h-6 shrink-0">
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="font-bold text-xs truncate max-w-[180px] text-foreground">
                        {t.title}
                      </span>
                    )}

                    {!isEditing && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinThread(t.id);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
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
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(t.id);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2">
                    <span>{t.messages.length} messages</span>
                    {t.isPinned && (
                      <span className="flex items-center gap-0.5 text-primary uppercase font-bold text-[8px] tracking-wider bg-primary/10 px-1 rounded">
                        Pinned
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="shrink-0 pt-4 border-t border-border/40 mt-4">
          <Button onClick={() => setMemoryOpen(true)} variant="outline" className="w-full border-border bg-card">
            <Brain className="w-4 h-4 mr-2 text-purple-400" /> AI Memory Box
          </Button>
        </div>
      </div>

      {/* Main Chat Assistant Board */}
      <div className="flex-1 bg-card/20 border border-border/60 rounded-2xl flex flex-col overflow-hidden relative">
        
        {/* Top Header Bar */}
        <div className="shrink-0 p-4 border-b border-border/40 flex items-center justify-between bg-card/60 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <KnoMascot state={mascotState} className="w-10 h-10 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-foreground truncate max-w-[200px]">
                {activeThread?.title || "KnoVault AI Assistant"}
              </h1>
              <p className="text-[10px] text-muted-foreground">Always active, secure assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMemoryOpen(true)}
              className="border-border bg-card md:hidden flex"
            >
              <Brain className="w-3.5 h-3.5 mr-1 text-purple-400" /> Memory
            </Button>
            {activeThread && activeThread.messages.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(activeThread.id)}
                  className="border-border bg-card"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-blue-400" /> Export MD
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteThread(activeThread.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewThread}
              className="border-border bg-card hidden sm:flex"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Chat
            </Button>
          </div>
        </div>

        {/* Message Feed Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0" ref={scrollRef}>
          {(!activeThread || activeThread.messages.length === 0) ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center pt-8 pb-8 text-center"
            >
              <KnoMascot state="idle" className="w-20 h-20 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-1">Welcome to KnoVault AI</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                I can summarize medicines, check streaks, log goals, and lookup files.
              </p>

              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
                <div
                  className="bg-card border border-border/80 hover:border-rose-500/50 rounded-xl p-4 text-left hover:bg-muted/40 transition-all cursor-pointer"
                  onClick={() => handleSendMessage("What is my medicine schedule for today?")}
                >
                  <Activity className="w-5 h-5 text-rose-400 mb-2" />
                  <h4 className="font-semibold text-foreground text-sm mb-0.5">Medicines</h4>
                  <p className="text-xs text-muted-foreground">
                    {todayMedsCount > 0 ? `${todayMedsCount} doses remaining` : "All caught up"}
                  </p>
                </div>
                <div
                  className="bg-card border border-border/80 hover:border-purple-500/50 rounded-xl p-4 text-left hover:bg-muted/40 transition-all cursor-pointer"
                  onClick={() => handleSendMessage("What are my goal analytics looking like?")}
                >
                  <Target className="w-5 h-5 text-purple-400 mb-2" />
                  <h4 className="font-semibold text-foreground text-sm mb-0.5">Goal Streak</h4>
                  <p className="text-xs text-muted-foreground">
                    {goalStats?.streak ? `${goalStats.streak} day streak` : "Check progress"}
                  </p>
                </div>
                <div
                  className="bg-card border border-border/80 hover:border-pink-500/50 rounded-xl p-4 text-left hover:bg-muted/40 transition-all cursor-pointer"
                  onClick={() => handleSendMessage("Are there any upcoming special days?")}
                >
                  <PartyPopper className="w-5 h-5 text-pink-400 mb-2" />
                  <h4 className="font-semibold text-foreground text-sm mb-0.5">Special Days</h4>
                  <p className="text-xs text-muted-foreground">
                    {specialDays.length > 0 ? `${specialDays.length} logs saved` : "Track events"}
                  </p>
                </div>
              </div>

              {/* Prompt Suggestions */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                {[
                  "What's my schedule today?",
                  "Analyze my daily goals",
                  "Suggest healthy habit tips"
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug)}
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              <AnimatePresence>
                {activeThread.messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const isSecurityAlert = msg.content.includes("KnoVault Security Shield");

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {isUser ? (
                          <div className="w-8 h-8 rounded-full bg-accent border border-border flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <KnoMascot state="idle" className="w-8 h-8 rounded-xl" />
                        )}
                      </div>

                      <div className="space-y-1.5 max-w-[85%] sm:max-w-[75%]">
                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : isSecurityAlert
                            ? "bg-red-500/10 border border-red-500/25 text-foreground rounded-tl-sm"
                            : "bg-card border border-border text-foreground rounded-tl-sm"
                        }`}>
                          {!isUser && (
                            <span className="text-[9px] uppercase font-bold tracking-wider text-purple-400 block mb-1">
                              {isSecurityAlert ? "🔒 Privacy shield blocker" : "✨ KnoVault AI"}
                            </span>
                          )}
                          {msg.content}
                        </div>

                        {!isUser && !isSecurityAlert && (
                          <div className="flex gap-2 pl-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                toast.success("Copied!");
                              }}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                              title="Copy text"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleSpeak(msg.content)}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded"
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
                  <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-1.5 w-16 h-10">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar Docked to Bottom */}
        <div className="shrink-0 p-4 border-t border-border/40 bg-card/60 backdrop-blur-md">
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
              className={`rounded-xl border-border shrink-0 transition-colors ${
                isListening ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" : "bg-card"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            <Input
              placeholder="Ask a question about medicines, streak, goals..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-card border-border rounded-xl text-sm"
              disabled={isSending}
            />

            <Button type="submit" size="icon" disabled={isSending} className="bg-primary hover:bg-primary-hover text-white rounded-xl shrink-0">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>

      {/* Memory Profile Box Modal */}
      <Dialog open={memoryOpen} onOpenChange={setMemoryOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" /> AI Profile Memories
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Manage facts or custom prompt style guidelines saved for your chatbot assistant context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            
            {/* Add memory item */}
            <div className="space-y-2">
              <label className="text-xs font-semibold">Remember a fact/preference:</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Speak in bullet points. I work as a team lead..."
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  className="bg-card border-border text-xs"
                />
                <Button size="sm" onClick={handleAddMemory}>Save</Button>
              </div>
            </div>

            {/* List memories */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pt-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                Saved memories ({memories.length})
              </span>
              
              {memories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No memories saved yet.</p>
              ) : (
                memories.map((m) => (
                  <div key={m.id} className="flex justify-between items-center text-xs bg-accent/40 px-3 py-2 border border-border/40 rounded-xl gap-2">
                    <span className="text-foreground">{m.content}</span>
                    <button
                      onClick={() => {
                        deleteMemory(m.id);
                        toast.success("Memory deleted");
                      }}
                      className="text-destructive hover:text-destructive/80 text-[10px] shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>

          <DialogFooter>
            <Button onClick={() => setMemoryOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
