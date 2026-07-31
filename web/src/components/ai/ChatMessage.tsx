"use client";

import { useState } from "react";
import { User, Copy, Volume2, RefreshCw, ThumbsUp, ThumbsDown, Share2, Edit3, Check } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { KnoMascot } from "./KnoMascot";
import { MarkdownRenderer } from "./MarkdownRenderer";

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatMessageProps {
  message?: MessageItem;
  // Legacy format support
  chat?: {
    id?: string;
    message?: string;
    response?: string;
  };
  isLatest?: boolean;
  onRegenerate?: () => void;
  onEditPrompt?: (promptText: string) => void;
}

export function ChatMessage({ message, chat, isLatest, onRegenerate, onEditPrompt }: ChatMessageProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);

  // Safely extract message text content from any message or chat structure format
  const isUserMsg = message ? message.role === "user" : (chat ? !!chat.message : false);
  const contentText = message
    ? (message.content ?? (message as any).response ?? (message as any).text ?? (message as any).message ?? "")
    : (chat ? (isUserMsg ? (chat.message ?? "") : (chat.response ?? "")) : "");

  const isSecurityAlert = typeof contentText === "string" && (
    contentText.includes("KnoVault Security Shield") || contentText.includes("Security Warning")
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied message to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech not supported in this browser");
    }
  };

  const handleShare = (text: string) => {
    if (navigator.share) {
      navigator.share({
        title: "KnoVault AI Chat Snippet",
        text: text,
      }).catch(() => {});
    } else {
      handleCopy(text);
    }
  };

  // If rendering legacy dual chat format (ChatMessage with chat object)
  if (chat && !message) {
    return (
      <div className="space-y-6 w-full max-w-3xl mx-auto">
        {/* User Message */}
        {chat.message && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 flex-row-reverse"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 shadow-xs">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] text-xs font-medium leading-relaxed shadow-sm">
              {chat.message}
            </div>
          </motion.div>
        )}

        {/* AI Response */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3.5"
        >
          <KnoMascot state={chat.response ? "idle" : "thinking"} className="w-8 h-8 rounded-xl shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2 max-w-[88%]">
            <div className="bg-card/75 border border-border/40 text-foreground px-4 py-3.5 rounded-2xl rounded-tl-sm shadow-xs backdrop-blur-md">
              <MarkdownRenderer content={chat.response || ""} />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3.5 group ${isUserMsg ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {isUserMsg ? (
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 shadow-xs">
            <User className="w-4 h-4 text-primary" />
          </div>
        ) : (
          <KnoMascot state="idle" className="w-8 h-8 rounded-xl shrink-0 shadow-xs border border-border/30" />
        )}
      </div>

      {/* Bubble Content */}
      <div className={`space-y-1.5 max-w-[85%] md:max-w-[78%] ${isUserMsg ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs font-medium transition-all ${
            isUserMsg
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : isSecurityAlert
              ? "bg-red-500/10 border border-red-500/30 text-foreground rounded-tl-sm"
              : "bg-card/90 border border-border/40 text-foreground rounded-tl-sm backdrop-blur-md"
          }`}
        >
          {!isUserMsg && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1 mb-1 select-none">
              {isSecurityAlert ? "🔒 Security Shield" : "✨ KnoVault AI"}
            </span>
          )}

          {isUserMsg ? (
            <span className="whitespace-pre-wrap">{contentText}</span>
          ) : (
            <MarkdownRenderer content={contentText || ""} />
          )}
        </div>

        {/* Action Toolbar Below Message */}
        <div className={`flex items-center gap-1.5 pt-0.5 px-1 text-muted-foreground ${isUserMsg ? "justify-end" : "justify-start"}`}>
          {isUserMsg ? (
            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => handleCopy(contentText || "")}
                className="p-1 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[11px]"
                title="Copy prompt"
                aria-label="Copy prompt text to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              {onEditPrompt && (
                <button
                  onClick={() => onEditPrompt(contentText || "")}
                  className="p-1 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[11px]"
                  title="Edit prompt"
                  aria-label="Edit prompt text"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          ) : !isSecurityAlert ? (
            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => handleCopy(contentText || "")}
                className="p-1 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => handleSpeak(contentText || "")}
                className="p-1 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Read aloud"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              {onRegenerate && isLatest && (
                <button
                  onClick={onRegenerate}
                  className="p-1 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="w-px h-3 bg-border/40 mx-0.5" />

              <button
                onClick={() => {
                  setFeedback(feedback === "up" ? null : "up");
                  toast.success("Feedback recorded: Helpful");
                }}
                className={`p-1 rounded-lg transition-colors ${feedback === "up" ? "text-purple-400 bg-purple-500/10" : "hover:bg-accent/50 hover:text-foreground"}`}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setFeedback(feedback === "down" ? null : "down");
                  toast.info("Feedback recorded: Unhelpful");
                }}
                className={`p-1 rounded-lg transition-colors ${feedback === "down" ? "text-rose-400 bg-rose-500/10" : "hover:bg-accent/50 hover:text-foreground"}`}
                title="Unhelpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleShare(contentText || "")}
                className="p-1 rounded-lg hover:bg-accent/50 hover:text-foreground transition-colors ml-0.5"
                title="Share message"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
