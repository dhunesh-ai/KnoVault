"use client";

import { AIChatMessage } from "@/types/AIChat";
import { User, Copy, Volume2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { KnoMascot } from "./KnoMascot";

interface ChatMessageProps {
  chat: AIChatMessage;
  isLatest: boolean;
  onRegenerate?: () => void;
}

export function ChatMessage({ chat, isLatest, onRegenerate }: ChatMessageProps) {
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech not supported in this browser");
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* User Message */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4 flex-row-reverse"
      >
        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="bg-purple-600 text-foreground px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] whitespace-pre-wrap text-[15px] leading-relaxed shadow-md">
          {chat.message}
        </div>
      </motion.div>

      {/* AI Response */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-start gap-4"
      >
        <div className="shrink-0 mt-1">
          {chat.response === "" ? (
            <KnoMascot state="thinking" className="w-8 h-8 rounded-xl" />
          ) : (
            <KnoMascot state="idle" className="w-8 h-8 rounded-xl" />
          )}
        </div>
        
        <div className="flex-1 space-y-2 max-w-[85%] sm:max-w-[75%]">
          {chat.response === "" ? (
            <div className="bg-card border border-border px-4 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5 w-16 h-[46px]">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <>
              <div className="bg-card border border-border text-foreground px-4 py-3 rounded-2xl rounded-tl-sm whitespace-pre-wrap text-[15px] leading-relaxed shadow-sm prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-background prose-pre:border prose-pre:border-border">
                {chat.response}
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                <button 
                  onClick={() => handleCopy(chat.response)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                  title="Copy text"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleSpeak(chat.response)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                  title="Read aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                {isLatest && onRegenerate && (
                  <button 
                    onClick={onRegenerate}
                    className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                    title="Regenerate response"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
