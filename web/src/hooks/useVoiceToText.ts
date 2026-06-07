"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: unknown) => void;
  onerror: (event: unknown) => void;
  onend: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

interface UseVoiceToTextReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  isSupported: boolean;
}

export function useVoiceToText(onTranscriptChange: (text: string) => void): UseVoiceToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported] = useState(() => {
    if (typeof window !== "undefined") {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
    return true;
  });
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);

  // Keep ref up to date
  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      recognition.onresult = (event: unknown) => {
        const ev = event as { resultIndex: number; results: { isFinal: boolean; [key: number]: { transcript: string } }[] };
        let currentTranscript = "";
        for (let i = ev.resultIndex; i < ev.results.length; ++i) {
          if (ev.results[i].isFinal) {
            currentTranscript += ev.results[i][0].transcript + " ";
          }
        }
        
        if (currentTranscript) {
          setTranscript((prev) => prev + currentTranscript);
          onTranscriptChangeRef.current(currentTranscript.trim() + " ");
        }
      };

      recognition.onerror = (event: unknown) => {
        const ev = event as { error: string };
        console.error("Speech recognition error:", ev.error);
        if (ev.error === "not-allowed") {
          toast.error("Microphone permission denied. Please allow microphone access.");
          setIsListening(false);
        } else if (ev.error === "network") {
          toast.error("Network error occurred during speech recognition.");
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Automatically stop listening state if it ended unexpectedly
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error("Your browser does not support Voice-to-Text. Please use Chrome or Edge.");
      return;
    }
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch (e) {
      console.error(e);
      // Might already be started
      setIsListening(true);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!isSupported) return;
    try {
      recognitionRef.current?.stop();
      setIsListening(false);
    } catch (e) {
      console.error(e);
    }
  }, [isSupported]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
  };
}
