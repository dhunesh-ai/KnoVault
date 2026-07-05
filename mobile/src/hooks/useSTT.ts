import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useIsFocused } from '@react-navigation/native';
import { handleMicrophonePermission } from '../utils/permissionHandler';

interface UseSTTReturn {
  isListening: boolean;
  transcript: string;
  speechVolume: number;
  error: string | null;
  status: 'idle' | 'listening' | 'processing' | 'error';
  isVoiceSupported: boolean;
  permissionState: 'undetermined' | 'granted' | 'denied' | 'permanently_denied';
  startListening: (locale?: 'en-US' | 'ta-IN') => Promise<void>;
  stopListening: () => Promise<void>;
  cancelListening: () => Promise<void>;
  clearTranscript: () => void;
}

export function useSTT(): UseSTTReturn {
  const isFocused = useIsFocused();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechVolume, setSpeechVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const [permissionState, setPermissionState] = useState<'undetermined' | 'granted' | 'denied' | 'permanently_denied'>('undetermined');

  const isVoiceSupported = ExpoSpeechRecognitionModule.isRecognitionAvailable();

  const requestAudioPermission = async (): Promise<boolean> => {
    try {
      const granted = await handleMicrophonePermission();
      if (granted) {
        setPermissionState('granted');
        return true;
      } else {
        setPermissionState('denied');
        return false;
      }
    } catch (err) {
      console.warn('[STT] Permission request/check error:', err);
      setPermissionState('denied');
      return false;
    }
  };

  const isListeningRef = useRef(false);

  // Register events from expo-speech-recognition
  useSpeechRecognitionEvent('start', () => {
    if (!isFocused) return;
    console.log('[STT] Speech Started');
    setIsListening(true);
    isListeningRef.current = true;
    setStatus('listening');
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    if (!isFocused) return;
    console.log('[STT] Speech End');
    setIsListening(false);
    isListeningRef.current = false;
    setStatus(prev => prev === 'listening' ? 'processing' : prev);
  });

  useSpeechRecognitionEvent('error', (e) => {
    if (!isFocused) return;
    console.log('[STT] Speech Error', e);
    const errMsg = e.error || e.message || '';
    const isMinorError = 
      errMsg.toLowerCase() === 'no-speech' || 
      errMsg.toLowerCase() === 'no-match' || 
      errMsg.toLowerCase() === 'aborted';

    setIsListening(false);
    isListeningRef.current = false;

    if (isMinorError) {
      setStatus('idle');
      setError(null);
    } else {
      setError(errMsg || 'Speech recognition service error');
      setStatus('error');
    }
  });

  useSpeechRecognitionEvent('result', (e) => {
    if (!isFocused) return;
    console.log('[STT] Speech Results', e.results);
    if (e.results && e.results.length > 0) {
      const recognizedText = e.results[0]?.transcript || '';
      setTranscript(recognizedText);
      if (e.isFinal) {
        setStatus('idle');
      }
    }
  });

  useSpeechRecognitionEvent('volumechange', (e) => {
    if (!isFocused) return;
    setSpeechVolume(e.value || 0);
  });

  const startListening = useCallback(async (locale: 'en-US' | 'ta-IN' = 'en-US') => {
    if (!isVoiceSupported) {
      setError('Voice input requires a development build. Please use a Dev Client build to test voice recognition.');
      setStatus('error');
      return;
    }

    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      setError('Microphone access denied. Please allow microphone permissions in system settings.');
      setStatus('error');
      return;
    }

    try {
      setTranscript('');
      setSpeechVolume(0);
      setError(null);
      await ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: false,
      });
    } catch (e: any) {
      console.error('[STT] ExpoSpeechRecognitionModule.start failed:', e);
      setError(e?.message || 'Failed to start speech services. Please try again.');
      setIsListening(false);
      isListeningRef.current = false;
      setStatus('error');
    }
  }, [isVoiceSupported]);

  const stopListening = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      isListeningRef.current = false;
    } catch (e) {
      console.error('[STT] ExpoSpeechRecognitionModule.stop failed:', e);
    }
  }, []);

  const cancelListening = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      isListeningRef.current = false;
      setStatus('idle');
    } catch (e) {
      console.error('[STT] ExpoSpeechRecognitionModule.stop (cancel) failed:', e);
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Monitor screen focus. Reset or cancel recognition session when focus changes.
  useEffect(() => {
    if (isFocused) {
      setTranscript('');
      setIsListening(false);
      isListeningRef.current = false;
      setSpeechVolume(0);
      setError(null);
      setStatus('idle');
    } else {
      if (isListeningRef.current) {
        cancelListening();
      }
      setTranscript('');
      setIsListening(false);
      isListeningRef.current = false;
      setSpeechVolume(0);
      setError(null);
      setStatus('idle');
    }
  }, [isFocused, cancelListening]);

  return {
    isListening,
    transcript,
    speechVolume,
    error,
    status,
    isVoiceSupported,
    permissionState,
    startListening,
    stopListening,
    cancelListening,
    clearTranscript,
  };
}
