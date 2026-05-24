import React, { useState, useEffect } from 'react';
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
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../../src/api/notes';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';
import { getThemedShadow } from '../../src/components/ThemedComponents';

export default function VoiceNoteScreen() {
  const { colors, theme, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    try {
      if (Voice) {
        Voice.onSpeechResults = (e: SpeechResultsEvent) => {
          if (e.value && e.value.length > 0) {
            setContent((prev) => prev + (prev.length > 0 ? ' ' : '') + e.value![0]);
          }
        };

        Voice.onSpeechError = (e: SpeechErrorEvent) => {
          console.log('Voice Error:', e);
          setIsRecording(false);
        };
      }
    } catch (e) {
      console.log('Voice initialization error:', e);
    }

    return () => {
      try {
        if (Voice && Voice.destroy) {
          Voice.destroy().then(() => {
            if (Voice.removeAllListeners) Voice.removeAllListeners();
          }).catch(e => console.log('Destroy error', e));
        }
      } catch (e) {
        // Ignore native module missing errors on unmount
      }
    };
  }, []);

  const toggleRecording = async () => {
    try {
      // Check if native module is available
      const isAvailable = await Voice.isAvailable().catch(() => false);
      
      if (!isAvailable) {
        setIsRecording(false);
        Alert.alert(
          "Development Build Required",
          "Real-time voice transcription requires custom native code that is not available in the standard 'Expo Go' app. Please build and run a Development Client to use this feature.\n\nTry running: npx expo run:android"
        );
        return;
      }

      if (isRecording) {
        await Voice.stop();
        setIsRecording(false);
      } else {
        // Request permissions for Android
        if (Platform.OS === 'android') {
          const { PermissionsAndroid } = require('react-native');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: "Microphone Permission",
              message: "KnoVault needs access to your microphone to transcribe voice notes.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert("Permission Denied", "Microphone access is required for voice notes.");
            return;
          }
        }

        setContent(''); 
        await Voice.start('en-US');
        setIsRecording(true);
      }
    } catch (e) {
      setIsRecording(false);
      console.error('Voice Error:', e);
      Alert.alert(
        "Voice Recognition Error",
        "An error occurred while starting voice recognition. Please ensure you are using a compatible development build."
      );
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
        await Voice.stop();
      } catch (e) {
        console.log("Error stopping voice:", e);
      }
      setIsRecording(false);
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
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </KeyboardAvoidingView>

      {/* Footer / Mic Controls */}
      <View style={ds.footer}>
        <Text style={[ds.statusText, { color: theme.textSecondary }]}>
          {isRecording ? 'Listening...' : 'Tap the mic to start speaking'}
        </Text>
        
        <TouchableOpacity 
          style={[ds.micBtn, { backgroundColor: theme.primary }, isRecording && ds.micBtnActive]}
          onPress={toggleRecording}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isRecording ? "stop" : "mic"} 
            size={28} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
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
});
