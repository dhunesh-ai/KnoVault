"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  isLoading: boolean;
  isTempChat?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  onStopGeneration,
  isLoading,
  isTempChat = false,
  placeholder,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setMessage((prev) => (prev ? prev + " " + transcript : transcript));
          } else {
            currentTranscript += transcript;
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error("Microphone error. Please check browser permissions.");
        }
      };
    }
  }, []);

  const handleToggleListen = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info("Listening... Speak now");
    }
  };

  const handleSend = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const finalQuery = message.trim();
    if (finalQuery && !isLoading) {
      onSendMessage(finalQuery);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  return (
    <div
      className={cn(
        "relative rounded-full sm:rounded-[28px] border border-border/30 bg-card/90 backdrop-blur-xl shadow-md px-3.5 py-1.5 transition-all duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
      )}
    >
      {/* Main Pill Input Row */}
      <div className="flex items-end gap-2 px-0.5">
        {/* Text Area Input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (isTempChat
              ? "Ask temporary question (Incognito mode)..."
              : "Ask KnoVault AI...")
          }
          rows={1}
          disabled={isLoading}
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 resize-none py-2 px-2 text-xs md:text-sm placeholder:text-muted-foreground/70 text-foreground shadow-none leading-relaxed min-h-[38px] max-h-[150px]"
        />

        {/* Mic Speech Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleToggleListen}
          className={cn(
            "shrink-0 h-9 w-9 rounded-full transition-all duration-200 mb-0.5",
            isListening
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse border border-red-500/40"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
          title={isListening ? "Stop listening" : "Voice dictation"}
        >
          {isListening ? <Square className="w-4 h-4 text-red-400" /> : <Mic className="w-4.5 h-4.5" />}
        </Button>

        {/* Send / Stop Action Button */}
        {isLoading ? (
          <Button
            type="button"
            onClick={onStopGeneration}
            className="shrink-0 h-9 w-9 rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-md transition-all duration-200 mb-0.5 flex items-center justify-center"
            title="Stop AI Generation"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            disabled={!message.trim()}
            onClick={handleSend}
            className={cn(
              "shrink-0 h-9 w-9 rounded-full transition-all duration-200 mb-0.5 flex items-center justify-center",
              message.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
                : "bg-accent/50 text-muted-foreground/50 opacity-60"
            )}
            title="Send Message"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
