import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

// Try loading react-native-tts first
let Tts: any = null;
try {
  Tts = require('react-native-tts').default;
} catch (e) {
  // console.log('[TTS] react-native-tts not available, checking expo-speech');
}

// Try loading expo-speech as fallback
let ExpoSpeech: any = null;
try {
  ExpoSpeech = require('expo-speech');
} catch (e) {
  console.warn('[TTS] expo-speech not available.');
}

interface UseSpeechReturn {
  speak: (text: string, messageId: string, language?: 'en-US' | 'ta-IN') => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  activeMessageId: string | null;
  currentLanguage: 'en-US' | 'ta-IN';
}

function cleanTextForSpeech(raw: string): string {
  let text = raw;
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');
  text = text.replace(/#{1,6}\s+/g, '');
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/_(.*?)_/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/^[-*_]{3,}$/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '. ');
  text = text.replace(/^\s*[-*+]\s+/gm, ', ');
  text = text.replace(/^[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\s]+$/gmu, '');
  text = text.replace(/\n{2,}/g, '. ');
  text = text.replace(/\n/g, ', ');
  text = text.replace(/[,]{2,}/g, ',');
  text = text.replace(/[.]{2,}/g, '.');
  text = text.replace(/,\s*\./g, '.');
  text = text.replace(/\s{2,}/g, ' ');
  return text.trim();
}

export function useSpeech(): UseSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en-US' | 'ta-IN'>('en-US');

  const isMounted = useRef(true);
  const activeIdRef = useRef<string | null>(null);
  const textCacheRef = useRef<string>('');

  useEffect(() => {
    activeIdRef.current = activeMessageId;
  }, [activeMessageId]);

  // Initializing Tts if available
  useEffect(() => {
    if (Tts) {
      Tts.getInitStatus().then(
        () => {
          Tts.setDefaultRate(0.5); // Set speech rate
          Tts.setDefaultPitch(1.0);
          
          Tts.addEventListener('tts-start', () => {
            if (isMounted.current) {
              setIsSpeaking(true);
              setIsPaused(false);
            }
          });
          Tts.addEventListener('tts-finish', () => {
            if (isMounted.current) {
              setIsSpeaking(false);
              setIsPaused(false);
              setActiveMessageId(null);
            }
            console.log("[TTS] stopped");
          });
          Tts.addEventListener('tts-cancel', () => {
            if (isMounted.current) {
              setIsSpeaking(false);
              setIsPaused(false);
              setActiveMessageId(null);
            }
            console.log("[TTS] stopped");
          });
        },
        (err: any) => {
          console.warn('[TTS] react-native-tts init status error:', err);
        }
      );
    }
    return () => {
      isMounted.current = false;
      if (Tts) {
        Tts.stop();
      } else if (ExpoSpeech) {
        ExpoSpeech.stop();
      }
    };
  }, []);

  // Handle app lifecycle changes
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState !== 'active' && activeIdRef.current) {
        if (Tts) Tts.stop();
        else if (ExpoSpeech) ExpoSpeech.stop();
        
        if (isMounted.current) {
          setIsSpeaking(false);
          setIsPaused(false);
          setActiveMessageId(null);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  const stop = useCallback(() => {
    if (Tts) {
      Tts.stop();
    } else if (ExpoSpeech) {
      ExpoSpeech.stop();
    }
    if (isMounted.current) {
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveMessageId(null);
    }
    console.log("[TTS] stopped");
  }, []);

  const pause = useCallback(() => {
    if (Tts) {
      Tts.pause();
      if (isMounted.current) {
        setIsPaused(true);
        setIsSpeaking(false);
      }
    } else if (ExpoSpeech) {
      if (Platform.OS === 'ios') {
        ExpoSpeech.pause();
      } else {
        // Fallback on Android
        ExpoSpeech.stop();
      }
      if (isMounted.current) {
        setIsPaused(true);
        setIsSpeaking(false);
      }
    }
    console.log("[TTS] paused");
  }, []);

  const resume = useCallback(() => {
    if (!textCacheRef.current || !activeMessageId) return;

    if (Tts) {
      if (isMounted.current) {
        setIsSpeaking(true);
        setIsPaused(false);
      }
      Tts.resume();
      console.log("[TTS] resumed");
    } else if (ExpoSpeech) {
      if (Platform.OS === 'ios') {
        ExpoSpeech.resume();
        if (isMounted.current) {
          setIsSpeaking(true);
          setIsPaused(false);
        }
        console.log("[TTS] resumed");
      } else {
        // Fallback on Android (restart speech since pause/resume is iOS only)
        if (isMounted.current) {
          setIsSpeaking(true);
          setIsPaused(false);
        }
        console.log("[TTS] resumed");
        ExpoSpeech.speak(textCacheRef.current, {
          language: currentLanguage,
          pitch: 1.0,
          rate: 0.95,
          onDone: () => {
            if (isMounted.current) {
              setIsSpeaking(false);
              setIsPaused(false);
              setActiveMessageId(null);
            }
            console.log("[TTS] stopped");
          },
          onStopped: () => {
            if (isMounted.current) {
              setIsSpeaking(false);
              setIsPaused(false);
            }
            console.log("[TTS] stopped");
          },
        });
      }
    }
  }, [activeMessageId, currentLanguage]);

  const speak = useCallback((text: string, messageId: string, language: 'en-US' | 'ta-IN' = 'en-US') => {
    if (!Tts && !ExpoSpeech) {
      console.warn('[TTS] Speech modules are not available.');
      return;
    }

    if (activeIdRef.current === messageId) {
      stop();
      return;
    }

    stop();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    textCacheRef.current = cleanedText;
    setActiveMessageId(messageId);
    setIsSpeaking(true);
    setIsPaused(false);
    setCurrentLanguage(language);
    console.log("[TTS] speaking");

    if (Tts) {
      try {
        Tts.setDefaultLanguage(language);
        Tts.speak(cleanedText);
      } catch (e) {
        console.error('[TTS] react-native-tts speak failed:', e);
        setIsSpeaking(false);
        setActiveMessageId(null);
      }
    } else if (ExpoSpeech) {
      try {
        ExpoSpeech.speak(cleanedText, {
          language,
          pitch: 1.0,
          rate: 0.95,
          onStart: () => {
            if (isMounted.current) {
              setIsSpeaking(true);
              setIsPaused(false);
            }
          },
          onDone: () => {
            if (isMounted.current) {
              setIsSpeaking(false);
              setIsPaused(false);
              setActiveMessageId(null);
            }
            console.log("[TTS] stopped");
          },
          onStopped: () => {
            if (isMounted.current) {
              setIsSpeaking(false);
              setIsPaused(false);
            }
            console.log("[TTS] stopped");
          },
          onError: (e: any) => {
            console.error('[TTS] expo-speech error:', e);
            if (isMounted.current) {
              setIsSpeaking(false);
              setIsPaused(false);
              setActiveMessageId(null);
            }
          },
        });
      } catch (e) {
        console.error('[TTS] expo-speech speak failed:', e);
        setIsSpeaking(false);
        setActiveMessageId(null);
      }
    }
  }, [stop]);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    activeMessageId,
    currentLanguage,
  };
}
