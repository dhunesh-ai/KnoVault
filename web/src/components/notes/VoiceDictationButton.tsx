"use client";

import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceDictationButton({ onTranscript, className }: VoiceDictationButtonProps) {
  const { isListening, toggleListening, isSupported } = useVoiceToText(onTranscript);

  if (!isSupported) {
    return null; // Graceful fallback for unsupported browsers
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex items-center justify-center">
            {isListening && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.5 }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: 0.8,
                }}
                className="absolute inset-0 bg-red-500/30 rounded-full blur-md"
              />
            )}
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              className={`relative z-10 rounded-full transition-all duration-300 w-8 h-8 ${
                isListening 
                  ? "shadow-[0_0_15px_rgba(239,68,68,0.5)] bg-red-500 hover:bg-red-600 text-white border-transparent" 
                  : "hover:text-primary hover:border-primary/50 bg-background"
              } ${className || ""}`}
              onClick={toggleListening}
            >
              <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : "text-muted-foreground"}`} />
            </Button>
            {isListening && (
              <span className="ml-3 text-xs text-red-500 animate-pulse font-medium whitespace-nowrap">
                Listening...
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{isListening ? "Stop listening" : "Voice dictate note"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
