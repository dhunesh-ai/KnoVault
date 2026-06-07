 
"use client";

import { useEffect, useRef, useState } from "react";
import { useAIStore } from "@/store/useAIStore";
import { useMedicineStore } from "@/store/useMedicineStore";
import { useSpecialDaysStore } from "@/store/useSpecialDaysStore";
import { useGoalsStore } from "@/store/useGoalsStore";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { KnoMascot } from "@/components/ai/KnoMascot";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquarePlus, Sparkles, Activity, Target, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isToday } from "date-fns";

export default function AIPage() {
  const {
    history,
    suggestions,
    isLoading,
    isSending,
    mascotState,
    fetchHistory,
    fetchSuggestions,
    sendMessage,
    clearHistory,
    setMascotState
  } = useAIStore();

  const { reminders: medicineReminders, fetchMedicines } = useMedicineStore();
  const { specialDays, fetchSpecialDays } = useSpecialDaysStore();
  const { stats: goalStats, fetchGoals } = useGoalsStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [contextLoaded, setContextLoaded] = useState(false);

  useEffect(() => {
    fetchHistory();
    fetchSuggestions();
    
    // Fetch context data silently to build "Smart Context Cards"
    Promise.all([
      fetchMedicines(),
      fetchSpecialDays(),
      fetchGoals()
    ]).then(() => setContextLoaded(true));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSendMessage = async (msg: string) => {
    // Collect context
    let contextStr = "";
    if (contextLoaded) {
      const todayMed = medicineReminders.filter(r => isToday(new Date(r.reminder_date)));
      const todaySD = specialDays.filter(sd => sd.is_recurring ? true : isToday(new Date(sd.date))); // simplified
      
      contextStr = `Current context:\n` +
      `- Medicines today: ${todayMed.length} doses scheduled, ${todayMed.filter(r => r.is_completed).length} taken.\n` +
      `- Goals today: ${goalStats?.today_completed || 0} completed out of ${goalStats?.today_total || 0}.\n` +
      `- Goal Streak: ${goalStats?.streak || 0} days.\n`;
    }

    try {
      await sendMessage(msg, contextStr);
    } catch (e) {
      // handled
    }
  };

  const todayMedsCount = medicineReminders.filter(r => isToday(new Date(r.reminder_date)) && !r.is_completed).length;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden -mx-4 sm:mx-0 px-4 sm:px-0">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border shrink-0 z-10">
        <div className="flex items-center gap-3">
          <KnoMascot state={mascotState} className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              KnoVault AI
            </h1>
            <p className="text-xs text-muted-foreground">Powered by advanced intelligence</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10" onClick={() => clearHistory()}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="outline" className="border-border text-foreground bg-card hover:bg-muted hidden sm:flex" onClick={() => clearHistory()}>
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto pt-6 pb-24 scroll-smooth" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          
          {history.length === 0 && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center pt-12 pb-8 text-center"
            >
              <KnoMascot state="idle" className="w-20 h-20 mb-6" />
              <h2 className="text-2xl font-bold text-foreground mb-2">How can I help you today?</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                I can summarize your secure notes, check your medicine schedule, or analyze your goal progress.
              </p>

              {/* Smart Context Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
                <div 
                  className="bg-card border border-border rounded-xl p-4 text-left hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleSendMessage("What is my medicine schedule for today?")}
                >
                  <Activity className="w-5 h-5 text-rose-400 mb-2" />
                  <h4 className="font-semibold text-foreground text-sm mb-1">Medicines</h4>
                  <p className="text-xs text-muted-foreground">{todayMedsCount > 0 ? `${todayMedsCount} doses remaining` : 'All caught up'}</p>
                </div>
                <div 
                  className="bg-card border border-border rounded-xl p-4 text-left hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleSendMessage("What are my goal analytics looking like?")}
                >
                  <Target className="w-5 h-5 text-purple-400 mb-2" />
                  <h4 className="font-semibold text-foreground text-sm mb-1">Goal Analytics</h4>
                  <p className="text-xs text-muted-foreground">{goalStats?.streak ? `${goalStats.streak} day streak` : 'Check progress'}</p>
                </div>
                <div 
                  className="bg-card border border-border rounded-xl p-4 text-left hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleSendMessage("Are there any upcoming special days?")}
                >
                  <PartyPopper className="w-5 h-5 text-pink-400 mb-2" />
                  <h4 className="font-semibold text-foreground text-sm mb-1">Special Days</h4>
                  <p className="text-xs text-muted-foreground">{specialDays.length > 0 ? `${specialDays.length} events saved` : 'Track events'}</p>
                </div>
              </div>
              
              {/* Suggestions */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-full px-4 py-2 text-xs font-medium transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Chat Messages */}
          <div className="space-y-6">
            <AnimatePresence>
              {history.map((chat, idx) => (
                <ChatMessage 
                  key={chat.id} 
                  chat={chat} 
                  isLatest={idx === history.length - 1}
                  onRegenerate={idx === history.length - 1 ? () => handleSendMessage(chat.message) : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Input Area - Docked to bottom */}
      <div className="absolute bottom-4 left-4 right-4 sm:left-0 sm:right-0">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isSending} />
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            KnoVault AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
      
    </div>
  );
}
