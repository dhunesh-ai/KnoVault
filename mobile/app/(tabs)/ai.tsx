import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, FlatList, ActivityIndicator,
  Keyboard, Dimensions, Alert, Modal, ScrollView, Share,
  LayoutAnimation, StatusBar, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Clipboard } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  Layout
} from 'react-native-reanimated';

import axios from 'axios';

// Hooks & Stores
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useChatStore, type Message, type ChatThread } from '../../src/store/chatStore';
import { useMemoryStore, type MemoryItem } from '../../src/store/memoryStore';
import { useSpeech } from '../../src/hooks/useSpeech';
import { useSTT } from '../../src/hooks/useSTT';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '../../src/store/settingsStore';
import { showMicAccessDisabledAlert } from '../../src/utils/micAccessAlert';
import { syncManager } from '../../src/services/syncManager';

// APIs & Context Helpers
import { aiApi } from '../../src/api/ai';
import { notesApi } from '../../src/api/notes';
import { goalsApi } from '../../src/api/goals';
import { remindersApi } from '../../src/api/reminders';
import { specialDaysApi } from '../../src/api/important_days';
import { calendarNotesApi } from '../../src/api/calendar_notes';
import { buildAIContext } from '../../src/ai/buildAIContext';
import { generateSystemPrompt } from '../../src/ai/systemPrompt';
import { detectIntent } from '../../src/ai/intentDetector';
import { retrieveRelevantNotes } from '../../src/ai/retrieveRelevantNotes';

// Styling / Components
import { typography } from '../../src/theme';
import KnoMascot from '../../src/components/KnoMascot';
import { getThemedShadow } from '../../src/components/ThemedComponents';

const { width, height } = Dimensions.get('window');

// ── Speaking Pulse Indicator ─────────────────────────────────────────
const SpeakingPulse = ({ colors, isDark, theme }: { colors: any; isDark: boolean; theme: any }) => {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const ps = pulseStyles(colors, isDark, theme);
  return (
    <Animated.View style={[ps.speakingRow, pulseStyle]}>
      <View style={ps.waveBar} />
      <View style={[ps.waveBar, { height: 12 }]} />
      <View style={ps.waveBar} />
      <View style={[ps.waveBar, { height: 14 }]} />
      <View style={ps.waveBar} />
      <Text style={ps.speakingLabel}>Speaking…</Text>
    </Animated.View>
  );
};

const pulseStyles = (colors: any, isDark: boolean, theme: any) => StyleSheet.create({
  speakingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: isDark ? '#1C2638' : '#F5F3FF', borderRadius: 10, alignSelf: 'flex-start' },
  waveBar: { width: 3, height: 8, borderRadius: 1.5, backgroundColor: theme.primary, marginRight: 2 },
  speakingLabel: { fontSize: 10, color: isDark ? '#C4B5FD' : colors.primary[600], fontWeight: '700', marginLeft: 6 },
});

// ── Typing Dot Animation ─────────────────────────────────────────────
const TypingIndicator = ({ theme }: { theme: any }) => {
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    const startAnim = (val: any, delay: number) => {
      setTimeout(() => {
        val.value = withRepeat(
          withTiming(-6, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          -1, true
        );
      }, delay);
    };
    startAnim(dot1Y, 0);
    startAnim(dot2Y, 150);
    startAnim(dot3Y, 300);
  }, []);

  const d1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1Y.value }] }));
  const d2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2Y.value }] }));
  const d3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3Y.value }] }));

  return (
    <View style={styles.typingBubble}>
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary }, d1Style]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary }, d2Style]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary }, d3Style]} />
    </View>
  );
};

// ── MEMOIZED CHAT MESSAGE ITEM ───────────────────────────────────────
interface ChatMessageItemProps {
  item: Message;
  activeMessageId: string | null;
  isSpeaking: boolean;
  isPaused: boolean;
  theme: any;
  colors: any;
  isDark: boolean;
  ds: any;
  mdStyles: any;
  copyText: (text: string) => void;
  shareText: (text: string) => void;
  speak: (text: string, id: string, lang?: 'en-US' | 'ta-IN') => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;
  retryLastMessage: () => void;
  getSpeechLanguage: (text: string) => 'en-US' | 'ta-IN';
}

const ChatMessageItem = React.memo(({
  item,
  activeMessageId,
  isSpeaking,
  isPaused,
  theme,
  colors,
  isDark,
  ds,
  mdStyles,
  copyText,
  shareText,
  speak,
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
  retryLastMessage,
  getSpeechLanguage,
}: ChatMessageItemProps) => {
  const isUser = item.sender === 'user';
  const isActive = activeMessageId === item.id && (isSpeaking || isPaused);
  const lang = getSpeechLanguage(item.content);

  return (
    <View style={[ds.msgRow, isUser ? ds.userRow : ds.aiRow]}>
      {!isUser && (
        <View style={ds.aiAvatarWrapper}>
          <KnoMascot state={item.isStreaming ? 'thinking' : (item.isError ? 'alert' : 'idle')} size={26} />
        </View>
      )}
      
      <View style={[
        ds.bubbleContainer,
        isUser ? ds.userBubbleContainer : ds.aiBubbleContainer
      ]}>
        <View style={[
          ds.bubble,
          isUser ? ds.userBubble : ds.aiBubble,
          item.isError && ds.errorBubble,
          isActive && ds.activeBubble,
        ]}>
          {isUser ? (
            <Text style={ds.userText}>{item.content}</Text>
          ) : (
            <Markdown style={mdStyles}>{item.content || "Thinking..."}</Markdown>
          )}

          {/* Quick Action Control for User Message: ICON ONLY */}
          {isUser && item.content.length > 0 && (
            <View style={ds.userCopyRow}>
              <TouchableOpacity 
                style={ds.userCopyBtn} 
                onPress={() => copyText(item.content)}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Copy message text"
                accessibilityRole="button"
              >
                <Ionicons name="copy-outline" size={13} color="rgba(255, 255, 255, 0.85)" />
              </TouchableOpacity>
            </View>
          )}

          {/* Speaking indicator */}
          {isActive && isSpeaking && (
            <SpeakingPulse colors={colors} isDark={isDark} theme={theme} />
          )}

          {/* Retry Button */}
          {item.isError && (
            <TouchableOpacity style={ds.retryBtn} onPress={retryLastMessage}>
              <Ionicons name="refresh" size={13} color="#FFFFFF" />
              <Text style={ds.retryText}>Retry</Text>
            </TouchableOpacity>
          )}

          {/* Quick Action Controls on AI Bubbles */}
          {!isUser && !item.isStreaming && !item.isError && item.content.length > 0 && (
            <View style={ds.quickActionsRow}>
              {(!isActive || Platform.OS === 'ios') && (
                <TouchableOpacity 
                  style={[ds.quickActionBtn, isActive && ds.quickActionBtnActive]}
                  onPress={() => {
                    if (!isActive) {
                      speak(item.content, item.id, lang);
                    } else if (isSpeaking) {
                      pauseSpeech();
                    } else if (isPaused) {
                      resumeSpeech();
                    }
                  }}
                >
                  <Ionicons 
                    name={isActive && isSpeaking ? "pause-circle" : (isActive && isPaused ? "play-circle" : "volume-medium")} 
                    size={13} 
                    color={isActive ? "#FFFFFF" : colors.text.tertiary} 
                  />
                  <Text style={[ds.quickActionText, { color: isActive ? "#FFFFFF" : colors.text.tertiary }]}>
                    {isActive && isSpeaking ? "Pause" : (isActive && isPaused ? "Resume" : `Listen (${lang === 'ta-IN' ? 'Tamil' : 'Eng'})`)}
                  </Text>
                </TouchableOpacity>
              )}

              {isActive && (
                <TouchableOpacity 
                  style={ds.quickActionBtn}
                  onPress={() => stopSpeech()}
                >
                  <Ionicons name="stop-circle" size={13} color={colors.text.tertiary} />
                  <Text style={[ds.quickActionText, { color: colors.text.tertiary }]}>Stop</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={ds.quickActionBtn} onPress={() => copyText(item.content)}>
                <Ionicons name="copy-outline" size={12} color={colors.text.tertiary} />
                <Text style={[ds.quickActionText, { color: colors.text.tertiary }]}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity style={ds.quickActionBtn} onPress={() => shareText(item.content)}>
                <Ionicons name="share-social-outline" size={12} color={colors.text.tertiary} />
                <Text style={[ds.quickActionText, { color: colors.text.tertiary }]}>Share</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Time Stamp label */}
        <Text style={[ds.timeText, isUser ? ds.userTime : ds.aiTime]}>
          {new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
});

// ── MAIN SCREEN ──────────────────────────────────────────────────────
const DEFAULT_QUICK_ACTIONS = [
  { label: "Pending Works", icon: "clipboard-outline", prompt: "Show my pending works" },
  { label: "Today's Focus", icon: "compass-outline", prompt: "Help me identify my highest priority items and focus areas for today." },
  { label: "Plan My Day", icon: "map-outline", prompt: "Create a structured hourly schedule for today based on my goals." },
  { label: "Active Projects", icon: "rocket-outline", prompt: "List my active projects and their current status." },
  { label: "Daily Goals", icon: "flame-outline", prompt: "Show my current goals and help me track my progress." },
  { label: "Upcoming Events", icon: "calendar-outline", prompt: "Check my calendar for upcoming events and reminders." },
];

function AIScreen() {
  const { colors, theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ initialPrompt?: string }>();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = 60;
  }

  // Speech Hooks
  const { speak, stop: stopSpeech, pause: pauseSpeech, resume: resumeSpeech, isSpeaking, isPaused, activeMessageId } = useSpeech();
  const { isListening, transcript: sttTranscript, speechVolume, error: sttError, status, isVoiceSupported, startListening, stopListening, clearTranscript } = useSTT();
  const { microphoneAccessEnabled } = useSettingsStore();

  // Custom Zustand Stores
  const { 
    threads, activeThreadId, isLoading: isThreadsLoading, searchQuery: threadSearchQuery,
    loadThreads, createThread, deleteThread, renameThread, togglePinThread, setActiveThread, setSearchQuery: setThreadSearchQuery,
    addMessage, syncResponse, updateMessage, clearActiveThreadMessages, exportThreadMarkdown,
    isTemporaryChat, temporaryMessages, setTemporaryChat, addTemporaryMessage, updateTemporaryMessage, clearTemporaryMessages
  } = useChatStore();

  const {
    memories, loadMemories, addMemory, deleteMemory, getMemoryContextString
  } = useMemoryStore();

  // Screen UI States
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [isAITyping, setIsAITyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSendingRef = useRef(false);
  const lastSendTimeRef = useRef<number>(0);
  const statusTimerRef = useRef<any>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const lastNoteContextRef = useRef<string>('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const initialTextRef = useRef<string>('');
  const drawerTranslateX = useSharedValue(-width);
  const backdropOpacity = useSharedValue(0);

  // Sync STT Transcript with Input text by appending it to the initial text value
  useEffect(() => {
    if (sttTranscript) {
      const prefix = initialTextRef.current;
      setInputText(prefix ? `${prefix} ${sttTranscript}` : sttTranscript);
    }
  }, [sttTranscript]);

  // Clean up STT state when AI Chat screen focus changes
  useEffect(() => {
    if (isFocused) {
      setInputText('');
      initialTextRef.current = '';
      clearTranscript();
    } else {
      stopListening();
      clearTranscript();
    }
  }, [isFocused, stopListening, clearTranscript]);

  // Show voice errors gracefully to the user
  useEffect(() => {
    if (sttError) {
      // Suppress general alerts for Expo Go environment issues as they are handled interactively
      if (sttError.includes("Expo Go") || sttError.includes("development build")) {
        return;
      }
      Alert.alert("Voice Assistant Error", sttError);
    }
  }, [sttError]);

  // Auto-focus input when the active thread changes
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  }, [activeThreadId]);

  useEffect(() => {
    const initialPrompt = params?.initialPrompt;
    if (initialPrompt) {
      setInputText(initialPrompt);
      setTimeout(() => {
        sendMessage(initialPrompt);
      }, 500);
      router.setParams({ initialPrompt: undefined });
    }
  }, [params?.initialPrompt]);

  // Load threads and memories ONCE on initial mount
  useEffect(() => {
    loadThreads();
    loadMemories();
  }, []);

  // Update syncManager AI Chat active state on focus/generation changes
  useEffect(() => {
    syncManager.setAIChatActive(isFocused || isGenerating);
    return () => {
      syncManager.setAIChatActive(false);
    };
  }, [isFocused, isGenerating]);

  // Scroll Position & Near-Bottom Detection
  const isNearBottomRef = useRef(true);
  const isUserScrollingRef = useRef(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast Auto-dismiss Timer (1.5 - 2.0s)
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const isBottom = distanceFromBottom < 80;
    isNearBottomRef.current = isBottom;
    if (isBottom) {
      setShowScrollToBottom(false);
    }
  }, []);

  const copyText = useCallback((text: string) => {
    try { 
      Clipboard.setString(text); 
      setToastMessage("✓ Copied");
    } catch (e) { 
      console.warn('[COPY] Clipboard not available:', e); 
    }
  }, []);

  const shareText = useCallback(async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (e) {
      console.warn('[SHARE] Failed to share message:', e);
    }
  }, []);

  // Manage Keyboard listeners and Speech cleanup
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showListener = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
      if (isNearBottomRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      }
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
      stopSpeech();
      stopListening();
    };
  }, []);

  // Animate drawer when open state changes
  useEffect(() => {
    drawerTranslateX.value = withTiming(isDrawerOpen ? 0 : -width, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
    backdropOpacity.value = withTiming(isDrawerOpen ? 0.4 : 0, {
      duration: 300,
    });
  }, [isDrawerOpen]);

  // Active Chat Thread messages
  const activeThread = useMemo(() => {
    return threads.find(t => t.id === activeThreadId) || null;
  }, [threads, activeThreadId]);

  const activeMessages = useMemo(() => {
    return isTemporaryChat ? temporaryMessages : (activeThread ? activeThread.messages : []);
  }, [isTemporaryChat, temporaryMessages, activeThread]);

  // Group threads for Chat History Drawer
  const groupedThreads = useMemo(() => {
    const filtered = threads.filter(t => 
      t.title.toLowerCase().includes(threadSearchQuery.toLowerCase())
    );

    const grouped: { Pinned: ChatThread[]; Today: ChatThread[]; Yesterday: ChatThread[]; 'Last Week': ChatThread[]; Older: ChatThread[] } = {
      Pinned: [],
      Today: [],
      Yesterday: [],
      'Last Week': [],
      Older: [],
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfLastWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;

    filtered.forEach((t) => {
      if (t.isPinned) {
        grouped.Pinned.push(t);
      } else {
        const time = new Date(t.createdAt).getTime();
        if (time >= startOfToday) {
          grouped.Today.push(t);
        } else if (time >= startOfYesterday) {
          grouped.Yesterday.push(t);
        } else if (time >= startOfLastWeek) {
          grouped['Last Week'].push(t);
        } else {
          grouped.Older.push(t);
        }
      }
    });

    return grouped;
  }, [threads, threadSearchQuery]);

  const simulateStreaming = async (fullText: string, threadId: string, messageId: string, signal: AbortSignal) => {
    updateMessage(threadId, messageId, { content: fullText, isStreaming: false });
    if (isNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } else {
      setShowScrollToBottom(true);
    }
  };

  const simulateTemporaryStreaming = async (fullText: string, messageId: string, signal: AbortSignal) => {
    updateTemporaryMessage(messageId, { content: fullText, isStreaming: false });
    if (isNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } else {
      setShowScrollToBottom(true);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const now = Date.now();
    // ═══ DEBOUNCE & SINGLE REQUEST LOCK ═══
    if (isSendingRef.current || isGenerating || (now - lastSendTimeRef.current < 500)) {
      console.log('[AI CHAT] Request locked or debounced. Suppressing duplicate invocation.');
      return;
    }

    const rawText = textOverride || inputText;
    const textToSend = rawText.trim();
    if (!textToSend) return;

    // User is explicitly sending a new message: force scroll to bottom
    isNearBottomRef.current = true;
    setShowScrollToBottom(false);

    // Acquire request lock immediately
    isSendingRef.current = true;
    lastSendTimeRef.current = now;
    setIsGenerating(true);

    // Immediately clear input field & maintain focus
    if (!textOverride) {
      setInputText('');
    }
    inputRef.current?.focus();

    stopSpeech();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Setup Messages with optimistic UI
    const userMsgId = `user-${Date.now()}`;
    const userMsg: Omit<Message, 'timestamp'> = {
      id: userMsgId,
      sender: 'user',
      content: textToSend,
    };

    const aiMsgId = `ai-${Date.now()}`;
    const placeholderMsg: Omit<Message, 'timestamp'> = {
      id: aiMsgId,
      sender: 'assistant',
      content: "Thinking...",
      isStreaming: true,
    };

    let currentThreadId = activeThreadId;

    if (isTemporaryChat) {
      addTemporaryMessage(userMsg);
      setIsAITyping(true);
      addTemporaryMessage(placeholderMsg);
    } else {
      if (!currentThreadId || threads.length === 0) {
        currentThreadId = await createThread(textToSend);
      }
      await addMessage(currentThreadId!, userMsg);
      setIsAITyping(true);
      await addMessage(currentThreadId!, placeholderMsg);
    }

    // Dynamic loading feedback timer: update "Thinking..." to "Still working..." if request > 5s
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      if (isSendingRef.current || isGenerating) {
        if (isTemporaryChat) {
          updateTemporaryMessage(aiMsgId, { content: "Still working...", isStreaming: true });
        } else if (currentThreadId) {
          updateMessage(currentThreadId, aiMsgId, { content: "Still working...", isStreaming: true });
        }
      }
    }, 5000);

    // ═══ PHASE 0: Pre-flight Security Checks for Secure Notes ═══
    const lowerInput = textToSend.toLowerCase();
    const secureKeywords = [
      'secure note', 'secure notes',
      'private note', 'private notes',
      'locked note', 'locked notes',
      'secure category', 'private category'
    ];
    let hasSecureKeywords = secureKeywords.some(kw => lowerInput.includes(kw));
    
    if (!hasSecureKeywords) {
      const hasSecure = lowerInput.includes('secure') || lowerInput.includes('private') || lowerInput.includes('locked');
      const hasNote = lowerInput.includes('note') || lowerInput.includes('notes');
      if (hasSecure && hasNote) {
        hasSecureKeywords = true;
      }
    }
      
    let isTargetingSecureNote = hasSecureKeywords;
    
    if (!isTargetingSecureNote) {
      try {
        const allNotes = await notesApi.getNotes();
        const secureNotes = allNotes.filter((n: any) => n.is_secure || n.category === 'Secure');
        
        for (const sn of secureNotes) {
          const normalizedTitle = sn.title.toLowerCase().trim();
          if (normalizedTitle && lowerInput.includes(normalizedTitle)) {
            isTargetingSecureNote = true;
            break;
          }
        }
      } catch (e) {
        console.warn("[AI Security Check] Failed to fetch notes for security check", e);
      }
    }

    if (isTargetingSecureNote) {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      setIsAITyping(false);
      const warningResponse = "For your privacy, Secure Notes are protected with end-to-end encryption and are not accessible to KnoVault AI. Please unlock and view them directly from the Secure Notes section.";
      if (isTemporaryChat) {
        await simulateTemporaryStreaming(warningResponse, aiMsgId, controller.signal);
      } else {
        await simulateStreaming(warningResponse, currentThreadId!, aiMsgId, controller.signal);
      }
      setIsGenerating(false);
      isSendingRef.current = false;
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    try {
      // ═══ PHASE 1: Intent Detection ═══
      const intent = detectIntent(textToSend);
      
      // ═══ PHASE 2: Smart Note Retrieval ═══
      const noteRetrieval = await retrieveRelevantNotes(
        intent,
        intent.isFollowUp ? lastNoteContextRef.current : undefined
      );
      if (noteRetrieval.noteContext) {
        lastNoteContextRef.current = noteRetrieval.noteContext;
      }

      // ═══ PHASE 3: Build General Context ═══
      const generalContext = await buildAIContext();

      // ═══ PHASE 4: Combine context and memories ═══
      let fullContext = generalContext;
      if (noteRetrieval.noteContext) {
        fullContext += '\n\n' + noteRetrieval.noteContext;
      }

      if (!isTemporaryChat) {
        const memoryContext = getMemoryContextString();
        if (memoryContext) {
          fullContext += '\n\n' + memoryContext;
        }
      }

      // ═══ PHASE 5: Generate Smart System Prompt ═══
      const systemPrompt = isTemporaryChat
        ? "You are Kno, a helpful AI assistant. You are in Temporary Chat mode. Do not refer to or update any permanent memories. Be concise, fast, and helpful."
        : generateSystemPrompt(recentTopics, intent.intent, new Date().toISOString());

      if (!isTemporaryChat) {
        const topicText = textToSend.substring(0, 50).trim();
        setRecentTopics(prev => {
          const updated = [...prev, topicText];
          if (updated.length > 5) updated.shift();
          return updated;
        });
      }

      // ═══ PHASE 6: Call AI Backend ═══
      const res = await aiApi.chat(
        textToSend,
        isTemporaryChat ? undefined : activeThreadId,
        fullContext,
        systemPrompt,
        isTemporaryChat,
        controller.signal
      );

      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);

      if (!isTemporaryChat) {
        await syncResponse(
          res.conversation_id,
          res.title,
          res.user_message,
          res.assistant_message
        );
      }
      
      let responseText = res.response;
      let actionBlockError: string | null = null;
      let noteCreatedId: number | null = null;

      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = responseText.match(jsonRegex);
      if (match) {
        try {
          const jsonText = match[1].trim();
          const actionObj = JSON.parse(jsonText);
          const { action, ...params } = actionObj;

          responseText = responseText.replace(jsonRegex, '').trim();

          if (action === 'create_reminder') {
            const { title, description, reminder_date } = params;
            if (!title || !reminder_date) {
              throw new Error("Missing title or date/time for the reminder");
            }
            await remindersApi.createReminder({
              title,
              description: description || null,
              reminder_date,
              type: 'custom',
            });
            await queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
            await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            await queryClient.invalidateQueries({ queryKey: ['reminders'] });
          } else if (action === 'create_note') {
            const { title, content, category } = params;
            if (!title) {
              throw new Error("Missing title for the note");
            }
            const newNote = await notesApi.createNote({
              title,
              content: content || "",
              category: category || "General",
            });
            noteCreatedId = newNote.id;
            await queryClient.invalidateQueries({ queryKey: ['notes'] });
          } else if (action === 'create_goal') {
            const { title } = params;
            if (!title) {
              throw new Error("Missing title for the goal");
            }
            await goalsApi.createGoal({
              title,
            });
            await queryClient.invalidateQueries({ queryKey: ['goals'] });
            await queryClient.invalidateQueries({ queryKey: ['goalStats'] });
          } else if (action === 'create_special_day') {
            const { title, date, type } = params;
            if (!title || !date) {
              throw new Error("Missing title or date for the special day");
            }
            await specialDaysApi.createImportantDay({
              title,
              date,
              type: type || "Birthday",
              is_recurring: true,
            });
            await queryClient.invalidateQueries({ queryKey: ['important-days'] });
            await queryClient.invalidateQueries({ queryKey: ['today-important-days'] });
            await queryClient.invalidateQueries({ queryKey: ['special-days'] });
            await queryClient.invalidateQueries({ queryKey: ['today-special-days'] });
            await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
          } else if (action === 'create_calendar_note') {
            const { title, content, note_date } = params;
            if (!title || !note_date) {
              throw new Error("Missing title or date for the calendar note");
            }
            await calendarNotesApi.createCalendarNote({
              title,
              content: content || null,
              note_date,
            });
            await queryClient.invalidateQueries({ queryKey: ['calendar-notes'] });
            await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            await queryClient.invalidateQueries({ queryKey: ['today-calendar-notes'] });
          }
        } catch (err: any) {
          console.warn('[AI ACTION ERROR]', err);
          actionBlockError = err.message || "Failed to save data.";
        }
      }

      if (actionBlockError) {
        responseText = `Failed to execute action: ${actionBlockError}. Please make sure you provide all required details and try again.`;
      } else if (noteCreatedId) {
        responseText += `\n\n(Note ID: ${noteCreatedId})`;
      }

      setIsAITyping(false);
      if (isTemporaryChat) {
        await simulateTemporaryStreaming(responseText, aiMsgId, controller.signal);
      } else {
        await simulateStreaming(responseText, currentThreadId!, aiMsgId, controller.signal);
      }
    } catch (e: any) {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (axios.isCancel(e) || e.name === 'CanceledError' || e.code === 'ERR_CANCELED') {
        console.log('[AI CHAT] Request canceled by user');
        setIsAITyping(false);
        setIsGenerating(false);
        if (isTemporaryChat) {
          updateTemporaryMessage(aiMsgId, {
            content: "Generation stopped.",
            isStreaming: false,
          });
        } else {
          updateMessage(currentThreadId!, aiMsgId, {
            content: "Generation stopped.",
            isStreaming: false,
          });
        }
        return;
      }

      console.warn('[AI CHAT ERROR]', e);
      setIsAITyping(false);
      const errorMessage = "Something went wrong. Please try again.";
      if (isTemporaryChat) {
        updateTemporaryMessage(aiMsgId, {
          content: errorMessage,
          isStreaming: false,
          isError: true
        });
      } else {
        updateMessage(currentThreadId!, aiMsgId, {
          content: errorMessage,
          isStreaming: false,
          isError: true
        });
      }
    } finally {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      setIsGenerating(false);
      isSendingRef.current = false;
      if (isNearBottomRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setShowScrollToBottom(true);
      }
    }
  };

  const retryLastMessage = async () => {
    if (isTemporaryChat) {
      const lastUserMsg = [...temporaryMessages].reverse().find(m => m.sender === 'user');
      if (lastUserMsg) {
        sendMessage(lastUserMsg.content);
      }
    } else {
      if (!activeThread) return;
      const lastUserMsg = [...activeThread.messages].reverse().find(m => m.sender === 'user');
      if (lastUserMsg) {
        sendMessage(lastUserMsg.content);
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    stopSpeech();
    setIsGenerating(false);
    setIsAITyping(false);
    isSendingRef.current = false;
  };

  // Smart suggestions handlers
  const handleSuggestionPress = (promptText: string) => {
    sendMessage(promptText);
  };



  // Drawer handlers
  const handleSelectThread = (id: string) => {
    setActiveThread(id);
    setTemporaryChat(false);
    setIsDrawerOpen(false);
  };

  const handleStartNewChat = () => {
    clearTemporaryMessages();
    setTemporaryChat(false);
    createThread();
    setIsDrawerOpen(false);
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  const handleRenameSave = async () => {
    if (editingThreadId && renameText.trim()) {
      await renameThread(editingThreadId, renameText.trim());
      setEditingThreadId(null);
      setRenameText('');
    }
  };

  // Memory Panel actions
  const handleAddMemory = async () => {
    if (newMemoryText.trim()) {
      await addMemory(newMemoryText.trim());
      setNewMemoryText('');
    }
  };

  // Spacing calculation: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + spacing.
  // Custom TabBar layout is hardcoded with height: 66, bottom: 30.
  // We align with the tab bar's top edge (96px from bottom) and add 8px spacing.
  const TAB_BAR_HEIGHT = 66;
  const TAB_BAR_BOTTOM = 30;
  const SPACING = 8;
  const bottomOffset = keyboardVisible 
    ? SPACING 
    : (TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + SPACING);
  const ds = dsFunc(theme, colors, isDark);
  const mdStyles = markdownStyles(theme, colors, isDark);

  // Styles for Reanimated Drawer & Backdrop
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerTranslateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: isDrawerOpen ? 'auto' : 'none',
  }));

  // Auto-detect voice language based on text content (Tamil vs English)
  const getSpeechLanguage = (text: string): 'en-US' | 'ta-IN' => {
    const tamilRegex = /[\u0B80-\u0BFF]/;
    return tamilRegex.test(text) ? 'ta-IN' : 'en-US';
  };

  if (isThreadsLoading) {
    return (
      <View style={[ds.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={ds.loadingText}>Initializing KnoVault AI...</Text>
      </View>
    );
  }

  console.log("Composer rendered", keyboardVisible);

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: isTemporaryChat ? (isDark ? '#0B0F17' : '#F1F5F9') : theme.background }}
      edges={['top']}
    >
      <StatusBar
        translucent={false}
        backgroundColor={isTemporaryChat ? (isDark ? '#0B0F17' : '#F1F5F9') : theme.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* ── STICKY HEADER ─────────────────────────────────────────── */}
        <View style={[ds.header, { paddingTop: 6 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => setIsDrawerOpen(true)}
              style={ds.headerIconBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                const newTempState = !isTemporaryChat;
                setTemporaryChat(newTempState);
                if (newTempState) {
                  clearTemporaryMessages();
                }
              }}
              style={[ds.headerIconBtn, { marginLeft: 4 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons 
                name={isTemporaryChat ? "glasses" : "glasses-outline"} 
                size={22} 
                color={isTemporaryChat ? "#EF4444" : theme.primary} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={ds.headerTitleContainer}>
            <View style={ds.headerTitleRow}>
              <View style={{ marginRight: 6 }}>
                <KnoMascot state="idle" size={26} />
              </View>
              <Text style={ds.headerTitle}>{isTemporaryChat ? "Temp Chat" : "KnoVault AI"}</Text>
            </View>
            <View style={ds.onlineBadge}>
              <View style={[ds.onlineDot, isTemporaryChat && { backgroundColor: '#EF4444' }]} />
              <Text style={ds.onlineText}>{isTemporaryChat ? "Incognito Session" : "Intelligence Active"}</Text>
            </View>
          </View>

          <View style={ds.headerRightActions}>
            <TouchableOpacity 
              onPress={() => createThread()}
              disabled={isTemporaryChat}
              style={[ds.headerIconBtn, isTemporaryChat && { opacity: 0.3 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setIsMemoryModalOpen(true)}
              disabled={isTemporaryChat}
              style={[ds.headerIconBtn, isTemporaryChat && { opacity: 0.3 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="hardware-chip-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Temporary Chat Info Banner */}
        {isTemporaryChat && (
          <View style={[ds.tempChatBanner, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="eye-off-outline" size={16} color={isDark ? '#FCA5A5' : '#EF4444'} style={{ marginRight: 8 }} />
            <Text style={[ds.tempChatBannerText, { color: theme.text }]}>
              This chat won't appear in your history and won't be used for memory.
            </Text>
          </View>
        )}

        {/* ── TOAST NOTIFICATION ─────────────────────────────────────── */}
        {toastMessage && (
          <Animated.View 
            entering={FadeInDown.duration(200)} 
            exiting={FadeOut.duration(200)} 
            style={ds.toastContainer}
          >
            <View style={ds.toastBubble}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={ds.toastText}>{toastMessage}</Text>
            </View>
          </Animated.View>
        )}

        {/* ── FLOATING SCROLL TO BOTTOM BUTTON ────────────────────────── */}
        {showScrollToBottom && (
          <Animated.View 
            entering={FadeInDown.duration(200)} 
            exiting={FadeOut.duration(200)} 
            style={[ds.scrollToBottomBtnContainer, { bottom: keyboardVisible ? 60 : (tabBarHeight + 64) }]}
          >
            <TouchableOpacity 
              style={ds.scrollToBottomBtn}
              onPress={() => {
                isNearBottomRef.current = true;
                setShowScrollToBottom(false);
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
              <Text style={ds.scrollToBottomText}>New Messages</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── CHAT LIST OR EMPTY HERO ─────────────────────────────── */}
        {activeMessages.length === 0 ? (
          <ScrollView 
            contentContainerStyle={ds.emptyScrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={ds.emptyHero}>
              <KnoMascot state="happy" size={42} />
              <Text style={ds.emptyTitle}>How can I help today?</Text>
              
              <View style={[ds.secureIndicator, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
                <Ionicons name="lock-closed" size={14} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={[ds.secureIndicatorText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                  Secure Notes are private and are never accessible by AI.
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={activeMessages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardVisible ? 16 : (tabBarHeight + 100) }}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={15}
            updateCellsBatchingPeriod={50}
            onScroll={handleScroll}
            onScrollBeginDrag={() => {
              isUserScrollingRef.current = true;
            }}
            onScrollEndDrag={() => {
              isUserScrollingRef.current = false;
            }}
            onMomentumScrollEnd={() => {
              isUserScrollingRef.current = false;
            }}
            onContentSizeChange={() => {
              if (activeMessages.length > 0) {
                if (isNearBottomRef.current) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                } else if (isGenerating) {
                  setShowScrollToBottom(true);
                }
              }
            }}
            renderItem={({ item }) => (
              <ChatMessageItem
                item={item}
                activeMessageId={activeMessageId}
                isSpeaking={isSpeaking}
                isPaused={isPaused}
                theme={theme}
                colors={colors}
                isDark={isDark}
                ds={ds}
                mdStyles={mdStyles}
                copyText={copyText}
                shareText={shareText}
                speak={speak}
                pauseSpeech={pauseSpeech}
                resumeSpeech={resumeSpeech}
                stopSpeech={stopSpeech}
                retryLastMessage={retryLastMessage}
                getSpeechLanguage={getSpeechLanguage}
              />
            )}
            ListFooterComponent={
              isAITyping ? (
                <View style={ds.aiRow}>
                  <View style={ds.aiAvatarWrapper}>
                    <KnoMascot state="thinking" size={26} />
                  </View>
                  <View style={ds.bubbleContainer}>
                    <TypingIndicator theme={theme} />
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* ── BOTTOM DOCK CONTAINER (CHATGPT PILL + SUGGESTIONS) ── */}
        <View style={[ds.bottomDockContainer, { paddingBottom: keyboardVisible ? 4 : (tabBarHeight + Math.max(insets.bottom, 4)) }]}>
          {/* SUGGESTION CHIPS – hidden during typing (ChatGPT behavior) */}
          {!keyboardVisible && (
            <View style={ds.suggestionsContainerOutside}>
              <FlatList
                horizontal
                data={DEFAULT_QUICK_ACTIONS}
                keyExtractor={(item, index) => index.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 12, paddingRight: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSuggestionPress(item.prompt)}
                    style={[ds.suggestionChip, { marginRight: 6 }]}
                  >
                    <Ionicons name={item.icon as any} size={13} color={theme.primary} style={{ marginRight: 5 }} />
                    <Text style={ds.suggestionChipLabel}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* ChatGPT-style Pill Input Component */}
          <View style={ds.composerContainer}>
            <View style={ds.inputWrapperHorizontal}>
              {/* Multiline TextInput */}
              <TextInput
                ref={inputRef}
                style={[
                  ds.inputHorizontal,
                  { height: Math.min(104, Math.max(38, inputHeight)) }
                ]}
                placeholder={
                  status === 'listening' ? "🔴 Listening..." :
                  status === 'processing' ? "⏳ Processing..." :
                  status === 'error' ? "⚠️ Voice unavailable" :
                  "Ask KnoVault AI..."
                }
                placeholderTextColor={colors.text.tertiary}
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => {
                  setKeyboardVisible(true);
                  if (isNearBottomRef.current) {
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
                  }
                }}
                onSubmitEditing={() => {
                  if (!isGenerating && !isSendingRef.current && inputText.trim()) {
                    sendMessage();
                  }
                }}
                multiline={true}
                onContentSizeChange={(e) => {
                  setInputHeight(e.nativeEvent.contentSize.height);
                }}
                textAlignVertical="center"
                maxLength={2000}
              />

              {/* Mic button inside input row */}
              <TouchableOpacity
                onPress={() => {
                  if (!microphoneAccessEnabled) {
                    showMicAccessDisabledAlert();
                    return;
                  }

                  if (!isVoiceSupported) {
                    Alert.alert(
                      "Voice Input Unavailable",
                      "Voice input requires a development build.\nPlease use a Dev Client build to test voice recognition.",
                      [
                        {
                          text: "Continue with keyboard input",
                          onPress: () => {
                            setTimeout(() => {
                              inputRef.current?.focus();
                            }, 100);
                          },
                          style: "default"
                        }
                      ]
                    );
                    return;
                  }

                  if (status === 'listening') {
                    stopListening();
                  } else {
                    initialTextRef.current = inputText;
                    startListening(getSpeechLanguage(inputText));
                  }
                }}
                style={[
                  ds.micBtnHorizontal,
                  status === 'listening' && ds.micBtnActive,
                  status === 'processing' && { backgroundColor: isDark ? '#1C2638' : '#F5F3FF', borderColor: theme.primary },
                  status === 'error' && { backgroundColor: isDark ? '#2D1616' : '#FEF2F2', borderColor: '#EF4444' },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={
                    status === 'listening' ? "square" :
                    status === 'processing' ? "hourglass" :
                    status === 'error' ? "alert-circle" :
                    "mic-outline"
                  } 
                  size={18} 
                  color={
                    status === 'listening' ? "#FFFFFF" :
                    status === 'processing' ? theme.primary :
                    status === 'error' ? "#EF4444" :
                    theme.textSecondary
                  } 
                />
              </TouchableOpacity>

              {/* ChatGPT Circular Send / Stop Up-Arrow button */}
              <TouchableOpacity
                onPress={isGenerating ? handleStopGeneration : () => sendMessage()}
                disabled={isGenerating ? false : (isSendingRef.current || !inputText.trim())}
                style={[ds.sendBtnHorizontal, (!isGenerating && (isSendingRef.current || !inputText.trim())) && ds.sendBtnDisabled]}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    ds.sendGradientHorizontal,
                    {
                      backgroundColor: isGenerating
                        ? '#EF4444'
                        : (inputText.trim() ? theme.primary : (isDark ? '#263044' : '#E2E8F0'))
                    }
                  ]}
                >
                  {isGenerating ? (
                    <Ionicons 
                      name="square" 
                      size={12} 
                      color="#FFFFFF" 
                    />
                  ) : (
                    <Ionicons 
                      name="arrow-up" 
                      size={18} 
                      color={inputText.trim() ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8')} 
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      {/* ── CHAT HISTORY DRAWER (REANIMATED SLIDE OVERLAY) ────────── */}
      {isDrawerOpen && (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
          {/* Backdrop Fader */}
          <Animated.View style={[ds.drawerBackdrop, backdropStyle]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsDrawerOpen(false)} />
          </Animated.View>

          {/* Sliding Panel */}
          <Animated.View style={[ds.drawerPanel, drawerStyle, { paddingTop: insets.top }]}>
            {/* Drawer Header */}
            <View style={ds.drawerHeader}>
              <Text style={[ds.drawerHeadingText, { color: theme.text }]}>Chat History</Text>
              <TouchableOpacity onPress={() => setIsDrawerOpen(false)} style={ds.drawerCloseBtn}>
                <Ionicons name="close-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input inside drawer */}
            <View style={ds.drawerSearchWrapper}>
              <Ionicons name="search-outline" size={16} color={colors.text.tertiary} style={ds.drawerSearchIcon} />
              <TextInput
                style={[ds.drawerSearchInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Search chats..."
                placeholderTextColor={colors.text.tertiary}
                value={threadSearchQuery}
                onChangeText={setThreadSearchQuery}
              />
            </View>

            {/* Start New Conversation button */}
            <TouchableOpacity onPress={handleStartNewChat} style={ds.drawerNewChatBtn}>
              <Ionicons name="add-outline" size={18} color="#FFFFFF" />
              <Text style={ds.drawerNewChatBtnText}>New Conversation</Text>
            </TouchableOpacity>

            {/* Scrollable list grouped by Date category */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds.drawerListScroll}>
              {Object.keys(groupedThreads).map((groupName) => {
                const groupList = groupedThreads[groupName as keyof typeof groupedThreads];
                if (groupList.length === 0) return null;

                return (
                  <View key={groupName} style={ds.drawerGroupContainer}>
                    <Text style={ds.drawerGroupTitle}>{groupName.toUpperCase()}</Text>
                    {groupList.map((thread) => {
                      const isActive = thread.id === activeThreadId;
                      const isEditing = editingThreadId === thread.id;

                      return (
                        <TouchableOpacity
                          key={thread.id}
                          onPress={() => handleSelectThread(thread.id)}
                          style={[ds.drawerThreadCard, isActive && ds.drawerThreadCardActive]}
                        >
                          <Ionicons 
                            name={thread.isPinned ? "pin" : "chatbubble-ellipses-outline"} 
                            size={16} 
                            color={isActive ? theme.primary : colors.text.tertiary} 
                          />
                          
                          {isEditing ? (
                            <TextInput
                              style={[ds.drawerThreadRenameInput, { color: theme.text }]}
                              value={renameText}
                              onChangeText={setRenameText}
                              onSubmitEditing={handleRenameSave}
                              autoFocus
                            />
                          ) : (
                            <Text style={[ds.drawerThreadTitle, isActive && ds.drawerThreadTitleActive]} numberOfLines={1}>
                              {thread.title}
                            </Text>
                          )}

                          <View style={ds.drawerThreadCardActions}>
                            {isEditing ? (
                              <TouchableOpacity onPress={handleRenameSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="checkmark" size={16} color={theme.success} />
                              </TouchableOpacity>
                            ) : (
                              <>
                                <TouchableOpacity 
                                  onPress={() => {
                                    setEditingThreadId(thread.id);
                                    setRenameText(thread.title);
                                  }} 
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons name="pencil-outline" size={14} color={colors.text.tertiary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => togglePinThread(thread.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <Ionicons name="pin-outline" size={14} color={thread.isPinned ? theme.primary : colors.text.tertiary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => exportThreadMarkdown(thread.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <Ionicons name="share-outline" size={14} color={colors.text.tertiary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteThread(thread.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <Ionicons name="trash-outline" size={14} color={colors.semantic.error} />
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* ── AI MEMORY MANAGEMENT SCREEN (MODAL) ──────────────────── */}
      <Modal
        visible={isMemoryModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMemoryModalOpen(false)}
      >
        <View style={ds.modalContainer}>
          <View style={[ds.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={ds.modalHeader}>
              <Text style={[ds.modalTitle, { color: theme.text }]}>🧠 AI Memory System</Text>
              <TouchableOpacity onPress={() => setIsMemoryModalOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[ds.modalSubtitle, { color: theme.textSecondary }]}>
              Kno remembers these preferences and details about you to personalize its responses:
            </Text>

            <View style={[ds.secureIndicatorModal, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
              <Ionicons name="lock-closed" size={13} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={[ds.secureIndicatorTextModal, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                Secure Notes are private and are never accessible by AI.
              </Text>
            </View>

            {/* Memory list */}
            <FlatList
              data={memories}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 300, marginVertical: 10 }}
              renderItem={({ item }) => (
                <View style={[ds.memoryRow, { borderColor: theme.border }]}>
                  <Text style={[ds.memoryText, { color: theme.text }]}>{item.text}</Text>
                  <TouchableOpacity onPress={() => deleteMemory(item.id)}>
                    <Ionicons name="trash-outline" size={16} color={colors.semantic.error} />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={ds.emptyMemoryText}>No preferences stored yet.</Text>
              }
            />

            {/* Add Memory Form */}
            <View style={ds.addMemoryForm}>
              <TextInput
                style={[ds.addMemoryInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                placeholder="Teach Kno something new (e.g. 'I prefer concise summaries')"
                placeholderTextColor={colors.text.tertiary}
                value={newMemoryText}
                onChangeText={setNewMemoryText}
              />
              <TouchableOpacity onPress={handleAddMemory} style={ds.addMemoryBtn}>
                <Text style={ds.addMemoryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Check if Tamil characters exist in string
const isTamilText = (text: string) => /[\u0B80-\u0BFF]/.test(text);

const markdownStyles = (theme: any, colors: any, isDark: boolean) => ({
  body: { ...typography.bodyMedium, color: theme.text, lineHeight: 22 },
  paragraph: { marginTop: 4, marginBottom: 6 },
  heading1: { fontSize: 18, fontWeight: '800' as const, marginTop: 10, marginBottom: 6, color: theme.text },
  heading2: { fontSize: 16, fontWeight: '700' as const, marginTop: 8, marginBottom: 4, color: theme.text },
  code_inline: {
    backgroundColor: isDark ? '#1C2638' : colors.surface.background, color: colors.primary[600],
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  code_block: {
    backgroundColor: '#1E293B', color: '#E2E8F0', padding: 12,
    borderRadius: 12, marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  fence: { backgroundColor: '#1E293B', color: '#E2E8F0', padding: 12, borderRadius: 12, marginVertical: 8 },
  link: { color: theme.primary, textDecorationLine: 'underline' as const },
  strong: { fontWeight: '800' as const, color: theme.text },
  list_item: { marginVertical: 2 },
});

const dsFunc = (theme: any, colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { ...typography.bodySmall, color: theme.textSecondary, marginTop: 15, fontWeight: '700' },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: theme.card,
    borderBottomWidth: 1.2,
    borderBottomColor: theme.border,
    zIndex: 10,
    ...getThemedShadow(theme, 'soft')
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 10,
  },
  tempChatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.border,
  },
  tempChatBannerText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: theme.text,
    fontSize: 16
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4
  },
  onlineText: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '600'
  },

  // Empty State styles
  emptyScrollContainer: {
    flexGrow: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  emptyHero: {
    alignItems: 'center',
    marginVertical: 5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    marginTop: 3,
  },
  secureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    maxWidth: '90%',
  },
  secureIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  secureIndicatorModal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  secureIndicatorTextModal: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
    paddingHorizontal: 20,
  },
  suggestionsBox: {
    width: '100%',
    marginTop: 10,
  },
  suggestionsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  suggestionsScroll: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  suggestionsScrollContent: {
    gap: 8,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  bottomDockContainer: {
    backgroundColor: 'transparent',
    paddingTop: 4,
  },
  suggestionsContainerOutside: {
    paddingVertical: 4,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.border,
  },
  suggestionChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text,
  },

  // Chat Bubble styles
  chatList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  msgRow: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  aiAvatarWrapper: {
    marginRight: 8,
    marginTop: 4,
  },
  bubbleContainer: {
    maxWidth: '85%',
  },
  userBubbleContainer: {
    alignItems: 'flex-end',
  },
  aiBubbleContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    ...getThemedShadow(theme, 'soft'),
  },
  userBubble: {
    backgroundColor: theme.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: theme.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  errorBubble: {
    backgroundColor: isDark ? '#451225' : '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  activeBubble: {
    borderColor: theme.primary,
    borderWidth: 1.5,
  },
  userText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    opacity: 0.5,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  userTime: {
    marginRight: 4,
  },
  aiTime: {
    marginLeft: 4,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F43F5E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },

  // Chat message bubble actions
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 0.5,
    borderTopColor: theme.border,
    paddingTop: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickActionBtnActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Input Container styles (ChatGPT Pill)
  composerContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },
  inputWrapperHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 26,
    borderWidth: 1.2,
    borderColor: theme.border,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 48,
    maxHeight: 116,
    ...getThemedShadow(theme, 'soft'),
  },
  inputHorizontal: {
    flex: 1,
    ...typography.bodyMedium,
    color: theme.text,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    fontSize: 14.5,
    minHeight: 36,
    maxHeight: 104,
  },
  micBtnHorizontal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    marginRight: 2,
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  sendBtnHorizontal: {
    marginLeft: 4,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendGradientHorizontal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    ...getThemedShadow(theme, 'soft'),
  },

  // Removed preview styles

  // Drawer styles
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: width * 0.8,
    backgroundColor: theme.card,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  drawerHeadingText: {
    fontSize: 18,
    fontWeight: '800',
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  drawerSearchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  drawerSearchInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingLeft: 36,
    fontSize: 13,
  },
  drawerNewChatBtn: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  drawerNewChatBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  drawerListScroll: {
    paddingBottom: 40,
  },
  drawerGroupContainer: {
    marginBottom: 20,
  },
  drawerGroupTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  drawerThreadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    gap: 8,
  },
  drawerThreadCardActive: {
    backgroundColor: theme.primary + '12',
  },
  drawerThreadTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    flex: 1,
  },
  drawerThreadTitleActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  drawerThreadRenameInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  drawerThreadCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Memory Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  memoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  memoryText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  emptyMemoryText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginVertical: 20,
  },
  addMemoryForm: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  addMemoryInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  addMemoryBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addMemoryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // User Copy Icon Button style
  userCopyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userCopyBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Toast Banner styles
  toastContainer: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    zIndex: 1100,
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1E293B' : '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Floating Scroll to Bottom Button styles
  scrollToBottomBtnContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
  },
  scrollToBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  scrollToBottomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 36,
    width: 60,
    justifyContent: 'center',
    marginTop: 4,
    marginLeft: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});

export default AIScreen;
