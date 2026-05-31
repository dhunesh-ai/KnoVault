import React, { useState, useEffect, useMemo } from 'react';
import SwipeWrapper from '../../src/components/SwipeWrapper';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Modal, TextInput, ActivityIndicator, Platform,
  BackHandler, TouchableWithoutFeedback, Dimensions, Linking, Alert
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
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSpring, cancelAnimation, LinearTransition
} from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { getFadeIn, getFadeInUp, getFadeOutUp, getFadeInDown, getFadeOut, getZoomIn, getZoomOut, getLinearTransition } from '../../src/utils/animations';
import { LineChart } from 'react-native-chart-kit';
import { useAuthStore } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTheme } from '../../src/hooks/useTheme';
import { notesApi } from '../../src/api/notes';
import { remindersApi } from '../../src/api/reminders';
import { projectsApi } from '../../src/api/projects';
import { importantDaysApi } from '../../src/api/important_days';
import { typography } from '../../src/theme';
import client from '../../src/api/client';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import { syncWorkspace } from '../../src/services/sync';
import { exportLocalBackup, importLocalBackup, exportLocalBackupAsJson, importLocalBackupFromJson } from '../../src/services/backup';
import ScreenContainer from '../../src/components/ScreenContainer';

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

const AVATAR_EMOJIS = ['🧠', '⚡', '🚀', '💡', '📅', '🎯', '🔮', '🛡️', '💼', '🎨', '👑', '🌈'];

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
  const [signOutModal, setSignOutModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isNotifExpanded, setIsNotifExpanded] = useState(false);

  // Personalization settings
  const [accentColor, setAccentColor] = useState('#7C4DFF');

  // Security & Notification settings
  const { 
    animationsEnabled, setAnimationsEnabled, 
    
    notificationsEnabled, notificationReminders, notificationGoals, 
    notificationDailySummary, notificationSound, notificationVibration,
    toggleNotificationSetting, microphoneEnabled, setMicrophoneEnabled
  } = useSettingsStore();
  
  const [passcodeModal, setPasscodeModal] = useState<{ visible: boolean, mode: 'create' | 'change' | 'verify' }>({ visible: false, mode: 'create' });
  const [passcodeStep, setPasscodeStep] = useState(1);
  const [passcodeInput, setPasscodeInput] = useState('');
  
  // Custom Toast State
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'success',
  });


  // Random quote
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);

  // Privacy collapsible states
  const [privacyExpanded, setPrivacyExpanded] = useState<Record<string, boolean>>({
    'local': false,
    'enc': false,
    'ai': false,
    'own': false,
    'cloud': false,
  });
  const [storageInfoExpanded, setStorageInfoExpanded] = useState(false);

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
  
  const { data: projects, isLoading: loadingProjects } = useQuery({ 
    queryKey: ['projects'], 
    queryFn: () => projectsApi.getProjects() 
  });
  
  const { data: specialDays, isLoading: loadingDays } = useQuery({ 
    queryKey: ['special_days'], 
    queryFn: () => importantDaysApi.getImportantDays() 
  });

  // Calculate Most Used Category
  const mostUsedCategory = useMemo(() => {
    if (!notes || notes.length === 0) return null;
    const counts: Record<string, number> = {};
    notes.forEach((n: any) => {
      const cat = n.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    let maxCat = '';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(counts)) {
      if (count > maxCount) { maxCount = count; maxCat = cat; }
    }
    return maxCount > 0 ? { name: maxCat, count: maxCount } : null;
  }, [notes]);

  // Calculate Active This Week
  const activeThisWeek = useMemo(() => {
    let count = 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const countRecent = (items: any[]) => {
      if (!items) return 0;
      return items.filter(item => {
        if (!item.created_at) return false;
        const d = new Date(item.created_at);
        return d >= sevenDaysAgo && d <= now;
      }).length;
    };
    
    count += countRecent(notes || []);
    count += countRecent(reminders || []);
    count += countRecent(projects || []);
    count += countRecent(specialDays || []);
    
    return count;
  }, [notes, reminders, projects, specialDays]);

  // Storage Metrics
  const CLOUD_LIMIT_MB = 5;
  const storageMetrics = useMemo(() => {
    let bytes = 0;
    try {
      const workspaceData = { notes: notes || [], reminders: reminders || [], stats: stats || {} };
      if (typeof Blob !== 'undefined') {
        bytes = new Blob([JSON.stringify(workspaceData)]).size;
      } else {
        bytes = JSON.stringify(workspaceData).length; // fallback
      }
    } catch (e) {
      bytes = 0;
    }
    const usedMB = parseFloat((bytes / 1024 / 1024).toFixed(2));
    const usedKB = parseFloat((bytes / 1024).toFixed(1));
    const usedString = usedMB >= 1 ? `${usedMB.toFixed(1)} MB` : `${usedKB} KB`;

    const remainingMBVal = Math.max(0, CLOUD_LIMIT_MB - usedMB);
    const remainingMB = remainingMBVal.toFixed(1);
    const remainingKB = parseFloat((remainingMBVal * 1024).toFixed(1));
    const remainingString = remainingMBVal >= 1 ? `${remainingMB} MB` : `${remainingKB} KB`;

    const isCloudFull = usedMB >= CLOUD_LIMIT_MB;
    const progress = Math.min(1, usedMB / CLOUD_LIMIT_MB);
    
    let color = '#10B981'; // Green
    if (progress >= 0.9) color = '#EF4444'; // Red
    else if (progress >= 0.7) color = '#F59E0B'; // Orange
    
    return { usedMB, usedString, remainingMB, remainingString, isCloudFull, progress, color };
  }, [notes, reminders, stats]);

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
    SecureStore.getItemAsync('knovault_avatar_emoji').then(v => { if (v) setAvatarEmoji(v); });
    SecureStore.getItemAsync('knovault_accent_color').then(v => { if (v) setAccentColor(v); });
  }, []);

  // Back handler for modals
  useEffect(() => {
    const onBackPress = () => {
      if (aboutModal) { setAboutModal(false); return true; }
      if (editModal) { setEditModal(false); return true; }
      if (privacyModal) { setPrivacyModal(false); return true; }
      if (avatarModal) { setAvatarModal(false); return true; }
      if (signOutModal) { setSignOutModal(false); return true; }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [aboutModal, editModal, privacyModal, avatarModal, signOutModal]);

  // Randomize quote on mount
  useEffect(() => {
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  }, []);

  // Shared Animation Values
  const avatarScale = useSharedValue(1);
  const skeletonOpacity = useSharedValue(0.4);
  const orbTranslateY = useSharedValue(0);
  const arrowRotation = useSharedValue(0);

  useEffect(() => {
    arrowRotation.value = animationsEnabled ? withTiming(isNotifExpanded ? 180 : 0, { duration: 300 }) : (isNotifExpanded ? 180 : 0);
  }, [isNotifExpanded, animationsEnabled]);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }]
  }));

  useEffect(() => {
    if (animationsEnabled) {
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
    } else {
      cancelAnimation(avatarScale);
      cancelAnimation(skeletonOpacity);
      cancelAnimation(orbTranslateY);
      avatarScale.value = 1;
      skeletonOpacity.value = 1;
      orbTranslateY.value = 0;
    }
  }, [animationsEnabled]);

  const animatedAvatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const animatedSkeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: orbTranslateY.value }],
  }));

  const displayName = user?.full_name || 'Innovator';
  const email = user?.email || 'user@knovault.com';
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

  // App lock toggle
  

  // Animations toggle
  const handleAnimationsToggle = async (val: boolean) => {
    triggerHaptic();
    await setAnimationsEnabled(val);
    showToast(val ? 'Animation Effects Enabled' : 'Animation Effects Disabled', 'info');
  };

  // Microphone toggle
  const handleMicrophoneToggle = async (val: boolean) => {
    triggerHaptic();
    if (val) {
      try {
        const isAvailable = ExpoSpeechRecognitionModule.isRecognitionAvailable();
        if (!isAvailable) {
          showToast('Speech recognition not available on this device', 'error');
          return;
        }
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (permission.granted) {
          await setMicrophoneEnabled(true);
          showToast('Microphone access granted', 'success');
        } else {
          showToast('Microphone permission denied', 'error');
        }
      } catch (e) {
        showToast('Failed to request microphone permission', 'error');
      }
    } else {
      await setMicrophoneEnabled(false);
      showToast('Microphone access disabled', 'info');
    }
  };

  const handleContactSupport = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:thinkgood24hrs@gmail.com?subject=KnoVault Support Request');
  };

  // Timeline Activity Feed (Grouped and formatted)
  const recentActivities = useMemo(() => {
    const list: any[] = [];
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
    return list.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
  }, [notes, reminders]);

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

  const dynamicStyles = styles(theme, isDark, colors, accentColor);

  // Loading skeleton card


  return (
    <SwipeWrapper currentTab="profile">
      <ScreenContainer style={dynamicStyles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Floating Toast Notification */}
      {toast.visible && (
        <Animated.View entering={getFadeInUp(0, 300)} exiting={getFadeOutUp(300)} style={dynamicStyles.toast}>
          <View style={[dynamicStyles.toastContent]}>
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
        <Animated.View entering={getFadeInUp(0, 600)} style={[dynamicStyles.overviewCard]}>
          
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




          <TouchableOpacity style={dynamicStyles.editBtn} onPress={openEditProfile} activeOpacity={0.8}>
            <Text style={dynamicStyles.editBtnText}>Edit Name</Text>
          </TouchableOpacity>

          <View style={dynamicStyles.quoteContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={`${accentColor}66`} style={dynamicStyles.quoteIconLeft} />
            <Text style={dynamicStyles.quoteText}>{quote}</Text>
          </View>
        </Animated.View>



        {/* ── 6. PRODUCTIVITY INSIGHTS GRID ───────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Productivity metrics</Text>
          {loadingNotes || loadingStats || loadingProjects || loadingDays ? (
            <View style={dynamicStyles.statsGrid}>
              {[1, 2, 3, 4, 5, 6].map((key) => (
                <Animated.View key={key} style={[dynamicStyles.statCard, animatedSkeletonStyle]}>
                  <View style={dynamicStyles.skeletonIcon} />
                  <View style={dynamicStyles.skeletonTitle} />
                  <View style={dynamicStyles.skeletonLabel} />
                </Animated.View>
              ))}
            </View>
          ) : (
            <Animated.View entering={getFadeInDown(100, 600)} style={dynamicStyles.statsGrid}>
              <StatCard label="Total Notes" value={totalNotes} icon="document-text-outline" color="#8B5CF6" theme={theme} isDark={isDark} />
              <StatCard label="Reminders" value={reminders?.length || 0} icon="alarm-outline" color="#F59E0B" theme={theme} isDark={isDark} />
              <StatCard label="Projects" value={stats?.total_projects || projects?.length || 0} icon="folder-open-outline" color="#3B82F6" theme={theme} isDark={isDark} />
              <StatCard label="Special Days" value={stats?.total_special_days || specialDays?.length || 0} icon="calendar-outline" color="#10B981" theme={theme} isDark={isDark} />
              <StatCard 
                label="MOST USED" 
                value={mostUsedCategory ? mostUsedCategory.name : "No Data Yet"} 
                subtitle={mostUsedCategory ? `${mostUsedCategory.count} Notes` : undefined}
                icon="pricetag-outline" 
                color="#EC4899" 
                theme={theme} 
                isDark={isDark} 
                isTextValue={true}
              />
              <StatCard 
                label="THIS WEEK" 
                value={`${activeThisWeek}`} 
                subtitle={activeThisWeek === 1 ? "1 Activity" : `${activeThisWeek} Activities`}
                icon="pulse-outline" 
                color="#14B8A6" 
                theme={theme} 
                isDark={isDark} 
              />
            </Animated.View>
          )}
        </View>



        {/* ── 8. PERSONALIZATION STUDIO ──────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Personalization Studio</Text>
          
          <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => {
            triggerHaptic();
            const nextMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
            setMode(nextMode);
            showToast(`Theme changed to ${nextMode}`, 'info');
          }} activeOpacity={0.7}>
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


                    <View style={dynamicStyles.menuItem}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#14B8A615' }]}>
              <Ionicons name="color-wand-outline" size={20} color="#14B8A6" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={dynamicStyles.menuText}>Animation Effects</Text>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>{animationsEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
            <Switch
              value={animationsEnabled}
              onValueChange={handleAnimationsToggle}
              trackColor={{ false: theme.border, true: accentColor }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={dynamicStyles.menuItem}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="mic-outline" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={dynamicStyles.menuText}>Microphone Access</Text>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>Required for Voice Notes and Speech-to-Text</Text>
              <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2, fontWeight: '600' }]}>{microphoneEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
            <Switch
              value={microphoneEnabled}
              onValueChange={handleMicrophoneToggle}
              trackColor={{ false: theme.border, true: accentColor }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ── NOTIFICATION CENTER ──────────────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Notification Center</Text>
          
          <Animated.View layout={getLinearTransition()} style={dynamicStyles.notificationCard}>
            <TouchableOpacity 
              style={[dynamicStyles.notificationHeaderRow, { paddingVertical: 12, paddingHorizontal: 16 }]} 
              onPress={() => { triggerHaptic(); setIsNotifExpanded(!isNotifExpanded); }}
              activeOpacity={0.7}
            >
              <View style={[dynamicStyles.iconBox, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={[dynamicStyles.menuText, { marginLeft: 10, flex: 1 }]}>Master Notifications</Text>
              
              <Switch
                value={notificationsEnabled}
                onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationsEnabled', 'knovault_notifications', val); }}
                trackColor={{ false: theme.border, true: accentColor }}
                thumbColor="#FFFFFF"
                style={{ marginRight: 15 }}
              />

              <Animated.View style={animatedArrowStyle}>
                <Ionicons name="chevron-down-outline" size={20} color={theme.textSecondary} />
              </Animated.View>
            </TouchableOpacity>

            {isNotifExpanded && (
              <Animated.View entering={getFadeInDown(0, 300)} exiting={getFadeOutUp(300)}>
                <View style={[dynamicStyles.notificationDivider, { marginLeft: 16 }]} />
                <View style={{ opacity: notificationsEnabled ? 1 : 0.5, paddingLeft: 16 }}>
                  <View style={dynamicStyles.notificationChildRow}>
                    <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Reminder Alerts</Text>
                    <Switch
                      value={notificationReminders}
                      onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationReminders', 'knovault_notif_reminders', val); }}
                      trackColor={{ false: theme.border, true: accentColor }}
                      thumbColor="#FFFFFF"
                      style={{ transform: [{ scale: 0.8 }] }}
                      disabled={!notificationsEnabled}
                    />
                  </View>
                  
                  <View style={dynamicStyles.notificationChildRow}>
                    <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Goals & Projects</Text>
                    <Switch
                      value={notificationGoals}
                      onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationGoals', 'knovault_notif_goals', val); }}
                      trackColor={{ false: theme.border, true: accentColor }}
                      thumbColor="#FFFFFF"
                      style={{ transform: [{ scale: 0.8 }] }}
                      disabled={!notificationsEnabled}
                    />
                  </View>

                  <View style={dynamicStyles.notificationChildRow}>
                    <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Daily Summary (8 AM)</Text>
                    <Switch
                      value={notificationDailySummary}
                      onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationDailySummary', 'knovault_notif_summary', val); }}
                      trackColor={{ false: theme.border, true: accentColor }}
                      thumbColor="#FFFFFF"
                      style={{ transform: [{ scale: 0.8 }] }}
                      disabled={!notificationsEnabled}
                    />
                  </View>

                  <View style={dynamicStyles.notificationChildRow}>
                    <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Sound</Text>
                    <Switch
                      value={notificationSound}
                      onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationSound', 'knovault_notif_sound', val); }}
                      trackColor={{ false: theme.border, true: accentColor }}
                      thumbColor="#FFFFFF"
                      style={{ transform: [{ scale: 0.8 }] }}
                      disabled={!notificationsEnabled}
                    />
                  </View>

                  <View style={dynamicStyles.notificationChildRowLast}>
                    <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Vibration</Text>
                    <Switch
                      value={notificationVibration}
                      onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationVibration', 'knovault_notif_vibration', val); }}
                      trackColor={{ false: theme.border, true: accentColor }}
                      thumbColor="#FFFFFF"
                      style={{ transform: [{ scale: 0.8 }] }}
                      disabled={!notificationsEnabled}
                    />
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </View>

        {/* ── 9. SECURITY CENTER ───────────────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Security Center</Text>
          
          {/* Passcode lock removed as per user requirement */}

        </View>

        {/* ── 10. CLOUD STORAGE ─────────────────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Cloud Storage</Text>
          <View style={[dynamicStyles.dataManagementCard]}>
            
            <View style={{ marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[dynamicStyles.syncTitle, { color: theme.text }]}>Storage Used</Text>
                <Text style={dynamicStyles.syncDesc}>{storageMetrics.usedString} / {CLOUD_LIMIT_MB.toFixed(1)} MB</Text>
              </View>
              
              <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <Animated.View style={{ height: '100%', backgroundColor: storageMetrics.color, width: `${storageMetrics.progress * 100}%`, borderRadius: 4 }} />
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={dynamicStyles.syncDesc}>
                  {storageMetrics.isCloudFull ? 'Cloud quota reached.' : `Cloud Storage Remaining: ${storageMetrics.remainingString}`}
                </Text>
                <Text style={[dynamicStyles.syncDesc, { color: storageMetrics.color, fontWeight: '700' }]}>
                  {Math.round(storageMetrics.progress * 100)}%
                </Text>
              </View>
            </View>

            <View style={dynamicStyles.syncStatusCard}>
              <Ionicons name={storageMetrics.isCloudFull ? "phone-portrait-outline" : "cloud-done-outline"} size={20} color={storageMetrics.color} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[dynamicStyles.syncTitle, { color: theme.text }]}>Storage Mode</Text>
                <Text style={dynamicStyles.syncDesc}>{storageMetrics.isCloudFull ? '📱 Local Storage Active' : '☁️ Cloud Storage Active'}</Text>
              </View>
            </View>
            
            {storageMetrics.isCloudFull && (
              <View style={{ marginTop: 12, padding: 10, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#F59E0B' }}>
                <Text style={{ ...typography.caption, color: theme.text, lineHeight: 18 }}>
                  New notes, reminders, projects and files are now stored locally on this device.
                </Text>
              </View>
            )}

            {/* Collapsible Info Section */}
            <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }} 
                onPress={() => { triggerHaptic(); setStorageInfoExpanded(!storageInfoExpanded); }}
                activeOpacity={0.7}
              >
                <Text style={{ ...typography.bodyMedium, color: theme.textSecondary, fontWeight: '600' }}>How Storage Works</Text>
                <Ionicons name={storageInfoExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
              </TouchableOpacity>
              
              {storageInfoExpanded && (
                <Animated.View entering={getFadeIn(0, 200)} style={{ marginTop: 10, paddingBottom: 5 }}>
                  <Text style={{ ...typography.caption, color: theme.textSecondary, marginBottom: 4, lineHeight: 18 }}>• Every user receives 5 MB free cloud storage.</Text>
                  <Text style={{ ...typography.caption, color: theme.textSecondary, marginBottom: 4, lineHeight: 18 }}>• Notes, reminders, projects and special days count toward usage.</Text>
                  <Text style={{ ...typography.caption, color: theme.textSecondary, marginBottom: 4, lineHeight: 18 }}>• When cloud storage reaches 5 MB, KnoVault automatically switches to local storage.</Text>
                  <Text style={{ ...typography.caption, color: theme.textSecondary, marginBottom: 4, lineHeight: 18 }}>• No data is deleted.</Text>
                  <Text style={{ ...typography.caption, color: theme.textSecondary, marginBottom: 4, lineHeight: 18 }}>• Existing cloud data remains synced.</Text>
                  <Text style={{ ...typography.caption, color: theme.textSecondary, marginBottom: 4, lineHeight: 18 }}>• New data is saved locally until cloud storage becomes available.</Text>
                </Animated.View>
              )}
            </View>

          </View>
        </View>

        {/* ── 11. RECENT ACTIVITY TIMELINE ──────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Recent Activity Timeline</Text>
          <View style={[dynamicStyles.timelineCard]}>
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
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={dynamicStyles.menuText}>About KnoVault</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => { triggerHaptic(); setPrivacyModal(true); }} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={dynamicStyles.menuText}>Privacy & Security Center</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.menuItem} onPress={handleContactSupport} activeOpacity={0.7}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="mail-unread-outline" size={20} color="#10B981" />
            </View>
            <Text style={dynamicStyles.menuText}>Contact Support</Text>
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
        
        <Text style={dynamicStyles.version}>KnoVault v1.2.5</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setEditModal(false)}>
          <Animated.View entering={getFadeIn()} exiting={getFadeOut()} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={getZoomIn()} exiting={getZoomOut()} style={dynamicStyles.modalCard}>
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
          <Animated.View entering={getFadeIn()} exiting={getFadeOut()} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={getZoomIn()} exiting={getZoomOut()} style={dynamicStyles.modalCard}>
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



      {/* Custom Sign Out Confirmation Modal */}
      <Modal visible={signOutModal} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setSignOutModal(false)}>
          <Animated.View entering={getFadeIn()} exiting={getFadeOut()} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={getZoomIn()} exiting={getZoomOut()} style={dynamicStyles.modalCard}>
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



      {/* About KnoVault Modal */}
      <Modal visible={aboutModal} transparent={false} animationType="slide">
        <ScreenContainer style={[dynamicStyles.container, { backgroundColor: theme.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          
          <View style={dynamicStyles.fullModalHeader}>
            <Text style={dynamicStyles.fullModalTitle}>About KnoVault</Text>
            <TouchableOpacity 
              style={dynamicStyles.fullCloseBtn} 
              onPress={() => setAboutModal(false)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 25, paddingBottom: 60 }}>
            <View style={{ alignItems: 'center', width: '100%', marginBottom: 30 }}>
              <LinearGradient colors={[accentColor, `${accentColor}cc`]} style={dynamicStyles.aboutLogo}>
                <Ionicons name="sparkles" size={36} color="#fff" />
              </LinearGradient>
              <Text style={dynamicStyles.aboutTitle}>KnoVault</Text>
              <Text style={dynamicStyles.aboutVersion}>Version 1.2.5</Text>
              <Text style={[dynamicStyles.aboutPrivacy, { marginTop: 10, fontStyle: 'italic' }]}>
                "Your Personal Second Brain for Notes, Goals, Projects, Reminders and Knowledge Management."
              </Text>
            </View>

            {/* SECTION 1: WELCOME */}
            <View style={{ marginBottom: 25 }}>
              <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, marginBottom: 10, fontSize: 16 }]}>Welcome to KnoVault</Text>
              <Text style={[dynamicStyles.fullCardBody, { marginBottom: 5 }]}>KnoVault is an all-in-one productivity workspace that helps users organize:</Text>
              <Text style={dynamicStyles.fullCardBody}>• Notes</Text>
              <Text style={dynamicStyles.fullCardBody}>• Projects</Text>
              <Text style={dynamicStyles.fullCardBody}>• Reminders</Text>
              <Text style={dynamicStyles.fullCardBody}>• Daily Goals</Text>
              <Text style={dynamicStyles.fullCardBody}>• Special Days</Text>
              <Text style={dynamicStyles.fullCardBody}>• Personal Knowledge</Text>
              <Text style={[dynamicStyles.fullCardBody, { marginTop: 8 }]}>Designed for students, professionals and creators.</Text>
            </View>

            {/* SECTION 2: FEATURES */}
            <View style={{ marginBottom: 25 }}>
              <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, marginBottom: 15, fontSize: 16 }]}>Features</Text>
              {[
                { title: '📝 Smart Notes', desc: 'Create, edit, categorize and organize notes.' },
                { title: '🎯 Daily Goals', desc: 'Track progress and stay productive.' },
                { title: '🚀 Projects', desc: 'Manage personal and academic projects.' },
                { title: '⏰ Reminders', desc: 'Never miss important tasks.' },
                { title: '📅 Calendar', desc: 'View all events and schedules.' },
                { title: '🎉 Special Days', desc: 'Store birthdays and important occasions.' },
                { title: '☁️ Cloud Storage', desc: 'Automatic cloud sync up to 5 MB.' },
                { title: '🔒 Privacy First', desc: 'Your data remains secure and protected.' }
              ].map(feat => (
                <View key={feat.title} style={[dynamicStyles.fullModalCard]}>
                  <Text style={[dynamicStyles.fullCardTitle, { color: theme.text }]}>{feat.title}</Text>
                  <Text style={dynamicStyles.fullCardBody}>{feat.desc}</Text>
                </View>
              ))}
            </View>

            {/* SECTION 3: HOW TO USE */}
            <View style={{ marginBottom: 25 }}>
              <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, marginBottom: 15, fontSize: 16 }]}>How to Use</Text>
              {[
                { step: '1️⃣ Create Notes', desc: 'Use the Notes tab to capture ideas.' },
                { step: '2️⃣ Set Goals', desc: 'Track your daily productivity.' },
                { step: '3️⃣ Create Projects', desc: 'Organize long-term work.' },
                { step: '4️⃣ Add Reminders', desc: 'Get notified on time.' },
                { step: '5️⃣ Monitor Progress', desc: 'Review statistics and achievements.' }
              ].map(item => (
                <View key={item.step} style={{ marginBottom: 10 }}>
                  <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, fontSize: 13 }]}>{item.step}</Text>
                  <Text style={dynamicStyles.fullCardBody}>{item.desc}</Text>
                </View>
              ))}
            </View>

            {/* SECTION 4: DATA STORAGE */}
            <View style={{ marginBottom: 25 }}>
              <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, marginBottom: 10, fontSize: 16 }]}>Data Storage</Text>
              <View style={[dynamicStyles.fullModalCard, { borderColor: accentColor, borderWidth: 1 }]}>
                <Text style={[dynamicStyles.fullCardTitle, { color: theme.text }]}>Cloud Storage Limit: 5 MB</Text>
                <Text style={[dynamicStyles.fullCardBody, { marginTop: 8 }]}>When cloud storage reaches 5 MB:</Text>
                <Text style={dynamicStyles.fullCardBody}>• New data automatically switches to local storage.</Text>
                <Text style={dynamicStyles.fullCardBody}>• No data is deleted.</Text>
              </View>
            </View>

            {/* SECTION 5: PRIVACY & SECURITY */}
            <View style={{ marginBottom: 25 }}>
              <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, marginBottom: 10, fontSize: 16 }]}>Privacy & Security</Text>
              <View style={[dynamicStyles.fullModalCard]}>
                <Text style={dynamicStyles.fullCardBody}>• Local-first architecture</Text>
                <Text style={dynamicStyles.fullCardBody}>• Secure storage</Text>
                <Text style={dynamicStyles.fullCardBody}>• User-controlled data</Text>
                <Text style={dynamicStyles.fullCardBody}>• Optional cloud synchronization</Text>
                <Text style={dynamicStyles.fullCardBody}>• Data ownership remains with the user</Text>
              </View>
            </View>

            {/* SECTION 6: APP INFORMATION */}
            <View style={{ marginBottom: 25 }}>
              <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, marginBottom: 10, fontSize: 16 }]}>App Information</Text>
              <View style={[dynamicStyles.fullModalCard]}>
                <Text style={dynamicStyles.fullCardBody}><Text style={{ fontWeight: 'bold' }}>App Name:</Text> KnoVault</Text>
                <Text style={dynamicStyles.fullCardBody}><Text style={{ fontWeight: 'bold' }}>Version:</Text> 1.2.5</Text>
                <Text style={dynamicStyles.fullCardBody}><Text style={{ fontWeight: 'bold' }}>Developer:</Text> Dhuneshwaran</Text>
                <Text style={dynamicStyles.fullCardBody}><Text style={{ fontWeight: 'bold' }}>Institution:</Text> Saveetha School of Engineering</Text>
                <Text style={dynamicStyles.fullCardBody}><Text style={{ fontWeight: 'bold' }}>Department:</Text> Artificial Intelligence & Data Science</Text>
                <Text style={dynamicStyles.fullCardBody}><Text style={{ fontWeight: 'bold' }}>Support Email:</Text> thinkgood24hrs@gmail.com</Text>
              </View>
            </View>

            {/* SECTION 7: QUICK TIPS */}
            <View style={{ marginBottom: 30 }}>
              <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, marginBottom: 10, fontSize: 16 }]}>Quick Tips</Text>
              <Text style={dynamicStyles.fullCardBody}>💡 Use categories to organize notes.</Text>
              <Text style={dynamicStyles.fullCardBody}>💡 Create daily goals every morning.</Text>
              <Text style={dynamicStyles.fullCardBody}>💡 Use reminders for deadlines.</Text>
              <Text style={dynamicStyles.fullCardBody}>💡 Review projects weekly.</Text>
              <Text style={dynamicStyles.fullCardBody}>💡 Keep cloud usage below 5 MB.</Text>
            </View>

            {/* SECTION 8: THANK YOU */}
            <View style={{ alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: 20, borderRadius: 16 }}>
              <Ionicons name="heart" size={32} color="#EF4444" style={{ marginBottom: 10 }} />
              <Text style={[dynamicStyles.fullCardTitle, { color: theme.text, textAlign: 'center', marginBottom: 15 }]}>Thank you for using KnoVault ❤️</Text>
              <Text style={[dynamicStyles.fullCardBody, { textAlign: 'center', fontStyle: 'italic', fontWeight: '600' }]}>
                "Organize your knowledge.{'\n'}Achieve your goals.{'\n'}Build your second brain."
              </Text>
            </View>
            
            <TouchableOpacity style={[dynamicStyles.aboutActionBtn, { backgroundColor: accentColor, marginTop: 30 }]} onPress={() => setAboutModal(false)}>
              <Text style={dynamicStyles.aboutActionText}>Close About Page</Text>
            </TouchableOpacity>

          </ScrollView>
        </ScreenContainer>
      </Modal>

      {/* Custom Full Screen Privacy Center Modal */}
      <Modal visible={privacyModal} transparent={false} animationType="slide">
        <ScreenContainer style={[dynamicStyles.container, { backgroundColor: theme.background }]}>
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
                { key: 'cloud', title: 'Cloud Sync Privacy', content: 'Optional backup files are encrypted locally before export, ensuring cloud drives only host locked volumes.' },
                { key: 'device', title: 'Device-Only Protection', content: 'Keys reside inside secure enclaves on iOS/Android chips, inaccessible to external networks.' },
                { key: 'backup', title: 'Backup Security', content: 'Workspace exports map to standardized, parseable JSON files, allowing you to delete your workspace at any time.' }
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
                      <Animated.View entering={getFadeIn(0, 200)}>
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
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
    </SwipeWrapper>
  );
}

// Reusable Stat Card Component
function StatCard({ label, value, subtitle, icon, color, theme, isDark, isTextValue }: any) {
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(124, 77, 255, 0.08)';
  return (
    <View style={[statCardStyles(theme, color).statCard, { borderColor: cardBorder }]}>
      <View style={[statCardStyles(theme, color).statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[statCardStyles(theme, color).statValue, isTextValue && { fontSize: 16 }]} numberOfLines={1}>{value}</Text>
      <Text style={statCardStyles(theme, color).statLabel}>{label}</Text>
      {subtitle && <Text style={[statCardStyles(theme, color).statLabel, { marginTop: 2, fontSize: 10, fontWeight: '700', color: theme.text }]}>{subtitle}</Text>}
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
    borderWidth: 1.2, 
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { ...typography.titleSmall, fontWeight: '800', color: theme.text },
  statLabel: { ...typography.caption, color: theme.textSecondary },
});



const styles = (theme: any, isDark: boolean, colors: any, accentColor: string) => {
  const cardRadius = 24;
  const transparentCard = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  const cardFlat = {
    backgroundColor: theme.card || transparentCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: borderCol,
    shadowOpacity: 0,
    elevation: 0,
  } as const;

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
      ...cardFlat,
      marginHorizontal: 25,
      marginTop: 20,
      marginBottom: 25,
      padding: 24,
      borderRadius: cardRadius + 6,
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
      ...cardFlat,
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
      ...cardFlat,
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
      ...cardFlat,
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
      ...cardFlat,
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
      ...cardFlat,
      borderRadius: cardRadius + 4,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      marginBottom: 8,
},
    menuItemCol: {
      ...cardFlat,
      borderRadius: cardRadius + 4,
      padding: 14,
      marginBottom: 8,
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
      ...cardFlat,
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
      ...cardFlat,
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
    modalCard: { backgroundColor: theme.card, borderRadius: 32, padding: 24, borderWidth: 1.2, borderColor: theme.border, },
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
    aboutLogo: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, },
    aboutTitle: { ...typography.displaySmall, fontWeight: '800', color: theme.text, fontSize: 24 },
    aboutVersion: { fontSize: 13, color: theme.textSecondary, marginBottom: 16 },
    aboutDesc: { ...typography.bodyMedium, color: theme.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 22, paddingHorizontal: 10 },
    aboutPrivacy: { fontSize: 10, color: theme.textSecondary, textAlign: 'center', marginBottom: 24, marginTop: 14 },
    aboutActionBtn: { width: '100%', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
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
    },
    notificationCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    notificationHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    notificationDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginLeft: 46,
    },
    notificationChildRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingRight: 16,
      marginLeft: 46,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    notificationChildRowLast: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingRight: 16,
      marginLeft: 46,
    }
  });
};
