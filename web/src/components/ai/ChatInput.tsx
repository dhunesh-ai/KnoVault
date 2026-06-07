/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setMessage(prev => prev + transcript + " ");
          } else {
            currentTranscript += transcript;
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error("Microphone error. Please check permissions.");
        }
      };
    }
  }, []);

  const handleToggleListen = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setMessage(""); // Clear before dictating, or keep it? Keep it is better.
      recognitionRef.current.start();
      setIsListening(true);
      toast.success("Listening...");
    }
  };

  const handleSend = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'inherit';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="relative flex items-end gap-2 bg-card border border-border rounded-3xl p-2 shadow-lg backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "shrink-0 h-10 w-10 rounded-full transition-all duration-300",
          isListening ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-400" : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        onClick={handleToggleListen}
      >
        {isListening ? <Square className="w-4 h-4 animate-pulse" /> : <Mic className="w-5 h-5" />}
      </Button>

      <Textarea
        ref={textareaRef}
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? "Listening..." : "Ask KnoVault AI..."}
        className="min-h-[40px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none py-2.5 px-2 text-[15px] placeholder:text-muted-foreground text-foreground shadow-none leading-relaxed"
        rows={1}
      />

      <Button
        size="icon"
        disabled={!message.trim() || isLoading}
        onClick={handleSend}
        className={cn(
          "shrink-0 h-10 w-10 rounded-full transition-all duration-300",
          message.trim() && !isLoading ? "bg-purple-600 text-foreground hover:bg-purple-700" : "bg-accent text-muted-foreground"
        )}
      >
        <Send className="w-4 h-4 ml-0.5" />
      </Button>
    </div>
  );
}
