import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Lazy-load expo-speech to prevent crash if native module isn't linked
let Speech: any = null;
try {
  Speech = require('expo-speech');
} catch (e) {
  console.warn('[VOICE] expo-speech native module not available. Voice features disabled.');
}

interface UseSpeechReturn {
  speak: (text: string, messageId: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  activeMessageId: string | null;
}

/**
 * Strip markdown / formatting artifacts for natural TTS output.
 * Handles headings, bold, italic, code, links, lists, numbered lists,
 * emoji-only sequences, and excess whitespace.
 */
function cleanTextForSpeech(raw: string): string {
  let text = raw;

  // Remove code blocks (fenced & inline)
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');

  // Remove headings
  text = text.replace(/#{1,6}\s+/g, '');

  // Remove bold / italic markers
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/_(.*?)_/g, '$1');

  // Links → just text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // Numbered lists → natural reading
  text = text.replace(/^\s*\d+\.\s+/gm, '. ');

  // Bullet lists → comma pause
  text = text.replace(/^\s*[-*+]\s+/gm, ', ');

  // Remove standalone emoji sequences (emoji that would cause TTS issues)
  // Keep emojis embedded in text but strip emoji-only lines
  text = text.replace(/^[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\s]+$/gmu, '');

  // Collapse multiple newlines into sentence break
  text = text.replace(/\n{2,}/g, '. ');
  text = text.replace(/\n/g, ', ');

  // Collapse multiple commas / periods
  text = text.replace(/[,]{2,}/g, ',');
  text = text.replace(/[.]{2,}/g, '.');
  text = text.replace(/,\s*\./g, '.');

  // Collapse whitespace
  text = text.replace(/\s{2,}/g, ' ');

  return text.trim();
}

/**
 * Production-grade Text-to-Speech hook using expo-speech.
 * - Single-message playback with toggle support
 * - Automatic cleanup on unmount, app background, and navigation
 * - Robust markdown stripping for natural speech
 * - Detailed diagnostic logging
 */
export function useSpeech(): UseSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const isMounted = useRef(true);
  const activeIdRef = useRef<string | null>(null);

  // Keep ref in sync for use in callbacks that close over stale state
  useEffect(() => {
    activeIdRef.current = activeMessageId;
  }, [activeMessageId]);

  // ── Cleanup: unmount ──────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (Speech) {
        Speech.stop();
      }
      // console.log('[VOICE CLEANUP] Speech stopped on unmount');
    };
  }, []);

  // ── Cleanup: app goes to background / inactive ────────────────────
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState !== 'active' && activeIdRef.current) {
        // console.log('[VOICE CLEANUP] Stopping speech — app went to', nextState);
        if (Speech) Speech.stop();
        if (isMounted.current) {
          setIsSpeaking(false);
          setActiveMessageId(null);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  // ── Stop ──────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (Speech) Speech.stop();
    if (isMounted.current) {
      setIsSpeaking(false);
      setActiveMessageId(null);
    }
    // console.log('[VOICE STOP]');
  }, []);

  // ── Speak ─────────────────────────────────────────────────────────
  const speak = useCallback((text: string, messageId: string) => {
    // console.log('[VOICE BUTTON PRESSED]', messageId);

    if (!Speech) {
      console.warn('[VOICE] Speech module not available');
      return;
    }

    // Toggle off if same message is already playing
    if (activeIdRef.current === messageId) {
      stop();
      // console.log('[VOICE TOGGLED OFF]', messageId);
      return;
    }

    // Stop any currently playing speech first
    Speech.stop();

    // Clean markdown for natural speech
    const cleanText = cleanTextForSpeech(text);
    // console.log('[VOICE TEXT READY]', `Length: ${cleanText.length}, Preview: "${cleanText.slice(0, 80)}…"`);

    if (!cleanText) {
      console.warn('[VOICE] Nothing to speak after cleaning');
      return;
    }

    if (isMounted.current) {
      setActiveMessageId(messageId);
      setIsSpeaking(true);
    }

    try {
      // console.log('[VOICE PLAYBACK START]', messageId);

      Speech.speak(cleanText, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.92,
        onStart: () => {
          // console.log('[VOICE PLAYBACK ACTIVE]');
        },
        onDone: () => {
          if (isMounted.current) {
            setIsSpeaking(false);
            setActiveMessageId(null);
          }
          // console.log('[VOICE PLAYBACK COMPLETE]');
        },
        onStopped: () => {
          if (isMounted.current) {
            setIsSpeaking(false);
            setActiveMessageId(null);
          }
          // console.log('[VOICE PLAYBACK INTERRUPTED]');
        },
        onError: (error: any) => {
          if (isMounted.current) {
            setIsSpeaking(false);
            setActiveMessageId(null);
          }
          console.error('[VOICE PLAYBACK ERROR]', error);
        },
      });
    } catch (e) {
      console.error('[VOICE] Speech.speak() threw:', e);
      if (isMounted.current) {
        setIsSpeaking(false);
        setActiveMessageId(null);
      }
    }
  }, [stop]);

  return { speak, stop, isSpeaking, activeMessageId };
}
