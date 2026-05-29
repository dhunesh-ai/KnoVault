import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import SwipeWrapper from '../../src/components/SwipeWrapper';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, FlatList, ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Clipboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/hooks/useTheme';
import { aiApi } from '../../src/api/ai';
import { goalsApi } from '../../src/api/goals';
import { remindersApi } from '../../src/api/reminders';
import { importantDaysApi } from '../../src/api/important_days';
import { notesApi } from '../../src/api/notes';
import { typography } from '../../src/theme';
import { useSpeech } from '../../src/hooks/useSpeech';
import { getMergedSuggestions, type AppContextCounts } from '../../src/constants/aiSuggestions';
import AISuggestions from '../../components/AISuggestions';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import { buildAIContext } from '../../src/ai/buildAIContext';
import { generateSystemPrompt } from '../../src/ai/systemPrompt';
import { detectIntent } from '../../src/ai/intentDetector';
import { retrieveRelevantNotes } from '../../src/ai/retrieveRelevantNotes';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

// ── Speaking Pulse Indicator ─────────────────────────────────────────
const SpeakingPulse = ({ colors, isDark, theme }: { colors: any; isDark: boolean; theme: any }) => {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1, true,
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AIScreen() {
  const { user } = useAuthStore();
  const { colors, theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { speak, stop: stopSpeech, isSpeaking, activeMessageId } = useSpeech();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const lastNoteContextRef = useRef<string>('');
  const flatListRef = useRef<FlatList>(null);

  const [ctxCounts, setCtxCounts] = useState<AppContextCounts>({
    pendingGoals: 0, upcomingReminders: 0, upcomingBirthdays: 0, recentNotes: 0,
  });

  const suggestions = useMemo(() => getMergedSuggestions(ctxCounts, 6), [ctxCounts]);

  const fetchContextCounts = useCallback(async () => {
    try {
      const [goals, reminders, importantDaysRes, notes] = await Promise.allSettled([
        goalsApi.getGoals(),
        remindersApi.getUpcomingReminders(10),
        importantDaysApi.getImportantDays(),
        notesApi.getNotes(),
      ]);
      setCtxCounts({
        pendingGoals: goals.status === 'fulfilled' ? goals.value.filter((g: any) => !g.completed).length : 0,
        upcomingReminders: reminders.status === 'fulfilled' ? reminders.value.length : 0,
        upcomingBirthdays: importantDaysRes.status === 'fulfilled' ? importantDaysRes.value.length : 0,
        recentNotes: notes.status === 'fulfilled' ? notes.value.length : 0,
      });
    } catch (e) {
      console.warn('[AI SUGGESTIONS] Context fetch failed:', e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    fetchContextCounts();

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showListener = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideListener = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showListener.remove();
      hideListener.remove();
      stopSpeech();
    };
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const res = await aiApi.getHistory();
      const formattedHistory: Message[] = res.chats.map((chat: any) => ([
        { id: `u-${chat.id}`, sender: 'user' as const, content: chat.message, timestamp: new Date(chat.created_at) },
        { id: `a-${chat.id}`, sender: 'assistant' as const, content: chat.response, timestamp: new Date(chat.created_at) },
      ])).flat();

      if (formattedHistory.length === 0) {
        setMessages([{
          id: 'welcome', sender: 'assistant',
          content: `Hi ${user?.full_name?.split(' ')[0] || 'there'}! I'm KnoVault AI, your productivity partner. How can I help you organize your life today?`,
          timestamp: new Date(),
        }]);
      } else {
        setMessages(formattedHistory);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 500);
    }
  };

  const simulateStreaming = async (fullText: string, messageId: string) => {
    let currentText = "";
    const words = fullText.split(" ");
    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? "" : " ") + words[i];
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: currentText, isStreaming: i < words.length - 1 } : m
      ));
      const delay = fullText.length > 500 ? 8 : 25;
      await new Promise(resolve => setTimeout(resolve, delay));
      if (i % 5 === 0) flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    // Update recent topics memory (keep last 5 topics)
    const topicText = textToSend.substring(0, 50).trim();
    setRecentTopics(prev => {
      const updated = [...prev, topicText];
      if (updated.length > 5) updated.shift();
      return updated;
    });

    const userMsg: Message = {
      id: Date.now().toString(), sender: 'user',
      content: textToSend.trim(), timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInputText('');
    setIsTyping(true);
    Keyboard.dismiss();

    const aiMsgId = `ai-${Date.now()}`;
    const placeholderMsg: Message = {
      id: aiMsgId, sender: 'assistant', content: "", timestamp: new Date(), isStreaming: true,
    };
    setMessages(prev => [...prev, placeholderMsg]);

    try {
      // ═══ PHASE 1: Intent Detection ═══
      const intent = detectIntent(textToSend.trim());
      console.log(`[AI PIPELINE] Intent: ${intent.intent}, NoteRef: ${intent.noteReference}, Keywords: ${intent.keywords.join(',')}`);

      // ═══ PHASE 2: Smart Note Retrieval ═══
      const noteRetrieval = await retrieveRelevantNotes(
        intent,
        intent.isFollowUp ? lastNoteContextRef.current : undefined
      );
      
      // Store note context for follow-up queries
      if (noteRetrieval.noteContext) {
        lastNoteContextRef.current = noteRetrieval.noteContext;
      }
      
      console.log(`[AI PIPELINE] Retrieved ${noteRetrieval.retrievedCount} notes`);

      // ═══ PHASE 3: Build General Context ═══
      const generalContext = await buildAIContext();

      // ═══ PHASE 4: Combine contexts ═══
      let fullContext = generalContext;
      if (noteRetrieval.noteContext) {
        fullContext += '\n\n' + noteRetrieval.noteContext;
      }

      // ═══ PHASE 5: Generate Smart System Prompt ═══
      const systemPrompt = generateSystemPrompt(recentTopics, intent.intent);

      // ═══ PHASE 6: Call AI Backend ═══
      const res = await aiApi.chat(userMsg.content, fullContext, systemPrompt);
      
      setIsTyping(false);
      await simulateStreaming(res.response, aiMsgId);
    } catch (e: any) {
      setIsTyping(false);
      setMessages(prev => prev.map(m => 
        m.id === aiMsgId 
          ? { ...m, content: "AI is temporarily unavailable. Please try again later.", isStreaming: false, isError: true }
          : m
      ));
    } finally {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const clearChat = async () => {
    stopSpeech();
    try {
      await aiApi.clearHistory();
      setMessages([{
        id: 'welcome', sender: 'assistant',
        content: `Chat cleared. I'm ready to help with new ideas!`, timestamp: new Date(),
      }]);
    } catch (e) { /* silently fail */ }
  };

  const copyText = (text: string) => {
    try { Clipboard.setString(text); } catch (e) { console.warn('[COPY] Clipboard not available:', e); }
  };

  const retryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
    if (lastUserMsg) {
      setMessages(prev => prev.filter(m => !m.isError));
      sendMessage(lastUserMsg.content);
    }
  };

  const ds = dsFunc(theme, colors, isDark);
  const mdStyles = markdownStyles(theme, colors, isDark);

  if (isLoading) {
    return (
      <View style={[ds.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={ds.loadingText}>Connecting to KnoVault Intelligence...</Text>
      </View>
    );
  }

  return (
    <SwipeWrapper currentTab="ai">
      <View style={ds.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={[ds.header, { paddingTop: Math.max(insets.top, 10) + 10 }]}>
        <View style={ds.headerLeft}>
          <LinearGradient colors={colors.gradient.primary} style={ds.aiAvatar}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
          </LinearGradient>
          <View style={ds.headerTitleContainer}>
            <Text style={ds.headerTitle}>KnoVault AI</Text>
            <View style={ds.onlineBadge}>
              <View style={ds.onlineDot} />
              <Text style={ds.onlineText}>Intelligence Active</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={clearChat} style={ds.clearBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }} keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={ds.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={ds.welcomeInfo}>
              <Ionicons name="shield-checkmark" size={13} color="#10B981" />
              <Text style={ds.securityText}>Secure notes are always protected and private</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            const isActive = activeMessageId === item.id && isSpeaking;
            const canSpeak = !isUser && !item.isStreaming && item.content.length > 0;

            return (
              <Animated.View
                entering={isUser ? FadeInUp.delay(50) : FadeInDown.delay(50)}
                style={[ds.msgRow, isUser ? ds.userRow : ds.aiRow]}
              >
                {!isUser && (
                  <View style={[ds.aiBubbleAvatar, isActive && ds.aiBubbleAvatarActive]}>
                    <Ionicons name="flash" size={11} color={isActive ? "#FFFFFF" : theme.primary} />
                  </View>
                )}
                <View style={[
                  ds.bubble,
                  isUser ? ds.userBubble : ds.aiBubble,
                  item.isError && ds.errorBubble,
                  isActive && ds.activeBubble,
                ]}>
                  {isUser ? (
                    <Text style={ds.userText}>{item.content}</Text>
                  ) : (
                    <Markdown style={mdStyles}>{item.content || "…"}</Markdown>
                  )}

                  {isActive && <SpeakingPulse colors={colors} isDark={isDark} theme={theme} />}

                  {item.isError && (
                    <TouchableOpacity style={ds.retryBtn} onPress={retryLastMessage}>
                      <Ionicons name="refresh" size={13} color="#FFFFFF" />
                      <Text style={ds.retryText}>Retry</Text>
                    </TouchableOpacity>
                  )}

                  {canSpeak && !item.isError && (
                    <View style={ds.actionRow}>
                      <TouchableOpacity
                        style={[ds.actionBtn, isActive && ds.actionBtnActive]}
                        onPress={() => speak(item.content, item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={isActive ? "stop-circle" : "volume-medium-outline"}
                          size={14}
                          color={isActive ? "#FFFFFF" : colors.text.tertiary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={ds.actionBtn}
                        onPress={() => copyText(item.content)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="copy-outline" size={13} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={[ds.timeText, isUser ? ds.userTime : ds.aiTime]}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </Animated.View>
            );
          }}
          ListFooterComponent={
            <View>
              {isTyping && (
                <Animated.View entering={FadeInDown} style={ds.typingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary[300]} style={{ marginRight: 8 }} />
                  <Text style={ds.typingText}>Thinking…</Text>
                </Animated.View>
              )}
              <View style={{ height: 12 }} />
            </View>
          }
        />

        <AISuggestions
          suggestions={suggestions}
          onSelect={sendMessage}
          disabled={isTyping}
        />

        <View style={[
          ds.inputArea,
          !isKeyboardVisible && { paddingBottom: Math.max(insets.bottom, 15) + 85 },
        ]}>
          <View style={ds.inputWrapper}>
            <TextInput
              style={ds.input}
              placeholder="Message KnoVault AI…"
              placeholderTextColor={colors.text.tertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="center"
              maxLength={2000}
            />
            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isTyping}
              style={[ds.sendBtn, !inputText.trim() && ds.sendBtnDisabled]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={inputText.trim() ? colors.gradient.primary : (isDark ? ['#1A243D', '#151F32'] : ['#F1F5F9', '#E2E8F0'])}
                style={ds.sendGradient}
              >
                {isTyping ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color={isDark && !inputText.trim() ? '#64748B' : '#FFFFFF'} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
    </SwipeWrapper>
  );
}

const markdownStyles = (theme: any, colors: any, isDark: boolean) => ({
  body: { ...typography.bodyMedium, color: theme.text, lineHeight: 21 },
  paragraph: { marginTop: 2, marginBottom: 4 },
  heading1: { fontSize: 16, fontWeight: '700' as const, marginTop: 6, marginBottom: 4, color: theme.text },
  heading2: { fontSize: 15, fontWeight: '700' as const, marginTop: 5, marginBottom: 3, color: theme.text },
  code_inline: {
    backgroundColor: isDark ? '#1C2638' : colors.surface.background, color: colors.primary[600],
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  code_block: {
    backgroundColor: '#1E293B', color: '#E2E8F0', padding: 12,
    borderRadius: 12, marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fence: { backgroundColor: '#1E293B', color: '#E2E8F0', padding: 12, borderRadius: 12, marginVertical: 8 },
  link: { color: theme.primary, textDecorationLine: 'underline' as const },
  strong: { fontWeight: '800' as const, color: theme.text },
});

const dsFunc = (theme: any, colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  loadingText: { ...typography.bodySmall, color: theme.textSecondary, marginTop: 15, fontWeight: '700' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 14, 
    backgroundColor: theme.card, 
    borderBottomWidth: 1.2, 
    borderBottomColor: theme.border, 
    ...getThemedShadow(theme, 'soft') 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  aiAvatar: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 11, ...getThemedShadow(theme, 'soft') },
  headerTitleContainer: { justifyContent: 'center' },
  headerTitle: { ...typography.titleSmall, fontWeight: '800', color: theme.text, fontSize: 16 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  onlineDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981', marginRight: 5 },
  onlineText: { fontSize: 10, color: colors.text.tertiary, fontWeight: '600' },
  clearBtn: { padding: 10, backgroundColor: theme.surface, borderRadius: 12 },
  welcomeInfo: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: isDark ? '#1C2638' : '#F5F3FF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginBottom: 18 },
  securityText: { fontSize: 10, color: isDark ? '#C4B5FD' : colors.primary[700], fontWeight: '600', marginLeft: 5 },
  chatList: { paddingHorizontal: 16, paddingVertical: 16 },
  msgRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  aiBubbleAvatar: { width: 22, height: 22, borderRadius: 7, backgroundColor: isDark ? '#1C2638' : '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 7, marginBottom: 5 },
  aiBubbleAvatarActive: { backgroundColor: theme.primary },
  bubble: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 20, maxWidth: '88%', ...getThemedShadow(theme, 'soft') },
  userBubble: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: theme.card, borderBottomLeftRadius: 4, borderWidth: 1.2, borderColor: theme.border },
  errorBubble: { backgroundColor: isDark ? '#451225' : '#FEF2F2', borderColor: '#FCA5A5' },
  activeBubble: { borderColor: theme.primary, borderWidth: 1.5 },
  userText: { ...typography.bodyMedium, color: '#FFFFFF', fontWeight: '600' },
  timeText: { fontSize: 9, marginTop: 6, opacity: 0.5, fontWeight: '600' },
  userTime: { color: '#FFFFFF', textAlign: 'right' as const },
  aiTime: { color: colors.text.tertiary, textAlign: 'left' as const },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 2 },
  actionBtn: { width: 30, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface },
  actionBtnActive: { backgroundColor: theme.primary },
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F43F5E', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, alignSelf: 'flex-start', marginTop: 10 },
  retryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', marginLeft: 30, marginBottom: 16 },
  typingText: { ...typography.caption, color: colors.text.tertiary, fontWeight: '700' },
  inputArea: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, backgroundColor: theme.card, borderTopWidth: 1.2, borderTopColor: theme.border, ...getThemedShadow(theme, 'medium') },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: theme.surface, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1.2, borderColor: theme.border, minHeight: 48 },
  input: { flex: 1, ...typography.bodyMedium, color: theme.text, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 8, maxHeight: 120 },
  sendBtn: { marginLeft: 8, marginBottom: 3 },
  sendBtnDisabled: { opacity: 0.5 },
  sendGradient: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', ...getThemedShadow(theme, 'soft') },
});

export default AIScreen;
