import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../../src/api/notes';
import { useTheme } from '../../src/hooks/useTheme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { typography, spacing, borderRadius } from '../../src/theme';
import { getThemedShadow } from '../../src/components/ThemedComponents';

export default function VoiceNoteScreen() {
  const { colors, theme, isDark } = useTheme();
  const { microphoneEnabled } = useSettingsStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Keep references to handle stale closures in event listeners
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const accumulatedText = useRef('');

  // Listen to speech results in real time
  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      const currentSessionText = event.results[0]?.transcript || '';
      const prefix = accumulatedText.current;
      const combined = prefix + (prefix.length > 0 && currentSessionText.length > 0 ? ' ' : '') + currentSessionText;
      
      setContent(combined);
      
      if (event.isFinal) {
        accumulatedText.current = combined;
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Voice Error:', event.error);
    isRecordingRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
  });

  // Keep listening continuously by restarting the speech engine if it ends automatically
  useSpeechRecognitionEvent('end', () => {
    if (isRecordingRef.current && !isPausedRef.current) {
      console.log('Speech recognition session ended automatically. Restarting...');
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
      });
    }
  });

  // Stop recording if the user leaves the screen
  useEffect(() => {
    return () => {
      try {
        isRecordingRef.current = false;
        isPausedRef.current = false;
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {
        // Ignore unmount errors
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (!microphoneEnabled) {
      Alert.alert("Microphone Disabled", "Please enable Microphone Access in your Profile Settings to use Voice Notes.");
      return;
    }

    try {
      const isAvailable = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      
      if (!isAvailable) {
        isRecordingRef.current = false;
        isPausedRef.current = false;
        setIsRecording(false);
        setIsPaused(false);
        Alert.alert(
          "Development Build Required",
          "Real-time voice transcription requires speech services that are not available. Please ensure you are running on a physical device with Speech Services by Google installed."
        );
        return;
      }

      if (isRecording) {
        isRecordingRef.current = false;
        isPausedRef.current = false;
        setIsRecording(false);
        setIsPaused(false);
        await ExpoSpeechRecognitionModule.stop();
      } else {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission Denied", "Microphone access is required for voice notes.");
          return;
        }

        setContent(''); 
        accumulatedText.current = '';
        isRecordingRef.current = true;
        isPausedRef.current = false;
        setIsRecording(true);
        setIsPaused(false);
        await ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
        });
      }
    } catch (e) {
      isRecordingRef.current = false;
      isPausedRef.current = false;
      setIsRecording(false);
      setIsPaused(false);
      console.error('Voice Error:', e);
      Alert.alert(
        "Voice Recognition Error",
        "An error occurred while starting voice recognition. Please ensure microphone permissions are allowed."
      );
    }
  };

  const togglePause = async () => {
    try {
      if (isPaused) {
        // Resume
        isPausedRef.current = false;
        setIsPaused(false);
        await ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
        });
      } else {
        // Pause
        isPausedRef.current = true;
        setIsPaused(true);
        await ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      console.error('Error toggling pause:', e);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() && !content.trim()) {
        throw new Error('Note cannot be empty');
      }
      return notesApi.createNote({
        title: title || 'Voice Note',
        content: content,
        note_type: 'standard',
        category: 'General',
        is_secure: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to save voice note.');
    }
  });

  const handleSave = async () => {
    if (isRecording) {
      try {
        isRecordingRef.current = false;
        isPausedRef.current = false;
        await ExpoSpeechRecognitionModule.stop();
      } catch (e) {
        console.log("Error stopping voice:", e);
      }
      setIsRecording(false);
      setIsPaused(false);
    }
    saveMutation.mutate();
  };

  const ds = styles(theme, isDark, colors);

  return (
    <SafeAreaView style={ds.container}>
      {/* Header */}
      <View style={ds.header}>
        <View style={ds.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={ds.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[ds.headerTitle, { color: theme.text }]}>Voice Note</Text>
        </View>
        <TouchableOpacity 
          style={[ds.saveBtn, { backgroundColor: theme.primary }, saveMutation.isPending && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Text style={ds.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={ds.content}
      >
        {/* Title Input */}
        <TextInput
          style={[ds.titleInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          placeholder="Title"
          placeholderTextColor={colors.text.tertiary}
          value={title}
          onChangeText={setTitle}
        />

        {/* Content Input */}
        <TextInput
          style={[ds.contentInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          placeholder="Speak or type your note..."
          placeholderTextColor={colors.text.tertiary}
          value={content}
          onChangeText={(text) => {
            setContent(text);
            accumulatedText.current = text;
          }}
          multiline
          textAlignVertical="top"
        />
      </KeyboardAvoidingView>

      {/* Footer / Mic Controls */}
      <View style={ds.footer}>
        <Text style={[ds.statusText, { color: theme.textSecondary }]}>
          {isRecording 
            ? (isPaused ? 'Paused - Speak or type your note...' : 'Listening...') 
            : 'Tap the mic to start speaking'}
        </Text>
        
        <View style={ds.controlsRow}>
          {isRecording && (
            <TouchableOpacity 
              style={[ds.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={togglePause}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={22} 
                color={theme.text} 
              />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[ds.micBtn, { backgroundColor: theme.primary }, isRecording && ds.micBtnActive, !microphoneEnabled && { opacity: 0.5 }]}
            onPress={toggleRecording}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isRecording ? "stop" : microphoneEnabled ? "mic" : "mic-off"} 
              size={28} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  titleInput: {
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  contentInput: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 10,
    backgroundColor: theme.background,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 12,
  },
  micBtn: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...getThemedShadow(theme, 'medium'),
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    ...getThemedShadow(theme, 'medium'),
  },
});
