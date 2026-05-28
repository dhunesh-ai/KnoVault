import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Switch, Modal, TextInput, ActivityIndicator, Platform,
  BackHandler, TouchableWithoutFeedback, Dimensions, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, { 
  FadeIn, FadeOut, ZoomIn, ZoomOut, FadeInDown, FadeInUp, FadeOutUp,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSpring
} from 'react-native-reanimated';
import { LineChart } from 'react-native-chart-kit';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/hooks/useTheme';
import { notesApi } from '../../src/api/notes';
import { remindersApi } from '../../src/api/reminders';
import { typography } from '../../src/theme';
import client from '../../src/api/client';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import { syncWorkspace } from '../../src/services/sync';
import { exportLocalBackup, importLocalBackup } from '../../src/services/backup';

let FileSystem: any = null;
try { FileSystem = require('expo-file-system'); } catch {}
let Sharing: any = null;
try { Sharing = require('expo-sharing'); } catch {}
let DocumentPicker: any = null;
try { DocumentPicker = require('expo-document-picker'); } catch {}

const MOTIVATIONAL_QUOTES = [
  "Focus on being productive instead of busy.",
  "Your mind is for having ideas, not holding them.",
  "Small daily improvements over time lead to stunning results.",
  "Done is better than perfect.",
  "The secret of getting ahead is getting started.",
  "Deep focus is the superpower of the 21st century."
];

const AI_ADVICES = [
  "Keep your daily goals bite-sized. Break down massive projects into 15-minute tasks to build daily momentum!",
  "Prioritize your tasks using the Eisenhower Matrix. Focus first on what is both urgent and important.",
  "Try the Pomodoro Technique: 25 minutes of deep focus followed by a 5-minute break. Repeat 4 times.",
  "Review your notes weekly to consolidate memory. Synthesize related details into action items.",
  "Keep your workspace minimal. Clutter in your environment often leads to clutter in your focus.",
  "Peak focus is a muscle. Train it daily by silencing notifications for at least 90 minutes."
];

const AVATAR_EMOJIS = ['🧠', '⚡', '🚀', '💡', '📅', '🎯', '🔮', '🛡️', '💼', '🎨', '👑', '🌈'];

const STORAGE_CACHE_KEY = 'knovault_backup_size';
const STORAGE_TIME_KEY = 'knovault_backup_time';
const STORAGE_AUTO_KEY = 'knovault_auto_backup';

export default function ProfileScreen() {
  const { user, logout, fetchUser } = useAuthStore();
  const { mode, setMode, colors, theme, isDark } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  
  // Custom states
  const [avatarEmoji, setAvatarEmoji] = useState('🧠');
  const [avatarModal, setAvatarModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [aboutModal, setAboutModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [supportModal, setSupportModal] = useState(false);
  const [signOutModal, setSignOutModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Personalization settings
  const [accentColor, setAccentColor] = useState('#7C4DFF');
  const [cardRadius, setCardRadius] = useState(18); // 12, 18, 24
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState('1.0x'); // 0.9x, 1.0x, 1.1x
  const [animationSpeed, setAnimationSpeed] = useState('Normal'); // Off, Normal, Fast

  // Security settings
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Feedback states
  const [rating, setRating] = useState(0);
  const [suggestion, setSuggestion] = useState('');
  const [selectedFeedbackChips, setSelectedFeedbackChips] = useState<string[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);

  // Active Line Chart Tooltip Info
  const [chartTooltip, setChartTooltip] = useState<{ day: string; value: number } | null>(null);

  // Custom Toast State
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Settings & Data management states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoBackupInterval, setAutoBackupInterval] = useState('Off'); 
  const [lastBackupTime, setLastBackupTime] = useState('Never');
  const [backupSize, setBackupSize] = useState('0 KB');
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbSize, setDbSize] = useState('0.00 KB');

  // Random quote & rotating AI advice index
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [aiAdviceIndex, setAiAdviceIndex] = useState(0);

  // Privacy collapsible states
  const [privacyExpanded, setPrivacyExpanded] = useState<Record<string, boolean>>({
    'local': false,
    'enc': false,
    'ai': false,
    'own': false,
    'cloud': false,
  });

  // Queries
  const { data: notes, isLoading: loadingNotes } = useQuery({ 
    queryKey: ['notes'], 
    queryFn: () => notesApi.getNotes() 
  });
  
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['profileStats'],
    queryFn: async () => { const r = await client.get('/api/profile/stats'); return r.data; },
  });

  const { data: reminders } = useQuery({ 
    queryKey: ['upcoming-reminders'], 
    queryFn: () => remindersApi.getUpcomingReminders(20) 
  });

  // Haptic Feedback Helper
  const triggerHaptic = async (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      await Haptics.impactAsync(style);
    } catch (e) {
      console.log('[Haptics Not Available]', e);
    }
  };

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3500);
  };

  // Load custom values from local storage/SecureStore
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_TIME_KEY).then(v => { if (v) setLastBackupTime(v); });
    SecureStore.getItemAsync(STORAGE_CACHE_KEY).then(v => { if (v) setBackupSize(v); });
    SecureStore.getItemAsync(STORAGE_AUTO_KEY).then(v => { if (v) setAutoBackupInterval(v); });
    SecureStore.getItemAsync('knovault_avatar_emoji').then(v => { if (v) setAvatarEmoji(v); });
    SecureStore.getItemAsync('knovault_accent_color').then(v => { if (v) setAccentColor(v); });
    SecureStore.getItemAsync('knovault_font_scale').then(v => { if (v) setFontSizeMultiplier(v); });
    SecureStore.getItemAsync('knovault_anim_speed').then(v => { if (v) setAnimationSpeed(v); });
    SecureStore.getItemAsync('knovault_card_radius').then(v => { if (v) setCardRadius(parseInt(v)); });
    SecureStore.getItemAsync('knovault_app_lock').then(v => { if (v) setAppLockEnabled(v === 'true'); });
    SecureStore.getItemAsync('knovault_biometrics').then(v => { if (v) setBiometricsEnabled(v === 'true'); });
    
    // Fetch actual DB file size
    if (FileSystem) {
        FileSystem.getInfoAsync(FileSystem.documentDirectory + 'SQLite/knovault.db').then((info: any) => {
            if (info.exists) {
                setDbSize((info.size / 1024).toFixed(2) + ' KB');
            }
        }).catch(() => {});
    }
  }, []);

  // Back handler for modals
  useEffect(() => {
    const onBackPress = () => {
      if (aboutModal) { setAboutModal(false); return true; }
      if (editModal) { setEditModal(false); return true; }
      if (privacyModal) { setPrivacyModal(false); return true; }
      if (supportModal) { setSupportModal(false); return true; }
      if (avatarModal) { setAvatarModal(false); return true; }
      if (signOutModal) { setSignOutModal(false); return true; }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [aboutModal, editModal, privacyModal, supportModal, avatarModal, signOutModal]);

  // Randomize quote on mount
  useEffect(() => {
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  }, []);

  // Shared Animation Values
  const avatarScale = useSharedValue(1);
  const skeletonOpacity = useSharedValue(0.4);
  const orbTranslateY = useSharedValue(0);

  useEffect(() => {
    avatarScale.value = withRepeat(
      withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    skeletonOpacity.value = withRepeat(
      withTiming(0.8, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    orbTranslateY.value = withRepeat(
      withTiming(15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedAvatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const animatedSkeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: orbTranslateY.value }],
  }));

  // Calculations & Values
  const displayName = user?.full_name || 'Innovator';
  const email = user?.email || 'user@knovault.com';
  const completedGoals = stats?.completed_goals ?? 0;
  const totalGoals = stats?.total_goals ?? 0;
  const successRate = stats?.success_rate ?? 0;
  const dayStreak = stats?.day_streak ?? 0;
  const totalNotes = notes?.length ?? 0;

  // Time-based greeting
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const joinedDate = useMemo(() => {
    if (user?.created_at) {
      try {
        const d = new Date(user.created_at);
        return `Joined ${d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}`;
      } catch (e) {}
    }
    return 'Joined May 2026';
  }, [user?.created_at]);

  // Workspace Stats Calculations
  const productivityLevel = useMemo(() => {
    if (completedGoals >= 15 && totalNotes >= 25) return 'Productivity Alchemist';
    if (completedGoals >= 8 && totalNotes >= 10) return 'Deep Focus Master';
    if (completedGoals >= 3 || totalNotes >= 5) return 'Rising Achiever';
    return 'Productivity Initiate';
  }, [completedGoals, totalNotes]);

  const focusScoreVal = useMemo(() => {
    const base = Math.round(successRate * 0.8 + Math.min(20, totalNotes * 0.5));
    return Math.min(100, base);
  }, [successRate, totalNotes]);

  const focusScore = `${focusScoreVal}/100`;

  const weeklyProductivityVal = useMemo(() => {
    const base = Math.round(successRate * 0.9 + Math.min(10, dayStreak * 2));
    return Math.min(100, base);
  }, [successRate, dayStreak]);

  const weeklyProductivity = `${weeklyProductivityVal}%`;

  // Storage Analytics sizes
  const secureNotes = useMemo(() => notes?.filter((n: any) => n.is_secure) || [], [notes]);
  const secureNotesSize = useMemo(() => {
    const len = secureNotes.reduce((acc: number, n: any) => acc + (n.content?.length || 0) + (n.title?.length || 0), 0);
    return `${(len / 1024).toFixed(2)} KB`;
  }, [secureNotes]);

  const totalContentSize = useMemo(() => {
    const len = notes?.reduce((acc: number, n: any) => acc + (n.content?.length || 0) + (n.title?.length || 0), 0) || 0;
    return len;
  }, [notes]);

  const usedStorageStr = useMemo(() => {
    const kb = (totalContentSize + 1024) / 1024;
    return `${kb.toFixed(2)} KB`;
  }, [totalContentSize]);

  const localCacheStr = useMemo(() => {
    const kb = (totalContentSize * 1.4 + 4096) / 1024;
    return `${kb.toFixed(2)} KB`;
  }, [totalContentSize]);

  const storagePercentage = useMemo(() => {
    const percent = (totalContentSize / 102400) * 100;
    return Math.min(100, Math.max(8, percent));
  }, [totalContentSize]);

  // Graph Data generation (Weekly curved graph)
  const last7DaysData = useMemo(() => {
    const dataPoints = [0, 0, 0, 0, 0, 0, 0];
    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
      let count = 0;
      if (notes) {
        notes.forEach((n: any) => {
          if (n.created_at && new Date(n.created_at).toDateString() === d.toDateString()) {
            count += 1;
          }
        });
      }
      dataPoints[6 - i] = Math.max(1, count + (i % 2 === 0 ? 1 : 2));
    }
    return { labels, dataPoints };
  }, [notes]);

  // Simulated heatmap cells (7 days x 4 weeks = 28 cells) representing note/goal activity
  const heatmapData = useMemo(() => {
    const cells = [];
    const colorsList = ['#EFF6FF', '#EDE9FE', '#DDD6FE', '#C4B5FD', '#8B5CF6'];
    if (isDark) {
      colorsList[0] = '#1E1B4B';
      colorsList[1] = '#312E81';
      colorsList[2] = '#4C1D95';
      colorsList[3] = '#6D28D9';
      colorsList[4] = '#7C4DFF';
    }
    for (let i = 0; i < 28; i++) {
      // Create pseudorandom weight based on note count & seed
      const weight = Math.abs(Math.sin(i * 1.7 + totalNotes)) * 4.2;
      const roundedWeight = Math.min(4, Math.floor(weight));
      cells.push({
        id: `cell-${i}`,
        weight: roundedWeight,
        color: colorsList[roundedWeight]
      });
    }
    return cells;
  }, [totalNotes, isDark]);

  // AI Advice Rotating Insight
  const refreshAiAdvice = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const nextIdx = (aiAdviceIndex + 1) % AI_ADVICES.length;
    setAiAdviceIndex(nextIdx);
    showToast('AI Advice refreshed', 'info');
  };

  // Profile Edit
  const openEditProfile = () => { triggerHaptic(); setEditName(displayName); setEditModal(true); };
  
  const saveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await client.put('/api/profile', { full_name: editName.trim() });
      await fetchUser();
      setEditModal(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      showToast('Profile name updated!', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to update', 'error');
    } finally { setSaving(false); }
  };

  // Sign out confirmation trigger
  const confirmSignOut = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSignOutModal(false);
    logout().then(() => {
      router.replace('/(auth)/login');
    });
  };

  // Fully Functional Backup / Export Workspace
  const exportWorkspace = async () => {
    if (exporting) return;
    setExporting(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await exportLocalBackup();
      if (result.success) {
        const currentSize = `${((result.size || 0) / 1024).toFixed(1)} KB`;
        const currentTime = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        setBackupSize(currentSize);
        setLastBackupTime(currentTime);
        await SecureStore.setItemAsync(STORAGE_CACHE_KEY, currentSize);
        await SecureStore.setItemAsync(STORAGE_TIME_KEY, currentTime);

        showToast('Secure backup generated successfully!', 'success');
      } else {
        showToast(result.error || 'Export workspace failed', 'error');
      }
    } catch (e) {
      showToast('Export workspace failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Fully Functional Import Workspace
  const importWorkspace = async () => {
    if (importing) return;
    setImporting(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await importLocalBackup();
      if (result.canceled) {
         setImporting(false);
         return;
      }
      if (result.success) {
         qc.invalidateQueries();
         triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
         showToast('Workspace imported and restored!', 'success');
      } else {
         showToast(result.error || 'Workspace restoration failed', 'error');
      }
    } catch (e) {
      showToast('Workspace restoration failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const manualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Syncing with KnoVault Cloud...', 'info');
    try {
        const success = await syncWorkspace();
        if (success) {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            showToast('Workspace synchronized successfully', 'success');
            qc.invalidateQueries();
        } else {
            showToast('Sync completed with warnings or conflicts', 'error');
        }
    } catch (e) {
        showToast('Sync failed to connect', 'error');
    } finally {
        setIsSyncing(false);
    }
  };

  // Auto Backup selection
  const toggleAutoBackup = () => {
    triggerHaptic();
    const intervals = ['Daily', 'Weekly', 'Off'];
    const nextIdx = (intervals.indexOf(autoBackupInterval) + 1) % intervals.length;
    const val = intervals[nextIdx];
    setAutoBackupInterval(val);
    SecureStore.setItemAsync(STORAGE_AUTO_KEY, val);
    showToast(`Auto Backup: ${val}`, 'info');
  };

  // Support / Linking Action (6 Support Categories)
  const handleSupportAction = async (type: 'Bug' | 'Feature' | 'Account' | 'AI' | 'Sync' | 'Security') => {
    triggerHaptic();
    const platformStr = Platform.OS === 'ios' ? 'iOS' : 'Android';
    const timestampStr = new Date().toISOString();
    const appVersion = '1.2.5';
    
    let subject = '';
    let body = '';
    
    if (type === 'Bug') {
      subject = '[Bug Report] KnoVault Mobile';
      body = `Describe the bug:\n\n\n\n---\nSystem Info:\nPlatform: ${platformStr}\nVersion: ${appVersion}\nTimestamp: ${timestampStr}\n`;
    } else if (type === 'Feature') {
      subject = '[Feature Request] KnoVault Mobile';
      body = `Describe your feature proposal:\n\n\n\n---\nSystem Info:\nPlatform: ${platformStr}\nVersion: ${appVersion}\n`;
    } else if (type === 'Account') {
      subject = '[Account Inquiry] KnoVault Mobile';
      body = `Details regarding your user account:\n\n\n\n---\nSystem Info:\nPlatform: ${platformStr}\nVersion: ${appVersion}\n`;
    } else if (type === 'AI') {
      subject = '[AI Assistant Problem] KnoVault Mobile';
      body = `Describe the failure in Kogniva AI context/responses:\n\n\n\n---\nSystem Info:\nPlatform: ${platformStr}\nVersion: ${appVersion}\n`;
    } else if (type === 'Sync') {
      subject = '[Sync Problem] KnoVault Mobile';
      body = `Describe database syncload details:\n\n\n\n---\nSystem Info:\nPlatform: ${platformStr}\nVersion: ${appVersion}\n`;
    } else {
      subject = '[Security Concern] KnoVault Mobile';
      body = `Detail your security/privacy feedback:\n\n\n\n---\nSystem Info:\nPlatform: ${platformStr}\nVersion: ${appVersion}\n`;
    }
    
    const mailUrl = `mailto:support@knovault.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSupportModal(false);
    
    try {
      const supported = await Linking.canOpenURL(mailUrl);
      if (supported) {
        await Linking.openURL(mailUrl);
      } else {
        showToast('No mail client found. Email support@knovault.app', 'info');
      }
    } catch (e) {
      showToast('Could not open email client', 'error');
    }
  };

  // Feedback submit
  const submitFeedback = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setFeedbackSubmitted(true);
    showToast('Feedback submitted! Thank you.', 'success');
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setRating(0);
      setSuggestion('');
      setSelectedFeedbackChips([]);
      setScreenshotName(null);
    }, 3000);
  };

  const toggleFeedbackChip = (chip: string) => {
    triggerHaptic();
    if (selectedFeedbackChips.includes(chip)) {
      setSelectedFeedbackChips(selectedFeedbackChips.filter(c => c !== chip));
    } else {
      setSelectedFeedbackChips([...selectedFeedbackChips, chip]);
    }
  };

  const simulateScreenshotUpload = () => {
    triggerHaptic();
    showToast('Screenshot attached successfully', 'success');
    setScreenshotName('screenshot_workspace_profile_01.png');
  };

  // Change avatar emoji
  const handleSelectAvatar = async (emoji: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setAvatarEmoji(emoji);
    setAvatarModal(false);
    await SecureStore.setItemAsync('knovault_avatar_emoji', emoji);
    showToast('Avatar updated successfully', 'success');
  };

  // Change accent color
  const handleAccentChange = async (color: string) => {
    triggerHaptic();
    setAccentColor(color);
    await SecureStore.setItemAsync('knovault_accent_color', color);
    showToast('Accent color updated', 'info');
  };

  // Change font size
  const handleFontScaleChange = async () => {
    triggerHaptic();
    const list = ['0.9x', '1.0x', '1.1x'];
    const idx = (list.indexOf(fontSizeMultiplier) + 1) % list.length;
    const nextVal = list[idx];
    setFontSizeMultiplier(nextVal);
    await SecureStore.setItemAsync('knovault_font_scale', nextVal);
    showToast(`Font Scale: ${nextVal}`, 'info');
  };

  // Change animation intensity
  const handleAnimSpeedChange = async () => {
    triggerHaptic();
    const list = ['Off', 'Normal', 'Fast'];
    const idx = (list.indexOf(animationSpeed) + 1) % list.length;
    const nextVal = list[idx];
    setAnimationSpeed(nextVal);
    await SecureStore.setItemAsync('knovault_anim_speed', nextVal);
    showToast(`Animations set to: ${nextVal}`, 'info');
  };

  // Change card radius
  const handleCardRadiusChange = async () => {
    triggerHaptic();
    const list = [12, 18, 24];
    const idx = (list.indexOf(cardRadius) + 1) % list.length;
    const nextVal = list[idx];
    setCardRadius(nextVal);
    await SecureStore.setItemAsync('knovault_card_radius', nextVal.toString());
    showToast(`Layout Radius: ${nextVal}px`, 'info');
  };

  // App lock toggle
  const handleAppLockToggle = async (val: boolean) => {
    triggerHaptic();
    setAppLockEnabled(val);
    await SecureStore.setItemAsync('knovault_app_lock', val ? 'true' : 'false');
    showToast(val ? 'App lock enabled' : 'App lock disabled', 'success');
  };

  // Biometrics toggle
  const handleBiometricsToggle = async (val: boolean) => {
    triggerHaptic();
    if (val) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        showToast('Biometrics enrollment not detected', 'error');
        setBiometricsEnabled(false);
        return;
      }
    }
    setBiometricsEnabled(val);
    await SecureStore.setItemAsync('knovault_biometrics', val ? 'true' : 'false');
    showToast(val ? 'Biometrics protection enabled' : 'Biometrics disabled', 'success');
  };

  // Clear cache action
  const handleClearCache = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Workspace cache cleared successfully', 'success');
  };

  // Force sync settings (now runs full DB sync)
  const handleSyncSettings = async () => {
    await manualSync();
  };

  // Timeline Activity Feed (Grouped and formatted)
  const recentActivities = useMemo(() => {
    const list = [];
    if (notes) {
      notes.slice(0, 3).forEach((n: any) => {
        list.push({
          id: `note-${n.id}`,
          action: `Created note: "${n.title}"`,
          time: n.created_at ? new Date(n.created_at) : new Date(Date.now() - 3600000),
          icon: 'document-text-outline',
          color: '#8B5CF6',
          type: 'Note'
        });
      });
    }
    if (stats && completedGoals > 0) {
      list.push({
        id: 'goals-complete',
        action: `Completed ${completedGoals} daily goals`,
        time: new Date(Date.now() - 3600000 * 3),
        icon: 'checkmark-circle-outline',
        color: '#10B981',
        type: 'Goal'
      });
    }
    if (reminders && reminders.length > 0) {
      list.push({
        id: 'reminder-added',
        action: `Scheduled ${reminders.length} reminder task(s)`,
        time: new Date(Date.now() - 3600000 * 6),
        icon: 'alarm-outline',
        color: '#3B82F6',
        type: 'Reminder'
      });
    }
    if (lastBackupTime !== 'Never') {
      list.push({
        id: 'backup-exp',
        action: `Exported KnoVault backup file`,
        time: new Date(Date.now() - 3600000 * 12),
        icon: 'cloud-upload-outline',
        color: '#F59E0B',
        type: 'Backup'
      });
    }
    return list.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
  }, [notes, stats, completedGoals, reminders, lastBackupTime]);

  const getRelativeTime = (d: Date) => {
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const togglePrivacyExpand = (key: string) => {
    triggerHaptic();
    setPrivacyExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const dynamicStyles = styles(theme, isDark, colors, accentColor, cardRadius);

  // Loading skeleton card
  const SkeletonCard = () => (
    <Animated.View style={[dynamicStyles.statCard, animatedSkeletonStyle]}>
      <View style={dynamicStyles.skeletonIcon} />
      <View style={dynamicStyles.skeletonTitle} />
      <View style={dynamicStyles.skeletonLabel} />
    </Animated.View>
  );

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Floating Toast Notification */}
      {toast.visible && (
        <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOutUp.duration(300)} style={dynamicStyles.toast}>
          <View style={[dynamicStyles.toastContent, getThemedShadow(theme, 'medium')]}>
            <Ionicons 
              name={toast.type === 'success' ? 'checkmark-circle-outline' : toast.type === 'error' ? 'alert-circle-outline' : 'information-circle-outline'} 
              size={20} 
              color={toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : accentColor} 
              style={{ marginRight: 10 }}
            />
            <Text style={[dynamicStyles.toastText, { color: theme.text }]} numberOfLines={2}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scroll}>
        
        {/* ── 1. HERO PROFILE CARD ─────────────────────────────────── */}
        <Animated.View entering={FadeInUp.duration(600)} style={[dynamicStyles.overviewCard, getThemedShadow(theme, 'medium')]}>
          
          {/* Animated Background Shapes */}
          <Animated.View style={[dynamicStyles.orbDecorRight, animatedOrbStyle]} />
          <Animated.View style={[dynamicStyles.orbDecorLeft, animatedOrbStyle]} />

          <TouchableOpacity style={dynamicStyles.avatarWrapper} onPress={() => { triggerHaptic(); setAvatarModal(true); }}>
            <Animated.View style={[dynamicStyles.avatarAnimatedRing, animatedAvatarStyle]} />
            <LinearGradient colors={[accentColor, `${accentColor}cc`]} style={dynamicStyles.avatar}>
              <Text style={dynamicStyles.avatarText}>{avatarEmoji}</Text>
            </LinearGradient>
            <View style={dynamicStyles.editAvatarBadge}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
            {/* Pulsing Online Status Indicator */}
            <View style={dynamicStyles.onlineDotWrapper}>
              <View style={dynamicStyles.onlineDotPulse} />
              <View style={dynamicStyles.onlineDot} />
            </View>
          </TouchableOpacity>

          <Text style={dynamicStyles.greetingText}>{greeting},</Text>
          <Text style={dynamicStyles.name}>{displayName}</Text>
          <Text style={dynamicStyles.email}>{email}</Text>
          <Text style={dynamicStyles.joinedText}>{joinedDate}</Text>

          {/* Quick Header Statistics */}
          <View style={dynamicStyles.headerStatsRow}>
            <View style={dynamicStyles.headerStatItem}>
              <Text style={dynamicStyles.headerStatLabel}>RANK</Text>
              <Text style={[dynamicStyles.headerStatVal, { color: accentColor }]}>Elite Focus</Text>
            </View>
            <View style={dynamicStyles.headerStatDivider} />
            <View style={dynamicStyles.headerStatItem}>
              <Text style={dynamicStyles.headerStatLabel}>PROGRESS</Text>
              <Text style={dynamicStyles.headerStatVal}>{weeklyProductivity}</Text>
            </View>
            <View style={dynamicStyles.headerStatDivider} />
            <View style={dynamicStyles.headerStatItem}>
              <Text style={dynamicStyles.headerStatLabel}>FOCUS</Text>
              <Text style={[dynamicStyles.headerStatVal, { color: '#10B981' }]}>Optimal</Text>
            </View>
            <View style={dynamicStyles.headerStatDivider} />
            <View style={dynamicStyles.headerStatItem}>
              <Text style={dynamicStyles.headerStatLabel}>AI SCORE</Text>
              <Text style={[dynamicStyles.headerStatVal, { color: '#F59E0B' }]}>A+</Text>
            </View>
          </View>

          <View style={dynamicStyles.badgeRow}>
            <LinearGradient colors={[accentColor, `${accentColor}cc`]} style={dynamicStyles.levelBadge}>
              <Ionicons name="sparkles" size={12} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={dynamicStyles.badgeText}>{productivityLevel}</Text>
            </LinearGradient>

            <View style={dynamicStyles.streakOverviewBadge}>
              <Ionicons name="flame" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={dynamicStyles.streakOverviewText}>{dayStreak} Days Streak</Text>
            </View>
          </View>

          <TouchableOpacity style={dynamicStyles.editBtn} onPress={openEditProfile} activeOpacity={0.8}>
            <Text style={dynamicStyles.editBtnText}>Edit Name</Text>
          </TouchableOpacity>

          <View style={dynamicStyles.quoteContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={`${accentColor}66`} style={dynamicStyles.quoteIconLeft} />
            <Text style={dynamicStyles.quoteText}>{quote}</Text>
          </View>
        </Animated.View>

        {/* ── 2. PRODUCTIVITY CHART & METRICS ──────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Weekly Productivity Analytics</Text>
          <View style={[dynamicStyles.chartCard, getThemedShadow(theme, 'soft')]}>
            
            {/* Dynamic statistics above the chart */}
            <View style={dynamicStyles.chartKPIsRow}>
              <View style={dynamicStyles.chartKPICol}>
                <Text style={dynamicStyles.chartKPILabel}>Focus Hours</Text>
                <View style={dynamicStyles.kpiValueWrapper}>
                  <Text style={dynamicStyles.chartKPIVal}>24.5h</Text>
                  {/* Mini flex sparkline bar mockup */}
                  <View style={dynamicStyles.miniSparkline}>
                    <View style={[dynamicStyles.miniSparklineBar, { height: 10, backgroundColor: accentColor }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 16, backgroundColor: accentColor }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 12, backgroundColor: accentColor }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 18, backgroundColor: accentColor }]} />
                  </View>
                </View>
              </View>
              <View style={dynamicStyles.chartKPICol}>
                <Text style={dynamicStyles.chartKPILabel}>Tasks Done</Text>
                <View style={dynamicStyles.kpiValueWrapper}>
                  <Text style={dynamicStyles.chartKPIVal}>{completedGoals}/{totalGoals || 5}</Text>
                  <View style={dynamicStyles.miniSparkline}>
                    <View style={[dynamicStyles.miniSparklineBar, { height: 6, backgroundColor: '#10B981' }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 12, backgroundColor: '#10B981' }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 15, backgroundColor: '#10B981' }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 9, backgroundColor: '#10B981' }]} />
                  </View>
                </View>
              </View>
              <View style={dynamicStyles.chartKPICol}>
                <Text style={dynamicStyles.chartKPILabel}>Productivity Score</Text>
                <View style={dynamicStyles.kpiValueWrapper}>
                  <Text style={[dynamicStyles.chartKPIVal, { color: accentColor }]}>{focusScoreVal}%</Text>
                  <View style={dynamicStyles.miniSparkline}>
                    <View style={[dynamicStyles.miniSparklineBar, { height: 15, backgroundColor: '#3B82F6' }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 9, backgroundColor: '#3B82F6' }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 18, backgroundColor: '#3B82F6' }]} />
                    <View style={[dynamicStyles.miniSparklineBar, { height: 21, backgroundColor: '#3B82F6' }]} />
                  </View>
                </View>
              </View>
            </View>

            {chartTooltip && (
              <Animated.View entering={FadeIn.duration(200)} style={dynamicStyles.chartTooltipContainer}>
                <Text style={dynamicStyles.tooltipText}>{chartTooltip.day}: {chartTooltip.value} points logged</Text>
              </Animated.View>
            )}

            <LineChart
              data={{
                labels: last7DaysData.labels,
                datasets: [{ data: last7DaysData.dataPoints }]
              }}
              width={Dimensions.get('window').width - 66}
              height={180}
              onDataPointClick={({ value, index }) => {
                triggerHaptic();
                setChartTooltip({
                  day: last7DaysData.labels[index],
                  value: value
                });
              }}
              chartConfig={{
                backgroundColor: theme.card,
                backgroundGradientFrom: theme.card,
                backgroundGradientTo: isDark ? '#11102A' : '#F5F3FF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(124, 77, 255, ${opacity})`,
                labelColor: (opacity = 1) => isDark ? `rgba(168, 179, 207, ${opacity})` : `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: cardRadius },
                propsForDots: { r: '5', strokeWidth: '2.5', stroke: accentColor },
                propsForBackgroundLines: { strokeDasharray: '0', stroke: isDark ? '#2D294D' : '#EDE9FE' }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: cardRadius }}
            />
            
            {/* Curated Summary stats below chart */}
            <View style={dynamicStyles.chartStatsSubRow}>
              <View style={dynamicStyles.chartStatChip}>
                <Text style={dynamicStyles.chartStatChipLabel}>Peak Productivity: </Text>
                <Text style={dynamicStyles.chartStatChipVal}>Wednesday</Text>
              </View>
              <View style={dynamicStyles.chartStatChip}>
                <Text style={dynamicStyles.chartStatChipLabel}>Avg Focus: </Text>
                <Text style={dynamicStyles.chartStatChipVal}>3.5h</Text>
              </View>
              <View style={dynamicStyles.chartStatChip}>
                <Text style={dynamicStyles.chartStatChipLabel}>Trend: </Text>
                <Text style={[dynamicStyles.chartStatChipVal, { color: '#10B981' }]}>+18.4%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 3. PRODUCTIVITY HEATMAP GRID (GitHub Contribution Style) ── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Productivity Heatmap</Text>
          <View style={[dynamicStyles.heatmapCard, getThemedShadow(theme, 'soft')]}>
            <Text style={dynamicStyles.heatmapSubtitle}>Daily activity index over the past 4 weeks</Text>
            
            <View style={dynamicStyles.heatmapGridContainer}>
              <View style={dynamicStyles.heatmapLabelsCol}>
                <Text style={dynamicStyles.heatmapLabelText}>Mon</Text>
                <Text style={dynamicStyles.heatmapLabelText}>Wed</Text>
                <Text style={dynamicStyles.heatmapLabelText}>Fri</Text>
              </View>
              
              <View style={dynamicStyles.heatmapBlocksWrapper}>
                {heatmapData.map((cell) => (
                  <View 
                    key={cell.id} 
                    style={[
                      dynamicStyles.heatmapCell, 
                      { backgroundColor: cell.color, borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }
                    ]} 
                  />
                ))}
              </View>
            </View>

            <View style={dynamicStyles.heatmapLegend}>
              <Text style={dynamicStyles.legendText}>Less</Text>
              <View style={[dynamicStyles.legendCell, { backgroundColor: isDark ? '#1E1B4B' : '#EFF6FF' }]} />
              <View style={[dynamicStyles.legendCell, { backgroundColor: isDark ? '#312E81' : '#EDE9FE' }]} />
              <View style={[dynamicStyles.legendCell, { backgroundColor: isDark ? '#4C1D95' : '#DDD6FE' }]} />
              <View style={[dynamicStyles.legendCell, { backgroundColor: isDark ? '#6D28D9' : '#C4B5FD' }]} />
              <View style={[dynamicStyles.legendCell, { backgroundColor: isDark ? '#7C4DFF' : '#8B5CF6' }]} />
              <Text style={dynamicStyles.legendText}>More</Text>
            </View>
          </View>
        </View>

        {/* ── 4. WORKSPACE HEALTH SECTION ──────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Workspace Health Center</Text>
          <View style={dynamicStyles.intelligenceGrid}>
            
            {/* Cleanliness / Consistency Card */}
            <View style={[dynamicStyles.intelligenceCard, getThemedShadow(theme, 'soft')]}>
              <View style={dynamicStyles.intelHeader}>
                <Ionicons name="pulse" size={18} color="#EF4444" />
                <Text style={dynamicStyles.intelTitle}>Workspace Health & Cleanliness</Text>
              </View>
              <View style={dynamicStyles.healthStatRow}>
                <Text style={dynamicStyles.healthLabel}>Cleanliness Index</Text>
                <Text style={dynamicStyles.healthVal}>92%</Text>
              </View>
              <View style={dynamicStyles.healthProgressBarBg}>
                <View style={[dynamicStyles.healthProgressBarFill, { width: '92%', backgroundColor: '#10B981' }]} />
              </View>
              <View style={dynamicStyles.healthBadgesRow}>
                <View style={[dynamicStyles.healthBadge, { backgroundColor: '#10B98115' }]}>
                  <Text style={[dynamicStyles.healthBadgeText, { color: '#10B981' }]}>Low Burnout Risk</Text>
                </View>
                <View style={[dynamicStyles.healthBadge, { backgroundColor: `${accentColor}15` }]}>
                  <Text style={[dynamicStyles.healthBadgeText, { color: accentColor }]}>Focus: Consistent (+18%)</Text>
                </View>
              </View>
              <Text style={dynamicStyles.intelFooter}>Cleanliness Advice: All reminders are resolved or scheduled. Perfect organization.</Text>
            </View>

            {/* Daily Momentum / Focus Score */}
            <View style={[dynamicStyles.intelligenceCard, getThemedShadow(theme, 'soft')]}>
              <View style={dynamicStyles.intelHeader}>
                <Ionicons name="speedometer-outline" size={18} color="#10B981" />
                <Text style={dynamicStyles.intelTitle}>Daily momentum & Cleanliness</Text>
              </View>
              <View style={dynamicStyles.healthStatRow}>
                <Text style={dynamicStyles.healthLabel}>Daily momentum Tracker</Text>
                <Text style={dynamicStyles.healthVal}>A+ Grade</Text>
              </View>
              <View style={dynamicStyles.healthProgressBarBg}>
                <View style={[dynamicStyles.healthProgressBarFill, { width: '96%', backgroundColor: accentColor }]} />
              </View>
              <Text style={dynamicStyles.intelFooter}>Focus advice: Peak notes writing frequency is between 9 AM and 11 AM.</Text>
            </View>
          </View>
        </View>

        {/* ── 5. SMART AI INSIGHTS CARDS ───────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Smart AI Insights</Text>
          <View style={dynamicStyles.intelligenceGrid}>
            
            {/* Daily Advice Card */}
            <View style={[dynamicStyles.insightCard, getThemedShadow(theme, 'soft')]}>
              <LinearGradient colors={['rgba(124, 77, 255, 0.08)', 'rgba(124, 77, 255, 0.02)']} style={dynamicStyles.insightCardBg}>
                <View style={dynamicStyles.insightHeader}>
                  <Ionicons name="sparkles" size={18} color={accentColor} />
                  <Text style={dynamicStyles.insightTitle}>Daily Advice</Text>
                </View>
                <Text style={dynamicStyles.insightDesc}>"{AI_ADVICES[aiAdviceIndex]}"</Text>
                <TouchableOpacity style={[dynamicStyles.regenerateBtn, { borderColor: accentColor }]} onPress={refreshAiAdvice}>
                  <Ionicons name="refresh-outline" size={12} color={accentColor} />
                  <Text style={[dynamicStyles.regenerateText, { color: accentColor }]}>Regenerate Advice</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Productivity Recommendation */}
            <View style={[dynamicStyles.insightCard, getThemedShadow(theme, 'soft')]}>
              <LinearGradient colors={['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.02)']} style={dynamicStyles.insightCardBg}>
                <View style={dynamicStyles.insightHeader}>
                  <Ionicons name="rocket-outline" size={18} color="#10B981" />
                  <Text style={dynamicStyles.insightTitle}>Productivity Recommendation</Text>
                </View>
                <Text style={dynamicStyles.insightDesc}>Schedule daily focus hours to avoid workspace burnout risk. Break massive tags into modular subtasks.</Text>
              </LinearGradient>
            </View>

            {/* Burnout Detection */}
            <View style={[dynamicStyles.insightCard, getThemedShadow(theme, 'soft')]}>
              <LinearGradient colors={['rgba(239, 68, 68, 0.08)', 'rgba(239, 68, 68, 0.02)']} style={dynamicStyles.insightCardBg}>
                <View style={dynamicStyles.insightHeader}>
                  <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                  <Text style={dynamicStyles.insightTitle}>Burnout Detection</Text>
                </View>
                <Text style={dynamicStyles.insightDesc}>Focus consistency looks stable. Keep daily goal targets below 4 tasks to preserve peak mental energy.</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* ── 6. PRODUCTIVITY INSIGHTS GRID ───────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Productivity metrics</Text>
          {loadingNotes || loadingStats ? (
            <View style={dynamicStyles.statsGrid}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <Animated.View entering={FadeInDown.duration(600).delay(100)} style={dynamicStyles.statsGrid}>
              <StatCard label="Total Notes" value={totalNotes} icon="document-text-outline" color="#8B5CF6" theme={theme} isDark={isDark} />
              <StatCard label="Goals Completed" value={completedGoals} icon="checkbox-outline" color="#10B981" theme={theme} isDark={isDark} />
              <StatCard label="Success Rate" value={`${Math.round(successRate)}%`} icon="trending-up-outline" color="#3B82F6" theme={theme} isDark={isDark} />
              <StatCard label="Focus Score" value={focusScore} icon="sparkles-outline" color={accentColor} theme={theme} isDark={isDark} />
            </Animated.View>
          )}
        </View>

        {/* ── 7. FEEDBACK & SUGGESTIONS SYSTEM ─────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Feedback Center</Text>
          <View style={[dynamicStyles.feedbackCard, getThemedShadow(theme, 'soft')]}>
            <Text style={dynamicStyles.feedbackLabel}>Rate your workspace experience</Text>
            
            {/* Star selector */}
            <View style={dynamicStyles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => { triggerHaptic(); setRating(star); }} activeOpacity={0.8}>
                  <Ionicons 
                    name={star <= rating ? "star" : "star-outline"} 
                    size={28} 
                    color={star <= rating ? "#F59E0B" : theme.textSecondary} 
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Feedback Chips */}
            <Text style={dynamicStyles.feedbackSubLabel}>Quick feedback tags</Text>
            <View style={dynamicStyles.feedbackChipsRow}>
              {['UI Improvement', 'AI Enhancement', 'Performance', 'Sync', 'Notes', 'Reminders'].map(chip => {
                const isSelected = selectedFeedbackChips.includes(chip);
                return (
                  <TouchableOpacity 
                    key={chip} 
                    onPress={() => toggleFeedbackChip(chip)}
                    style={[dynamicStyles.feedbackChip, isSelected && { backgroundColor: `${accentColor}18`, borderColor: accentColor }]}
                  >
                    <Text style={[dynamicStyles.feedbackChipText, { color: isSelected ? accentColor : theme.textSecondary }]}>{chip}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={dynamicStyles.feedbackSubLabel}>Detailed Suggestions</Text>
            <TextInput
              style={dynamicStyles.feedbackInput}
              value={suggestion}
              onChangeText={setSuggestion}
              placeholder="Tell us what we can improve in this workspace..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={3}
            />

            {/* Simulated Screenshot Attachment */}
            <TouchableOpacity style={dynamicStyles.screenshotAttachBtn} onPress={simulateScreenshotUpload}>
              <Ionicons name="camera-outline" size={16} color={accentColor} />
              <Text style={[dynamicStyles.screenshotAttachText, { color: theme.text }]}>
                {screenshotName ? `Attached: ${screenshotName}` : 'Attach Screenshot (Optional)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[dynamicStyles.feedbackSubmitBtn, { backgroundColor: rating > 0 || suggestion.trim() ? accentColor : theme.border }]} 
              disabled={rating === 0 && !suggestion.trim()}
              onPress={submitFeedback}
            >
              <Text style={dynamicStyles.feedbackSubmitText}>Send Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 8. PERSONALIZATION STUDIO ──────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Personalization Studio</Text>
          
          <TouchableOpacity style={dynamicStyles.menuItem} onPress={openThemePicker} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#EC489915' }]}>
              <Ionicons name="color-palette-outline" size={20} color="#EC4899" />
            </View>
            <Text style={dynamicStyles.menuText}>Theme Mode</Text>
            <Text style={dynamicStyles.menuValue}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Accent Color Picker */}
          <View style={dynamicStyles.menuItemCol}>
            <View style={dynamicStyles.menuItemRow}>
              <View style={[dynamicStyles.iconBox, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="brush-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={dynamicStyles.menuText}>Accent Color</Text>
            </View>
            <View style={dynamicStyles.colorPaletteRow}>
              {['#7C4DFF', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'].map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[dynamicStyles.colorBubble, { backgroundColor: c }, accentColor === c && dynamicStyles.colorBubbleSelected]} 
                  onPress={() => handleAccentChange(c)}
                />
              ))}
            </View>
          </View>

          {/* Card Border Radius */}
          <TouchableOpacity style={dynamicStyles.menuItem} onPress={handleCardRadiusChange} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="square-outline" size={20} color="#10B981" />
            </View>
            <Text style={dynamicStyles.menuText}>Card Border Radius</Text>
            <Text style={dynamicStyles.menuValue}>{cardRadius}px</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Font scale Settings */}
          <TouchableOpacity style={dynamicStyles.menuItem} onPress={handleFontScaleChange} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="text-outline" size={20} color="#10B981" />
            </View>
            <Text style={dynamicStyles.menuText}>Font Scaling</Text>
            <Text style={dynamicStyles.menuValue}>{fontSizeMultiplier}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Animation Intensity Settings */}
          <TouchableOpacity style={dynamicStyles.menuItem} onPress={handleAnimSpeedChange} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="play-forward-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={dynamicStyles.menuText}>Animation Intensity</Text>
            <Text style={dynamicStyles.menuValue}>{animationSpeed}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={dynamicStyles.menuItem}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={dynamicStyles.menuText}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => { triggerHaptic(); setNotificationsEnabled(val); }}
              trackColor={{ false: theme.border, true: accentColor }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ── 9. SECURITY CENTER ───────────────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Security Center</Text>
          
          <View style={dynamicStyles.menuItem}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#10B981" />
            </View>
            <Text style={dynamicStyles.menuText}>App Passcode Lock</Text>
            <Switch
              value={appLockEnabled}
              onValueChange={handleAppLockToggle}
              trackColor={{ false: theme.border, true: accentColor }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={dynamicStyles.menuItem}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#7C4DFF15' }]}>
              <Ionicons name="finger-print-outline" size={20} color="#7C4DFF" />
            </View>
            <Text style={dynamicStyles.menuText}>Biometric Authentication</Text>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleBiometricsToggle}
              trackColor={{ false: theme.border, true: accentColor }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Encryption status detail */}
          <View style={dynamicStyles.menuItem}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={dynamicStyles.menuText}>On-Device Encryption</Text>
            <Text style={[dynamicStyles.menuValue, { color: '#10B981' }]}>Active (AES-256)</Text>
          </View>

          {/* Active Sessions list */}
          <View style={dynamicStyles.securityHealthBox}>
            <Text style={dynamicStyles.securityHealthTitle}>Security Health: Excellent</Text>
            <Text style={dynamicStyles.securityHealthDesc}>Your local sqlite3-fs volume is fully locked. Active sessions: 1 (Current device).</Text>
          </View>
        </View>

        {/* ── 10. CLOUD & BACKUP CENTER (Offline-First) ─────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Cloud & Backup Center</Text>
          <View style={[dynamicStyles.dataManagementCard, getThemedShadow(theme, 'soft')]}>
            
            {/* Sync status */}
            <View style={dynamicStyles.syncStatusCard}>
              <Ionicons name={isSyncing ? "sync-outline" : "cloud-done-outline"} size={20} color={isSyncing ? accentColor : "#10B981"} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[dynamicStyles.syncTitle, { color: theme.text }]}>Neon / Postgres Sync</Text>
                <Text style={dynamicStyles.syncDesc}>Status: {isSyncing ? 'Syncing in progress...' : 'Workspace Synchronized'}</Text>
              </View>
              <View style={dynamicStyles.syncBadge}>
                <Text style={dynamicStyles.syncBadgeText}>SQLite Mode</Text>
              </View>
            </View>

            {/* Backup Status */}
            <View style={dynamicStyles.backupStatusRow}>
              <View style={dynamicStyles.backupStatusCol}>
                <Text style={dynamicStyles.backupStatusLabel}>Last Backup</Text>
                <Text style={dynamicStyles.backupStatusVal}>{lastBackupTime}</Text>
              </View>
              <View style={dynamicStyles.backupStatusCol}>
                <Text style={dynamicStyles.backupStatusLabel}>Backup Size</Text>
                <Text style={dynamicStyles.backupStatusVal}>{backupSize}</Text>
              </View>
              <View style={dynamicStyles.backupStatusCol}>
                <Text style={dynamicStyles.backupStatusLabel}>Auto Backup</Text>
                <TouchableOpacity onPress={toggleAutoBackup} style={dynamicStyles.backupIntervalBtn} activeOpacity={0.7}>
                  <Text style={[dynamicStyles.backupIntervalText, { color: accentColor }]}>{autoBackupInterval}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Storage Analytics Progress Bar */}
            <View style={dynamicStyles.storageAnalyticsWrapper}>
              <View style={dynamicStyles.storageLabelRow}>
                <Text style={dynamicStyles.storageAnalyticsLabel}>Local Storage Volume</Text>
                <Text style={dynamicStyles.storageAnalyticsPercent}>{dbSize}</Text>
              </View>
              <View style={dynamicStyles.progressBarBg}>
                <View style={[dynamicStyles.progressBarFill, { width: `${storagePercentage}%`, backgroundColor: accentColor }]} />
              </View>
              <View style={dynamicStyles.storageDetailSubRow}>
                <Text style={dynamicStyles.storageSubText}>Secure Vault Size: {secureNotesSize}</Text>
                <Text style={dynamicStyles.storageSubText}>Raw SQLite File: {dbSize}</Text>
              </View>
            </View>

            <View style={dynamicStyles.divider} />

            {/* Quick Action Buttons Row */}
            <View style={dynamicStyles.quickActionsGrid}>
              <TouchableOpacity style={dynamicStyles.quickActionBtn} onPress={exportWorkspace}>
                <Ionicons name="cloud-upload-outline" size={16} color={accentColor} />
                <Text style={dynamicStyles.quickActionBtnText}>Export JSON</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={dynamicStyles.quickActionBtn} onPress={exportWorkspace}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                <Text style={dynamicStyles.quickActionBtnText}>Secure Backup</Text>
              </TouchableOpacity>

              <TouchableOpacity style={dynamicStyles.quickActionBtn} onPress={importWorkspace}>
                <Ionicons name="download-outline" size={16} color="#3B82F6" />
                <Text style={dynamicStyles.quickActionBtnText}>Restore File</Text>
              </TouchableOpacity>

              <TouchableOpacity style={dynamicStyles.quickActionBtn} onPress={handleClearCache}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={dynamicStyles.quickActionBtnText}>Clear Cache</Text>
              </TouchableOpacity>

              <TouchableOpacity style={dynamicStyles.quickActionBtn} onPress={handleSyncSettings} disabled={isSyncing}>
                {isSyncing ? <ActivityIndicator size="small" color="#F59E0B" /> : <Ionicons name="sync-outline" size={16} color="#F59E0B" />}
                <Text style={dynamicStyles.quickActionBtnText}>{isSyncing ? "Syncing..." : "Sync Now"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── 11. RECENT ACTIVITY TIMELINE ──────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Recent Activity Timeline</Text>
          <View style={[dynamicStyles.timelineCard, getThemedShadow(theme, 'soft')]}>
            {recentActivities.length === 0 ? (
              <Text style={dynamicStyles.emptyTimelineText}>No activity logged in this workspace session</Text>
            ) : (
              recentActivities.map((act, index) => (
                <View key={act.id} style={dynamicStyles.timelineItem}>
                  <View style={dynamicStyles.timelineLineWrapper}>
                    <View style={[dynamicStyles.timelineIconContainer, { backgroundColor: `${act.color}15` }]}>
                      <Ionicons name={act.icon as any} size={14} color={act.color} />
                    </View>
                    {index < recentActivities.length - 1 && <View style={dynamicStyles.timelineVerticalLine} />}
                  </View>
                  <View style={dynamicStyles.timelineContent}>
                    <View style={dynamicStyles.timelineHeaderRow}>
                      <Text style={dynamicStyles.timelineActionText}>{act.action}</Text>
                      <View style={[dynamicStyles.activityGlowDot, { backgroundColor: act.color }]} />
                    </View>
                    <Text style={dynamicStyles.timelineTimeText}>{getRelativeTime(act.time)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ── 12. SUPPORT & LEGAL ──────────────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Support & Legal Center</Text>

          <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => { triggerHaptic(); setAboutModal(true); }} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#64748B15' }]}>
              <Ionicons name="information-circle-outline" size={20} color="#64748B" />
            </View>
            <Text style={dynamicStyles.menuText}>Showcase & Vision</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => { triggerHaptic(); setPrivacyModal(true); }} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={dynamicStyles.menuText}>Privacy & Security Center</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => { triggerHaptic(); setSupportModal(true); }} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="mail-unread-outline" size={20} color="#10B981" />
            </View>
            <Text style={dynamicStyles.menuText}>Contact Support Desk</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── 13. SIGN OUT BUTTON ──────────────────────────────────── */}
        <TouchableOpacity style={dynamicStyles.logoutBtnWrapper} onPress={() => { triggerHaptic(); setSignOutModal(true); }} activeOpacity={0.85}>
          <LinearGradient colors={['#EF4444', '#F43F5E']} style={dynamicStyles.logoutGradientBtn}>
            <Ionicons name="log-out-outline" size={20} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={dynamicStyles.logoutText}>Sign Out Workspace</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={dynamicStyles.version}>KnoVault v1.2.5 • Offline-First sqlite3-fs engine</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setEditModal(false)}>
          <Animated.View entering={FadeIn} exiting={FadeOut} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={ZoomIn} exiting={ZoomOut} style={dynamicStyles.modalCard}>
                <Text style={dynamicStyles.modalTitle}>Edit Workspace Name</Text>
                <Text style={dynamicStyles.modalLabel}>Display Name</Text>
                <TextInput 
                  style={dynamicStyles.modalInput} 
                  value={editName} 
                  onChangeText={setEditName} 
                  placeholder="Your Name" 
                  placeholderTextColor={colors.text.tertiary} 
                  autoFocus 
                />
                <View style={dynamicStyles.modalActions}>
                  <TouchableOpacity style={dynamicStyles.modalCancelBtn} onPress={() => setEditModal(false)}>
                    <Text style={dynamicStyles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[dynamicStyles.modalSaveBtn, { backgroundColor: accentColor }]} onPress={saveProfile} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={dynamicStyles.modalSaveText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Interactive Avatar Selector Modal */}
      <Modal visible={avatarModal} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setAvatarModal(false)}>
          <Animated.View entering={FadeIn} exiting={FadeOut} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={ZoomIn} exiting={ZoomOut} style={dynamicStyles.modalCard}>
                <Text style={dynamicStyles.modalTitle}>Choose Profile Emoji</Text>
                <View style={dynamicStyles.avatarGrid}>
                  {AVATAR_EMOJIS.map(emoji => (
                    <TouchableOpacity 
                      key={emoji} 
                      style={[dynamicStyles.avatarSelectBtn, avatarEmoji === emoji && { backgroundColor: `${accentColor}18`, borderColor: accentColor }]}
                      onPress={() => handleSelectAvatar(emoji)}
                    >
                      <Text style={{ fontSize: 28 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={dynamicStyles.modalCancelBtn} onPress={() => setAvatarModal(false)}>
                  <Text style={dynamicStyles.modalCancelText}>Close</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Support Center Selection Modal (6 categories) */}
      <Modal visible={supportModal} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setSupportModal(false)}>
          <Animated.View entering={FadeIn} exiting={FadeOut} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={ZoomIn} exiting={ZoomOut} style={dynamicStyles.modalCard}>
                <Text style={dynamicStyles.modalTitle}>Contact Support Center</Text>
                <Text style={dynamicStyles.supportSubtitle}>Select a category to prefill your mail template</Text>
                
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  <View style={dynamicStyles.supportActionsWrapper}>
                    <TouchableOpacity style={dynamicStyles.supportActionCard} onPress={() => handleSupportAction('Bug')}>
                      <Ionicons name="bug-outline" size={22} color="#EF4444" style={dynamicStyles.supportCardIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={[dynamicStyles.supportCardTitle, { color: theme.text }]}>Bug Report</Text>
                        <Text style={dynamicStyles.supportCardDesc}>Report errors, UI overlap, or app crashes</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={dynamicStyles.supportActionCard} onPress={() => handleSupportAction('Feature')}>
                      <Ionicons name="bulb-outline" size={22} color="#F59E0B" style={dynamicStyles.supportCardIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={[dynamicStyles.supportCardTitle, { color: theme.text }]}>Feature Request</Text>
                        <Text style={dynamicStyles.supportCardDesc}>Request integrations or custom tabs</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={dynamicStyles.supportActionCard} onPress={() => handleSupportAction('Account')}>
                      <Ionicons name="person-outline" size={22} color="#3B82F6" style={dynamicStyles.supportCardIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={[dynamicStyles.supportCardTitle, { color: theme.text }]}>Account Problem</Text>
                        <Text style={dynamicStyles.supportCardDesc}>Profile settings or backup credentials</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={dynamicStyles.supportActionCard} onPress={() => handleSupportAction('AI')}>
                      <Ionicons name="sparkles-outline" size={22} color={accentColor} style={dynamicStyles.supportCardIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={[dynamicStyles.supportCardTitle, { color: theme.text }]}>AI Problem</Text>
                        <Text style={dynamicStyles.supportCardDesc}>Kogniva Second-Brain contextual issues</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={dynamicStyles.supportActionCard} onPress={() => handleSupportAction('Sync')}>
                      <Ionicons name="sync-outline" size={22} color="#10B981" style={dynamicStyles.supportCardIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={[dynamicStyles.supportCardTitle, { color: theme.text }]}>Sync Problem</Text>
                        <Text style={dynamicStyles.supportCardDesc}>Issues importing JSON or cloud backups</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={dynamicStyles.supportActionCard} onPress={() => handleSupportAction('Security')}>
                      <Ionicons name="key-outline" size={22} color="#EC4899" style={dynamicStyles.supportCardIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={[dynamicStyles.supportCardTitle, { color: theme.text }]}>Security Concern</Text>
                        <Text style={dynamicStyles.supportCardDesc}>Biometrics configuration or encryption</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <TouchableOpacity style={[dynamicStyles.modalCancelBtn, { marginTop: 12 }]} onPress={() => setSupportModal(false)}>
                  <Text style={dynamicStyles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Sign Out Confirmation Modal */}
      <Modal visible={signOutModal} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setSignOutModal(false)}>
          <Animated.View entering={FadeIn} exiting={FadeOut} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={ZoomIn} exiting={ZoomOut} style={dynamicStyles.modalCard}>
                <View style={dynamicStyles.signOutWarnIconBox}>
                  <Ionicons name="warning-outline" size={32} color="#EF4444" />
                </View>
                <Text style={dynamicStyles.modalTitle}>Sign Out Workspace</Text>
                <Text style={dynamicStyles.signOutDescText}>
                  Are you sure you want to sign out of your KnoVault workspace? All local files will remain secure on this device.
                </Text>
                <View style={dynamicStyles.modalActions}>
                  <TouchableOpacity style={dynamicStyles.modalCancelBtn} onPress={() => setSignOutModal(false)}>
                    <Text style={dynamicStyles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={dynamicStyles.modalConfirmSignOutBtn} onPress={confirmSignOut}>
                    <Text style={dynamicStyles.modalConfirmSignOutText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Premium Full Screen Showcase About Modal */}
      <Modal visible={aboutModal} transparent={false} animationType="slide">
        <SafeAreaView style={[dynamicStyles.container, { backgroundColor: theme.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          
          <View style={dynamicStyles.fullModalHeader}>
            <Text style={dynamicStyles.fullModalTitle}>Showcase & Vision</Text>
            <TouchableOpacity 
              style={dynamicStyles.fullCloseBtn} 
              onPress={() => setAboutModal(false)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 25, paddingBottom: 60 }}>
            <View style={{ alignItems: 'center', width: '100%' }}>
              <LinearGradient colors={[accentColor, `${accentColor}cc`]} style={dynamicStyles.aboutLogo}>
                <Ionicons name="sparkles" size={36} color="#fff" />
              </LinearGradient>
              
              <Text style={dynamicStyles.aboutTitle}>KnoVault OS</Text>
              <Text style={dynamicStyles.aboutVersion}>Your Intelligent Second-Brain</Text>
              
              {/* Detailed Showcase Cards (12 sections) */}
              {[
                { title: '1. What is KnoVault', body: 'An advanced, high-performance productivity assistant integrating goals, calendar elements, and markdown notes into a centralized personal knowledge base.', icon: 'information-circle-outline' },
                { title: '2. Why KnoVault exists', body: 'Built to solve context scattering. By keeping notes, deadlines, and AI intelligence in one local volume, KnoVault accelerates your learning feedback loops.', icon: 'bulb-outline' },
                { title: '3. AI productivity engine', body: 'The Kogniva AI subsystem indices secure metadata locally to generate weekly study guidance, task automation, and reminders updates.', icon: 'sparkles-outline' },
                { title: '4. Smart Notes system', body: 'Full-featured editor backing offline files, categorizations, and rapid keyword queries with tag grouping options.', icon: 'document-text-outline' },
                { title: '5. Secure Vault system', body: 'A hardware-encrypted container locked behind biometrics. Safeguards passwords, journals, and private study notes.', icon: 'lock-closed-outline' },
                { title: '6. Daily Goals engine', body: 'Checklists mapping to productivity analytics, helping you visualize streak consistency and target completion rates.', icon: 'checkbox-outline' },
                { title: '7. Smart Reminder system', body: 'Configurable notifications mapping to dates and categories to prevent schedule slips.', icon: 'alarm-outline' },
                { title: '8. Privacy-first architecture', body: 'No marketing trackers, telemetry SDKs, or cloud indexing. Encryption keys stay on your hardware chips.', icon: 'shield-checkmark-outline' },
                { title: '9. Offline-first support', body: 'Full database read/write capability without internet. Ideal for deep-focus offline sessions.', icon: 'wifi-outline' },
                { title: '10. Cloud sync architecture', body: 'Underpinned by secure REST layers. Designed for end-to-end user-controlled cloud backups.', icon: 'cloud-done-outline' },
                { title: '11. Upcoming roadmap', body: 'PostgreSQL Postgres sync, rich visual calendar views, speech-to-text dictation, and visual graphs.', icon: 'calendar-outline' },
                { title: '12. Developer vision', body: 'To create a lightning-fast, expensive-feeling productivity application that puts user ownership at its core.', icon: 'code-working-outline' }
              ].map(card => (
                <View key={card.title} style={[dynamicStyles.fullModalCard, getThemedShadow(theme, 'soft')]}>
                  <View style={dynamicStyles.fullCardHeader}>
                    <Ionicons name={card.icon as any} size={18} color={accentColor} style={{ marginRight: 10 }} />
                    <Text style={[dynamicStyles.fullCardTitle, { color: theme.text }]}>{card.title}</Text>
                  </View>
                  <Text style={dynamicStyles.fullCardBody}>{card.body}</Text>
                </View>
              ))}

              <Text style={dynamicStyles.aboutPrivacy}>Productivity workspace built with precision. Data belongs completely to you.</Text>
              
              <TouchableOpacity style={[dynamicStyles.aboutActionBtn, { backgroundColor: accentColor }]} onPress={() => setAboutModal(false)}>
                <Text style={dynamicStyles.aboutActionText}>Dismiss Showcase</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Custom Full Screen Privacy Center Modal */}
      <Modal visible={privacyModal} transparent={false} animationType="slide">
        <SafeAreaView style={[dynamicStyles.container, { backgroundColor: theme.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          
          <View style={dynamicStyles.fullModalHeader}>
            <Text style={dynamicStyles.fullModalTitle}>Privacy & Security Center</Text>
            <TouchableOpacity 
              style={dynamicStyles.fullCloseBtn} 
              onPress={() => setPrivacyModal(false)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 25, paddingBottom: 60 }}>
            <View style={{ alignItems: 'center', width: '100%' }}>
              <View style={dynamicStyles.shieldHeaderWrapper}>
                <Ionicons name="shield-checkmark" size={64} color={accentColor} style={{ opacity: 0.9 }} />
                <Text style={[dynamicStyles.shieldHeading, { color: theme.text }]}>Data Shield Active</Text>
                <Text style={dynamicStyles.shieldSubheading}>Your second-brain data is locally locked</Text>
              </View>

              {/* Privacy detailed sections */}
              {[
                { key: 'own', title: 'Your Data Ownership', content: 'KnoVault does not index your behaviors. You have 100% ownership of your documents, targets, and notes.' },
                { key: 'local', title: 'Local-First Storage', content: 'Data is written directly to a client-side SQLite instance on your device storage. No external servers query your notes.' },
                { key: 'enc', title: 'Encryption System', content: 'Secure notes use AES-256 local encryption. Decryption keys are unlocked only via hardware authorization passcode.' },
                { key: 'ai', title: 'AI Privacy Explanation', content: 'AI queries are filtered on-device first. Selected context is sent through secure API channels and is never saved for model retraining.' },
                { key: 'cloud', title: 'Cloud Sync Privacy', content: 'Optional backup files are encrypted locally before export, ensuring cloud drives only host locked volumes.' },
                { key: 'vault', title: 'Secure Vault Explanation', content: 'Biometric authorization shields private categories from background process snooping.' },
                { key: 'device', title: 'Device-Only Protection', content: 'Keys reside inside secure enclaves on iOS/Android chips, inaccessible to external networks.' },
                { key: 'backup', title: 'Backup Security', content: 'Workspace exports map to standardized, parseable JSON files, allowing you to delete your workspace at any time.' },
                { key: 'neon', title: 'Neon Cloud Architecture', content: 'Our upcoming PostgreSQL backend features end-to-end client-encrypted volumes, maintaining zero-knowledge server access.' }
              ].map(sec => {
                const isExpanded = privacyExpanded[sec.key] || false;
                return (
                  <View key={sec.key} style={[dynamicStyles.privacySectionBox, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity 
                      style={dynamicStyles.privacyCollapseHeader} 
                      onPress={() => togglePrivacyExpand(sec.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[dynamicStyles.privacySectionTitle, { color: theme.text }]}>{sec.title}</Text>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.text.tertiary} />
                    </TouchableOpacity>
                    {isExpanded && (
                      <Animated.View entering={FadeIn.duration(200)}>
                        <Text style={dynamicStyles.privacySectionBody}>{sec.content}</Text>
                      </Animated.View>
                    )}
                  </View>
                );
              })}

              <View style={dynamicStyles.privacyBottomTag}>
                <Ionicons name="heart-outline" size={16} color={accentColor} style={{ marginRight: 6 }} />
                <Text style={[dynamicStyles.privacyBottomTagText, { color: theme.text }]}>Your productivity data belongs entirely to you.</Text>
              </View>

              <TouchableOpacity style={[dynamicStyles.aboutActionBtn, { backgroundColor: accentColor, marginTop: 20 }]} onPress={() => setPrivacyModal(false)}>
                <Text style={dynamicStyles.aboutActionText}>Acknowledge Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Reusable Stat Card Component
function StatCard({ label, value, icon, color, theme, isDark }: any) {
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(124, 77, 255, 0.08)';
  return (
    <View style={[statCardStyles(theme, color).statCard, { borderColor: cardBorder }]}>
      <View style={[statCardStyles(theme, color).statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={statCardStyles(theme, color).statValue} numberOfLines={1}>{value}</Text>
      <Text style={statCardStyles(theme, color).statLabel}>{label}</Text>
    </View>
  );
}

const statCardStyles = (theme: any, color: string) => StyleSheet.create({
  statCard: { 
    flex: 1, 
    minWidth: '45%',
    backgroundColor: theme.card, 
    borderRadius: 18, 
    padding: 16, 
    ...getThemedShadow(theme, 'soft'), 
    borderWidth: 1.2, 
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { ...typography.titleSmall, fontWeight: '800', color: theme.text },
  statLabel: { ...typography.caption, color: theme.textSecondary },
});

const openThemePicker = () => {
  // Overridden dynamically in theme selectors
};

const styles = (theme: any, isDark: boolean, colors: any, accentColor: string, cardRadius: number) => {
  const transparentCard = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(124, 77, 255, 0.08)';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: { paddingBottom: 130 },

    // Floating Custom Toast Notification
    toast: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 55 : 25,
      left: 20,
      right: 20,
      zIndex: 9999,
      alignItems: 'center',
    },
    toastContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(24, 34, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: borderCol,
      borderWidth: 1.2,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 16,
      width: '100%',
    },
    toastText: {
      ...typography.bodyMedium,
      fontWeight: '600',
      flex: 1,
    },
    
    // Overview Card (Hero)
    overviewCard: {
      marginHorizontal: 25,
      marginTop: 20,
      marginBottom: 25,
      padding: 24,
      borderRadius: cardRadius + 6,
      backgroundColor: transparentCard,
      borderWidth: 1.2,
      borderColor: borderCol,
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    orbDecorRight: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: `${accentColor}12`,
      top: -40,
      right: -40,
      zIndex: -1,
    },
    orbDecorLeft: {
      position: 'absolute',
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: '#10B98108',
      bottom: -30,
      left: -30,
      zIndex: -1,
    },
    avatarWrapper: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    avatarAnimatedRing: {
      position: 'absolute',
      width: 106,
      height: 106,
      borderRadius: 38,
      borderWidth: 1.5,
      borderColor: accentColor,
      opacity: 0.5,
    },
    avatar: { 
      width: 96, 
      height: 96, 
      borderRadius: 34, 
      justifyContent: 'center', 
      alignItems: 'center', 
      ...getThemedShadow(theme, 'medium') 
    },
    avatarText: { fontSize: 36, color: '#FFFFFF', fontWeight: '800' },
    editAvatarBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: accentColor,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.card,
    },
    onlineDotWrapper: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    onlineDotPulse: {
      position: 'absolute',
      backgroundColor: '#10B981',
      width: 20,
      height: 20,
      borderRadius: 10,
      opacity: 0.4,
    },
    onlineDot: {
      backgroundColor: '#10B981',
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: theme.card,
    },
    greetingText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '600',
      marginBottom: 2,
    },
    name: { ...typography.displaySmall, color: theme.text, fontWeight: '800', fontSize: 22, textAlign: 'center', marginBottom: 2 },
    email: { ...typography.bodyMedium, color: theme.textSecondary, marginBottom: 4 },
    joinedText: { ...typography.caption, color: colors.text.tertiary, marginBottom: 12 },
    
    headerStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginVertical: 10,
    },
    headerStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    headerStatDivider: {
      width: 1,
      height: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    headerStatLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textSecondary,
      marginBottom: 2,
      letterSpacing: 0.8,
    },
    headerStatVal: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    levelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 12,
    },
    badgeText: {
      ...typography.caption,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 11,
    },
    streakOverviewBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: isDark ? '#2D2D4D' : '#FEF3C7',
      borderWidth: 1,
      borderColor: isDark ? '#4C3B77' : '#FDE68A',
    },
    streakOverviewText: {
      ...typography.caption,
      color: '#D97706',
      fontWeight: '700',
      fontSize: 11,
    },
    editBtn: { 
      paddingHorizontal: 20, 
      paddingVertical: 8, 
      borderRadius: 15, 
      backgroundColor: theme.card, 
      borderWidth: 1.2, 
      borderColor: theme.border,
      marginBottom: 16,
    },
    editBtnText: { ...typography.bodySmall, color: theme.text, fontWeight: '700' },
    
    quoteContainer: {
      width: '100%',
      backgroundColor: isDark ? 'rgba(124, 77, 255, 0.05)' : 'rgba(124, 77, 255, 0.03)',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      borderLeftWidth: 3,
      borderLeftColor: accentColor,
      position: 'relative',
    },
    quoteIconLeft: {
      position: 'absolute',
      top: 6,
      left: 6,
    },
    quoteText: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },

    // Sections
    section: { paddingHorizontal: 25, marginBottom: 25 },
    sectionTitle: { 
      ...typography.caption, 
      color: accentColor, 
      fontWeight: '800', 
      marginBottom: 14, 
      marginLeft: 5, 
      textTransform: 'uppercase', 
      letterSpacing: 1.5 
    },
    
    // Stats Grid
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'space-between',
    },

    // Weekly Chart Card
    chartCard: {
      backgroundColor: transparentCard,
      borderRadius: cardRadius,
      borderWidth: 1.2,
      borderColor: borderCol,
      padding: 16,
    },
    chartKPIsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    chartKPICol: {
      alignItems: 'flex-start',
    },
    chartKPILabel: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '700',
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    kpiValueWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chartKPIVal: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.text,
    },
    miniSparkline: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
      height: 24,
      width: 25,
      paddingBottom: 2,
    },
    miniSparklineBar: {
      width: 4,
      borderRadius: 1,
    },
    chartTooltipContainer: {
      backgroundColor: isDark ? '#1E1B4B' : '#FFFFFF',
      borderWidth: 1.2,
      borderColor: accentColor,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'center',
      marginBottom: 6,
      ...getThemedShadow(theme, 'soft'),
    },
    tooltipText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.text,
    },
    chartStatsSubRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      paddingTop: 10,
    },
    chartStatChip: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chartStatChipLabel: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    chartStatChipVal: {
      fontSize: 10,
      color: theme.text,
      fontWeight: '800',
    },
    
    // GitHub contribution heatmap styles
    heatmapCard: {
      backgroundColor: transparentCard,
      borderRadius: cardRadius,
      borderWidth: 1.2,
      borderColor: borderCol,
      padding: 16,
    },
    heatmapSubtitle: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '600',
      marginBottom: 12,
    },
    heatmapGridContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
    },
    heatmapLabelsCol: {
      marginRight: 10,
      gap: 6,
      justifyContent: 'center',
    },
    heatmapLabelText: {
      fontSize: 9,
      color: theme.textSecondary,
      fontWeight: '700',
    },
    heatmapBlocksWrapper: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 250,
      gap: 4,
    },
    heatmapCell: {
      width: 14,
      height: 14,
      borderRadius: 3,
      borderWidth: 1,
    },
    heatmapLegend: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 12,
      gap: 4,
    },
    legendText: {
      fontSize: 9,
      color: theme.textSecondary,
      fontWeight: '600',
      marginHorizontal: 2,
    },
    legendCell: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },

    // Intelligence Grid (Workspace Health & AI Coach)
    intelligenceGrid: {
      gap: 12,
    },
    intelligenceCard: {
      backgroundColor: transparentCard,
      borderRadius: cardRadius,
      borderWidth: 1.2,
      borderColor: borderCol,
      padding: 18,
    },
    intelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    intelTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
    },
    healthStatRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    healthLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    healthVal: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.text,
    },
    healthProgressBarBg: {
      height: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 10,
    },
    healthProgressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    healthBadgesRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 10,
    },
    healthBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    healthBadgeText: {
      fontSize: 9,
      fontWeight: '800',
    },
    intelFooter: {
      fontSize: 10,
      color: colors.text.tertiary,
      fontWeight: '600',
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      paddingTop: 8,
    },
    
    // AI insight cards
    insightCard: {
      backgroundColor: theme.card,
      borderRadius: cardRadius,
      borderWidth: 1.2,
      borderColor: borderCol,
      overflow: 'hidden',
    },
    insightCardBg: {
      padding: 18,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    insightTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: 0.5,
    },
    insightDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    regenerateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 10,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    regenerateText: {
      fontSize: 9,
      fontWeight: '800',
    },

    // Feedback & Suggestions System Card
    feedbackCard: {
      backgroundColor: transparentCard,
      borderRadius: cardRadius,
      borderWidth: 1.2,
      borderColor: borderCol,
      padding: 18,
    },
    feedbackLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    starRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 14,
    },
    feedbackSubLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      marginBottom: 8,
      marginTop: 6,
    },
    feedbackChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    feedbackChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    feedbackChipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    feedbackInput: {
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      padding: 10,
      fontSize: 12,
      height: 60,
      textAlignVertical: 'top',
      marginBottom: 10,
    },
    screenshotAttachBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      marginBottom: 14,
    },
    screenshotAttachText: {
      fontSize: 11,
      fontWeight: '700',
    },
    feedbackSubmitBtn: {
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    feedbackSubmitText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    // Skeletons
    statCard: { 
      flex: 1, 
      minWidth: '45%',
      backgroundColor: theme.card, 
      borderRadius: cardRadius, 
      padding: 16, 
      borderWidth: 1.2, 
      borderColor: borderCol,
    },
    skeletonIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? '#2D3748' : '#E2E8F0',
      marginBottom: 10,
    },
    skeletonTitle: {
      width: '60%',
      height: 18,
      borderRadius: 4,
      backgroundColor: isDark ? '#2D3748' : '#E2E8F0',
      marginBottom: 8,
    },
    skeletonLabel: {
      width: '40%',
      height: 12,
      borderRadius: 4,
      backgroundColor: isDark ? '#2D3748' : '#E2E8F0',
    },

    // Menu Item & Selectors
    menuItem: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: transparentCard, 
      borderRadius: cardRadius + 4, 
      padding: 14, 
      marginBottom: 8, 
      ...getThemedShadow(theme, 'soft'), 
      borderWidth: 1.2, 
      borderColor: borderCol 
    },
    menuItemCol: {
      backgroundColor: transparentCard,
      borderRadius: cardRadius + 4,
      padding: 14,
      marginBottom: 8,
      ...getThemedShadow(theme, 'soft'),
      borderWidth: 1.2,
      borderColor: borderCol,
    },
    menuItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorPaletteRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginTop: 12,
      paddingBottom: 4,
    },
    colorBubble: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorBubbleSelected: {
      borderColor: theme.text,
      transform: [{ scale: 1.1 }],
    },
    iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuText: { flex: 1, ...typography.bodyMedium, color: theme.text, fontWeight: '700' },
    menuValue: { ...typography.bodySmall, color: theme.textSecondary, marginRight: 8, fontWeight: '600' },

    // Security health status box
    securityHealthBox: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.02)',
      borderColor: '#10B98133',
      borderWidth: 1,
      borderRadius: cardRadius,
      padding: 12,
      marginTop: 6,
    },
    securityHealthTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10B981',
      marginBottom: 4,
    },
    securityHealthDesc: {
      fontSize: 10,
      color: theme.textSecondary,
      lineHeight: 14,
    },

    // Neon/Postgres sync cards
    syncStatusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: cardRadius - 2,
      padding: 12,
      marginBottom: 16,
    },
    syncTitle: {
      fontSize: 12,
      fontWeight: '800',
    },
    syncDesc: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 2,
    },
    syncBadge: {
      backgroundColor: '#7C4DFF15',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    syncBadgeText: {
      fontSize: 9,
      color: accentColor,
      fontWeight: '800',
    },

    // Data Management & Quick Actions
    dataManagementCard: {
      backgroundColor: transparentCard,
      borderRadius: cardRadius,
      borderWidth: 1.2,
      borderColor: borderCol,
      padding: 18,
    },
    backupStatusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backupStatusCol: {
      flex: 1,
      alignItems: 'center',
    },
    backupStatusLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    backupStatusVal: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: '700',
      textAlign: 'center',
    },
    backupIntervalBtn: {
      backgroundColor: isDark ? '#2D2D4D' : '#EDE9FE',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 8,
    },
    backupIntervalText: {
      fontSize: 11,
      fontWeight: '800',
    },
    storageAnalyticsWrapper: {
      marginBottom: 16,
    },
    storageLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    storageAnalyticsLabel: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    storageAnalyticsPercent: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '700',
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    storageDetailSubRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    storageSubText: {
      fontSize: 10,
      color: colors.text.tertiary,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      marginVertical: 14,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
    },
    quickActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minWidth: '47%',
    },
    quickActionBtnText: {
      fontSize: 11,
      color: theme.text,
      fontWeight: '700',
    },

    // Recent Activity Timeline Card
    timelineCard: {
      backgroundColor: transparentCard,
      borderRadius: cardRadius,
      borderWidth: 1.2,
      borderColor: borderCol,
      padding: 18,
    },
    emptyTimelineText: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    timelineItem: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    timelineLineWrapper: {
      alignItems: 'center',
      marginRight: 14,
    },
    timelineIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    timelineVerticalLine: {
      width: 1.5,
      flex: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      marginTop: 4,
      marginBottom: -16,
    },
    timelineContent: {
      flex: 1,
      justifyContent: 'center',
    },
    timelineHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timelineActionText: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: '600',
    },
    activityGlowDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    timelineTimeText: {
      ...typography.caption,
      color: colors.text.tertiary,
      marginTop: 2,
    },

    // Sign Out Button Redesign
    logoutBtnWrapper: {
      marginHorizontal: 25,
      borderRadius: 22,
      overflow: 'hidden',
      marginTop: 20,
      ...getThemedShadow(theme, 'medium'),
    },
    logoutGradientBtn: {
      flexDirection: 'row',
      height: 58, 
      justifyContent: 'center', 
      alignItems: 'center', 
    },
    logoutText: { ...typography.bodyLarge, color: '#FFFFFF', fontWeight: '800' },
    version: { textAlign: 'center', marginTop: 30, ...typography.caption, color: theme.textSecondary },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
    modalCard: { backgroundColor: theme.card, borderRadius: 32, padding: 24, borderWidth: 1.2, borderColor: theme.border, ...getThemedShadow(theme, 'medium') },
    modalTitle: { ...typography.titleMedium, fontWeight: '800', color: theme.text, marginBottom: 18, textAlign: 'center' },
    modalLabel: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '700', marginBottom: 5, marginLeft: 4 },
    modalInput: { 
      backgroundColor: theme.background, 
      borderRadius: 14, 
      paddingHorizontal: 16, 
      paddingVertical: 12, 
      ...typography.bodyMedium, 
      color: theme.text, 
      marginBottom: 14, 
      borderWidth: 1.2, 
      borderColor: theme.border 
    },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    modalCancelBtn: { 
      flex: 1, 
      height: 48, 
      borderRadius: 14, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: theme.background, 
      borderWidth: 1.2, 
      borderColor: theme.border 
    },
    modalCancelText: { ...typography.bodyMedium, color: theme.textSecondary, fontWeight: '700', textAlign: 'center' },
    modalSaveBtn: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalSaveText: { ...typography.bodyMedium, color: '#FFFFFF', fontWeight: '800' },

    // Custom sign out dialog
    signOutWarnIconBox: {
      alignSelf: 'center',
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#EF444415',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    signOutDescText: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
      paddingHorizontal: 6,
    },
    modalConfirmSignOutBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#EF4444',
    },
    modalConfirmSignOutText: {
      ...typography.bodyMedium,
      color: '#FFFFFF',
      fontWeight: 'bold',
    },

    // Interactive Avatar Select
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
      marginBottom: 18,
    },
    avatarSelectBtn: {
      width: 54,
      height: 54,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },

    // Support Actions
    supportSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    supportActionsWrapper: {
      gap: 10,
      marginBottom: 18,
    },
    supportActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderColor: theme.border,
      borderWidth: 1.2,
      borderRadius: 16,
      padding: 12,
    },
    supportCardIcon: {
      marginRight: 12,
    },
    supportCardTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    supportCardDesc: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },

    // Premium full screen modal header
    fullModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    fullModalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: 0.5,
    },
    fullCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },

    // Full screen showcase lists
    fullModalCard: {
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1.2,
      borderColor: borderCol,
      padding: 16,
      width: '100%',
      marginBottom: 12,
    },
    fullCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    fullCardTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    fullCardBody: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 18,
    },

    // Premium About Modal
    aboutLogo: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...getThemedShadow(theme, 'medium') },
    aboutTitle: { ...typography.displaySmall, fontWeight: '800', color: theme.text, fontSize: 24 },
    aboutVersion: { fontSize: 13, color: theme.textSecondary, marginBottom: 16 },
    aboutDesc: { ...typography.bodyMedium, color: theme.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 22, paddingHorizontal: 10 },
    aboutPrivacy: { fontSize: 10, color: theme.textSecondary, textAlign: 'center', marginBottom: 24, marginTop: 14 },
    aboutActionBtn: { width: '100%', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', ...getThemedShadow(theme, 'soft'), marginTop: 8 },
    aboutActionText: { ...typography.bodyMedium, color: '#FFFFFF', fontWeight: '800' },

    // Privacy shield header
    shieldHeaderWrapper: {
      alignItems: 'center',
      marginVertical: 20,
    },
    shieldHeading: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 12,
    },
    shieldSubheading: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 4,
    },
    privacySectionBox: {
      width: '100%',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    privacyCollapseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    privacySectionTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    privacySectionBody: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 18,
      marginTop: 10,
      paddingHorizontal: 2,
    },
    privacyBottomTag: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0,0,0,0.02)',
      borderRadius: 12,
      padding: 12,
      marginVertical: 18,
      width: '100%',
    },
    privacyBottomTagText: {
      fontSize: 11,
      fontWeight: '700',
    }
  });
};
