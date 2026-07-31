"use client";

import { useEffect, useRef, useState } from "react";
import { useChatThreadsStore } from "@/store/useChatThreadsStore";
import { useMemoryStore } from "@/store/useMemoryStore";
import { useMedicineStore } from "@/store/useMedicineStore";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
import { useGoalsStore } from "@/store/useGoalsStore";
import { aiService } from "@/services/ai";
import { KnoMascot } from "@/components/ai/KnoMascot";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Plus,
  Pin,
  Trash2,
  Edit2,
  Download,
  Brain,
  Search,
  PinOff,
  X,
  Check,
  Activity,
  Target,
  PartyPopper,
  PanelLeft,
  Glasses,
  MoreHorizontal,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isToday, format } from "date-fns";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AIPage() {
  const {
    threads,
    activeThreadId,
    searchQuery,
    fetchThreads,
    createThread,
    deleteThread,
    renameThread,
    togglePinThread,
    setActiveThreadId,
    addMessage,
    syncResponse,
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [mascotState, setMascotState] = useState<"idle" | "thinking" | "success">("idle");
  const [isTempChat, setIsTempChat] = useState(false);
  const [tempChatMessages, setTempChatMessages] = useState<any[]>([]);

  // Controls for sidebar & modals
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  useEffect(() => {
    // Fetch context data silently to build Smart Context Cards
    Promise.all([
      fetchMedicines(),
      fetchSpecialDays(),
      fetchGoals()
    ]).then(() => setContextLoaded(true));
  }, []);

  // Fetch threads from server & setup real-time polling
  useEffect(() => {
    fetchThreads();
    const interval = setInterval(() => {
      fetchThreads();
    }, 5000);

    const handleFocus = () => {
      fetchThreads();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const currentMessages = isTempChat ? tempChatMessages : (activeThread?.messages || []);

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
  }, [currentMessages.length, isSending]);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeThreadId]);

  // Handle scroll event to show/hide floating "Scroll to bottom" button
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollBottomBtn(isFarFromBottom);
    }
  };

  // Client-Side Secure Notes Interceptor Check
  const checkSecureNotesQuery = (message: string): boolean => {
    const lower = message.toLowerCase();
    const hasSecureKeywords = ["secure note", "locked note", "vault note", "private note", "secure notes", "locked notes", "vault notes", "private notes"].some(
      (kw) => lower.includes(kw)
    );
    if (hasSecureKeywords) return true;
    const hasSec = ["secure", "locked", "vault", "private"].some((w) => lower.includes(w));
    const hasNot = ["note", "notes"].some((w) => lower.includes(w));
    return hasSec && hasNot;
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

    // Build context string
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
        { conversation_id: isTempChat ? undefined : (activeThreadId || undefined), message: userQuery, context: contextStr, is_temporary: isTempChat },
        controller.signal
      );
      if (isTempChat) {
        const assistantMsg = {
          id: `temp_msg_${Date.now() + 1}`,
          role: "assistant",
          content: response.response || (typeof response === "string" ? response : ""),
          timestamp: new Date().toISOString(),
        };
        setTempChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        const userObj = response.user_message || { id: `user_${Date.now()}`, content: response.message || userQuery, created_at: new Date().toISOString() };
        const assistantObj = response.assistant_message || { id: `asst_${Date.now()}`, content: response.response, created_at: new Date().toISOString() };
        syncResponse(
          response.conversation_id,
          response.title,
          userObj,
          assistantObj,
          response.response
        );
      }
      setMascotState("success");
      setTimeout(() => setMascotState("idle"), 2500);
    } catch (e: any) {
      if (e?.name === "CanceledError" || e?.name === "AbortError" || e?.code === "ERR_CANCELED") {
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

  const handleCreateNewThread = async () => {
    setIsTempChat(false);
    setTempChatMessages([]);
    await createThread();
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
    <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
      {/* Search bar inside conversation history */}
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
        <Input
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 bg-card/60 border-border/30 text-xs h-7.5 rounded-xl focus-visible:ring-primary/30 text-foreground"
        />
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 scrollbar-hide">
        {filteredThreads.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-medium">
            No conversations found
          </div>
        ) : (
          filteredThreads.map((t) => {
            const isActive = t.id === activeThreadId && !isTempChat;
            const isEditing = editingThreadId === t.id;
            const lastMsg = t.messages[t.messages.length - 1];
            const timestampStr = t.updatedAt
              ? format(new Date(t.updatedAt), "MMM d")
              : lastMsg?.timestamp
              ? format(new Date(lastMsg.timestamp), "MMM d")
              : "";

            return (
              <div
                key={t.id}
                onClick={() => {
                  if (!isEditing) {
                    setIsTempChat(false);
                    setActiveThreadId(t.id);
                    if (onSelect) onSelect();
                  }
                }}
                className={`group relative rounded-xl border px-2.5 py-2 flex flex-col justify-between transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary/10 border-primary/40 text-foreground shadow-2xs"
                    : "bg-card/30 border-border/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  {isEditing ? (
                    <div className="flex gap-1 w-full items-center" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        className="bg-card text-xs h-6 py-0 px-1.5 rounded-lg"
                        autoFocus
                        maxLength={35}
                      />
                      <Button size="icon" variant="ghost" onClick={() => handleRenameSubmit(t.id)} className="w-5 h-5 shrink-0 rounded-lg">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingThreadId(null)} className="w-5 h-5 shrink-0 rounded-lg">
                        <X className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
                      {t.isPinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                      <span className={`font-semibold text-xs truncate ${isActive ? "text-foreground font-bold" : "text-foreground/90"}`}>
                        {t.title}
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {timestampStr && (
                        <span className="text-[9px] font-medium text-muted-foreground/60 group-hover:hidden transition-all">
                          {timestampStr}
                        </span>
                      )}
                      <div className="hidden group-hover:flex items-center gap-0.5 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinThread(t.id);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-primary rounded-md"
                          title={t.isPinned ? "Unpin" : "Pin"}
                        >
                          {t.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingThreadId(t.id);
                            setRenameText(t.title);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-foreground rounded-md"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(t.id);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-destructive rounded-md"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtitle preview & count */}
                {lastMsg && (
                  <p className="text-[10.5px] text-muted-foreground/70 truncate mt-0.5 font-normal pl-3">
                    {lastMsg.content}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-2.5 md:gap-3 flex-1 min-h-0 w-full h-[calc(100vh-theme(spacing.16))] overflow-hidden pb-1">
      
      {/* Collapsible Threads Sidebar Panel (Desktop ≥1024px, 260px target width) */}
      <motion.div
        animate={{ width: isSidebarCollapsed ? "52px" : "260px" }}
        transition={{ type: "spring", damping: 22, stiffness: 220 }}
        className="shrink-0 bg-card/45 backdrop-blur-xl border border-border/40 rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden hidden lg:flex shadow-2xs relative"
      >
        {isSidebarCollapsed ? (
          <div className="flex flex-col items-center gap-3 py-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-8 h-8 rounded-xl hover:bg-accent text-foreground"
              title="Expand conversation history (>)"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCreateNewThread}
              className="w-8 h-8 rounded-xl hover:bg-primary/20 text-primary"
              title="New Chat (+)"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMemoryOpen(true)}
              className="w-8 h-8 rounded-xl hover:bg-purple-500/10 text-purple-400"
              title="AI Memory Box (🧠)"
            >
              <Brain className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                const nextState = !isTempChat;
                setIsTempChat(nextState);
                if (nextState) setTempChatMessages([]);
                toast.info(nextState ? "Incognito Chat Active" : "Normal Chat Active");
              }}
              className={`w-8 h-8 rounded-xl transition-colors ${isTempChat ? "bg-purple-500/20 text-purple-300" : "hover:bg-accent text-muted-foreground"}`}
              title="Incognito Session"
            >
              <Glasses className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
              {/* Sidebar Header & Collapse Toggle */}
              <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-border/20 shrink-0 px-1">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <h2 className="font-bold text-foreground text-[11px] uppercase tracking-wider">
                    History
                  </h2>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCreateNewThread}
                    className="w-6.5 h-6.5 rounded-lg hover:bg-primary/10 text-primary"
                    title="New Chat"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="w-6.5 h-6.5 rounded-lg hover:bg-accent"
                    title="Collapse Sidebar"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {renderThreadsContent()}
            </div>

            {/* Sidebar Footer */}
            <div className="shrink-0 pt-2 border-t border-border/20 mt-1">
              <Button
                onClick={() => setMemoryOpen(true)}
                variant="outline"
                className="w-full border-border/40 bg-card/60 rounded-xl font-bold text-xs h-8 hover:bg-accent/40 flex items-center justify-center gap-1.5"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Memory Box</span>
              </Button>
            </div>
          </>
        )}
      </motion.div>

      {/* Main Chat Assistant Board (75–80% Desktop Width Primary Focus) */}
      <div className="flex-1 bg-card/35 backdrop-blur-xl border border-border/40 rounded-2xl md:rounded-3xl flex flex-col overflow-hidden relative shadow-2xs min-w-0">
        
        {/* Compact Top Header Bar (~48px height) */}
        <div className="shrink-0 h-11 md:h-12 px-3 md:px-5 border-b border-border/30 flex items-center justify-between bg-card/60 backdrop-blur-xl z-10 shadow-2xs">
          {/* Left Section: Avatar, Title, Status + Mobile Drawer Trigger */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile/Tablet Drawer Toggle (< lg) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden h-7.5 w-7.5 rounded-lg border border-border/30 bg-card text-foreground shrink-0"
              title="Open Conversations"
            >
              <PanelLeft className="w-3.5 h-3.5 text-primary" />
            </Button>

            <div className="relative shrink-0">
              <KnoMascot state={mascotState} className="w-7 h-7 rounded-lg shrink-0 border border-border/30" />
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs md:text-sm font-bold text-foreground tracking-tight truncate max-w-[180px] sm:max-w-[320px] md:max-w-[480px]">
                  {isTempChat ? "Incognito Session" : (activeThread?.title || "AI Chat Session")}
                </h1>
                {isTempChat && (
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[8px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-1 shrink-0">
                    <Glasses className="w-2.5 h-2.5 text-purple-400" /> Incognito
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isTempChat ? "bg-purple-400" : "bg-emerald-500"} animate-pulse shrink-0`} />
                <span>{isTempChat ? "Temporary Session" : "Active"}</span>
              </p>
            </div>
          </div>

          {/* Right Section: Compact Icon Actions + Overflow Menu */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCreateNewThread}
              className="h-7.5 w-7.5 rounded-lg hover:bg-primary/10 text-primary"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </Button>

            {/* Header Overflow Dropdown Menu (⋮) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7.5 w-7.5 rounded-lg hover:bg-accent text-foreground"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl text-xs">
                <DropdownMenuItem
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
                  className="rounded-xl flex items-center gap-2 py-2 cursor-pointer font-medium"
                >
                  <Glasses className="w-4 h-4 text-purple-400" />
                  <span>{isTempChat ? "Exit Incognito Mode" : "Incognito Session"}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setMemoryOpen(true)}
                  className="rounded-xl flex items-center gap-2 py-2 cursor-pointer font-medium"
                >
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span>AI Memory Box</span>
                </DropdownMenuItem>

                {activeThread && activeThread.messages.length > 0 && !isTempChat && (
                  <>
                    <DropdownMenuSeparator className="bg-border/30 my-1" />
                    <DropdownMenuItem
                      onClick={() => handleExport(activeThread.id)}
                      className="rounded-xl flex items-center gap-2 py-2 cursor-pointer font-medium"
                    >
                      <Download className="w-4 h-4 text-blue-400" />
                      <span>Export Markdown</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => deleteThread(activeThread.id)}
                      className="rounded-xl flex items-center gap-2 py-2 cursor-pointer text-destructive focus:text-destructive font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Thread</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Temporary Chat Glassmorphism Banner */}
        <AnimatePresence>
          {isTempChat && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mx-4 mt-2.5 px-3.5 py-2 rounded-2xl bg-purple-950/40 border border-purple-500/30 backdrop-blur-md flex items-center gap-2.5 text-xs text-purple-200 shadow-sm shrink-0"
            >
              <Glasses className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
              <span className="font-medium text-[11px]">
                Incognito mode active. Messages are processed live but never saved in history or memory.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Centered Message Feed Grid (70-75% Width Max Container) */}
        <div
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0 scrollbar-hide relative"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {currentMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center pt-8 pb-8 text-center max-w-2xl mx-auto"
            >
              <KnoMascot state="idle" className="w-16 h-16 mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">
                {isTempChat ? "Incognito AI Chat Session" : "How can KnoVault AI help today?"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                {isTempChat
                  ? "Temporary chat session. Messages are cleared when closed."
                  : "I can summarize medicines, check goal streaks, lookup calendar events, and manage tasks."}
              </p>

              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-6">
                <div
                  className="bg-card/50 border border-border/40 hover:border-rose-500/30 rounded-2xl p-4 text-left hover:bg-accent/20 transition-all cursor-pointer shadow-2xs"
                  onClick={() => handleSendMessage("What is my medicine schedule for today?")}
                >
                  <Activity className="w-4.5 h-4.5 text-rose-500 mb-1.5" />
                  <h4 className="font-bold text-foreground text-xs mb-0.5">Medicines</h4>
                  <p className="text-[10px] text-muted-foreground/80 font-medium">
                    {todayMedsCount > 0 ? `${todayMedsCount} doses remaining` : "All caught up"}
                  </p>
                </div>

                <div
                  className="bg-card/50 border border-border/40 hover:border-purple-500/30 rounded-2xl p-4 text-left hover:bg-accent/20 transition-all cursor-pointer shadow-2xs"
                  onClick={() => handleSendMessage("What are my goal analytics looking like?")}
                >
                  <Target className="w-4.5 h-4.5 text-purple-500 mb-1.5" />
                  <h4 className="font-bold text-foreground text-xs mb-0.5">Goal Streak</h4>
                  <p className="text-[10px] text-muted-foreground/80 font-medium">
                    {goalStats?.streak ? `${goalStats.streak} day streak` : "Check progress"}
                  </p>
                </div>

                <div
                  className="bg-card/50 border border-border/40 hover:border-pink-500/30 rounded-2xl p-4 text-left hover:bg-accent/20 transition-all cursor-pointer shadow-2xs"
                  onClick={() => handleSendMessage("Are there any upcoming special days?")}
                >
                  <PartyPopper className="w-4.5 h-4.5 text-pink-500 mb-1.5" />
                  <h4 className="font-bold text-foreground text-xs mb-0.5">Special Days</h4>
                  <p className="text-[10px] text-muted-foreground/80 font-medium">
                    {specialDays.length > 0 ? `${specialDays.length} logs saved` : "Track events"}
                  </p>
                </div>
              </div>

              {/* Prompt Suggestions */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
                {[
                  "What's my schedule today?",
                  "Analyze my daily goals",
                  "Summarize my upcoming reminders"
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug)}
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              <AnimatePresence>
                {currentMessages.map((msg: any, index: number) => (
                  <ChatMessage
                    key={msg.id || index}
                    message={msg}
                    isLatest={index === currentMessages.length - 1}
                    onRegenerate={() => {
                      if (currentMessages.length > 1) {
                        const lastUserMsg = [...currentMessages].reverse().find((m) => m.role === "user");
                        if (lastUserMsg) {
                          handleSendMessage(lastUserMsg.content);
                        }
                      }
                    }}
                  />
                ))}
              </AnimatePresence>

              {isSending && (
                <div className="flex items-start gap-3.5">
                  <KnoMascot state="thinking" className="w-8 h-8 rounded-xl shrink-0" />
                  <div className="bg-card/80 border border-border/40 rounded-2xl px-4 py-3 flex items-center gap-1.5 w-16 h-9 backdrop-blur-md">
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

        {/* Floating Scroll to Bottom Button */}
        <AnimatePresence>
          {showScrollBottomBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-20 right-6 z-20 w-9 h-9 rounded-full bg-primary text-primary-foreground border border-primary/40 shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95"
              title="Scroll to latest message"
            >
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Docked ChatGPT-Style Pill Input Bar */}
        <div className="shrink-0 p-3 md:p-4 bg-card/60 backdrop-blur-xl border-t border-border/20">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSendMessage={handleSendMessage}
              onStopGeneration={handleStopGeneration}
              isLoading={isSending}
              isTempChat={isTempChat}
            />
          </div>
        </div>
      </div>

      {/* Memory Profile Box Modal */}
      <Dialog open={memoryOpen} onOpenChange={setMemoryOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-border/50 text-foreground rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-lg">
              <Brain className="w-5.5 h-5.5 text-purple-500" /> AI Profile Memories
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-semibold">
              Manage facts or custom prompt style guidelines saved for your chatbot assistant context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Remember a fact/preference:</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Speak in bullet points. I work as a team lead..."
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  className="bg-accent/25 border-border/40 text-xs rounded-2xl h-10"
                />
                <Button size="sm" onClick={handleAddMemory} className="rounded-2xl bg-primary text-white h-10 px-4 font-bold text-xs shrink-0 shadow-xs">Save</Button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pt-1 scrollbar-hide">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
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
        <SheetContent side="left" className="w-[85vw] max-w-[340px] p-4 bg-card/95 backdrop-blur-2xl border-r border-border/40 text-foreground flex flex-col justify-between h-full">
          <SheetHeader className="p-0 pb-2 border-b border-border/20 flex flex-row items-center justify-between">
            <SheetTitle className="font-bold text-foreground text-base flex items-center gap-2">
              <MessageSquare className="w-4.5 h-4.5 text-primary" /> History
            </SheetTitle>
            <Button
              size="sm"
              onClick={() => {
                handleCreateNewThread();
                setMobileDrawerOpen(false);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-8 px-3 flex items-center gap-1 shrink-0 mr-6"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0 pt-3">
            {renderThreadsContent(() => setMobileDrawerOpen(false))}
          </div>

          <div className="shrink-0 pt-3 border-t border-border/20 mt-2">
            <Button
              onClick={() => {
                setMemoryOpen(true);
                setMobileDrawerOpen(false);
              }}
              variant="outline"
              className="w-full border-border/50 bg-card rounded-2xl font-bold text-xs h-9 hover:bg-accent/40"
            >
              <Brain className="w-4 h-4 mr-2 text-purple-500" /> AI Memory Box
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
