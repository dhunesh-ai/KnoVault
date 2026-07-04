import React, { useState, useEffect, useMemo, useRef } from 'react';
import SwipeWrapper from '../../src/components/SwipeWrapper';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Modal, TextInput, ActivityIndicator, Platform,
  BackHandler, TouchableWithoutFeedback, Dimensions, Linking, Alert, Share,
  DeviceEventEmitter, AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { logNotificationToHistory } from '../../src/store/notificationStore';
import Animated, { 
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSpring, cancelAnimation, LinearTransition
} from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { getFadeIn, getFadeInUp, getFadeOutUp, getFadeInDown, getFadeOut, getZoomIn, getZoomOut, getLinearTransition } from '../../src/utils/animations';
import { LineChart } from 'react-native-chart-kit';
import { useAuthStore } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithGoogle } from '../../src/utils/firebase';
import { useTheme } from '../../src/hooks/useTheme';
import { notesApi } from '../../src/api/notes';
import { remindersApi } from '../../src/api/reminders';
import { projectsApi } from '../../src/api/projects';
import { importantDaysApi } from '../../src/api/important_days';
import { secureNotesApi, SecureNotesStatus } from '../../src/api/secureNotes';
import { workspacesApi } from '../../src/api/workspaces';
import { filesApi } from '../../src/api/files';
import { supportApi } from '../../src/api/support';
import { typography } from '../../src/theme';
import client from '../../src/api/client';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import { syncWorkspace } from '../../src/services/sync';
import { exportLocalBackup, importLocalBackup, exportLocalBackupAsJson, importLocalBackupFromJson } from '../../src/services/backup';
import ScreenContainer from '../../src/components/ScreenContainer';

let FileSystem: any = null;
try { FileSystem = require('expo-file-system/legacy'); } catch {}
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
  const [secureNotesExpanded, setSecureNotesExpanded] = useState(false);
  const [cloudFullModalVisible, setCloudFullModalVisible] = useState(false);

  // Personalization settings
  const [accentColor, setAccentColor] = useState('#7C4DFF');

  // Security & Notification settings
  const { 
    animationsEnabled, setAnimationsEnabled, 
    notificationsEnabled, notificationReminders, notificationGoals, 
    notificationDailySummary, notificationSound, notificationVibration,
    toggleNotificationSetting, microphoneAccessEnabled, setMicrophoneAccessEnabled,
    storageMode, googleDriveConnected, lastDriveSync
  } = useSettingsStore();

  const [privacyPolicyVisible, setPrivacyPolicyVisible] = useState(false);

  // Fetch Storage stats for Security Status card
  const { data: storageStats } = useQuery({
    queryKey: ['profileStorage'],
    queryFn: async () => {
      const r = await client.get('/api/profile/storage');
      return r.data;
    },
    refetchOnWindowFocus: true,
  });

  // Refs & state for auto-scroll and microphone setting highlight
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionYRef = useRef(0);
  const micItemYRef = useRef(0);
  const [shouldHighlightMic, setShouldHighlightMic] = useState(false);
  const { scrollTo } = useLocalSearchParams<{ scrollTo?: string }>();
  
  const [passcodeModal, setPasscodeModal] = useState<{ visible: boolean, mode: 'create' | 'change' | 'verify' }>({ visible: false, mode: 'create' });
  const [passcodeStep, setPasscodeStep] = useState(1);
  const [passcodeInput, setPasscodeInput] = useState('');
  
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);
  const [micPermissionDetails, setMicPermissionDetails] = useState<{ status: string; canAskAgain: boolean | null }>({
    status: 'undetermined',
    canAskAgain: true,
  });

  const checkPermissions = async () => {
    try {
      const Notifications = require('expo-notifications');
      const notifPerm = await Notifications.getPermissionsAsync();
      setNotificationPermissionGranted(notifPerm.status === 'granted');
      
      const micPerm = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      const isGranted = !!(micPerm.granted || micPerm.status === 'granted');
      setMicrophonePermissionGranted(isGranted);
      setMicPermissionDetails({
        status: micPerm.status || 'undetermined',
        canAskAgain: micPerm.canAskAgain !== undefined ? micPerm.canAskAgain : true
      });

      // Keep toggle state in sync with OS permission status
      const storeState = useSettingsStore.getState();
      if (isGranted && !storeState.microphoneAccessEnabled) {
        await storeState.setMicrophoneAccessEnabled(true);
      } else if (!isGranted && storeState.microphoneAccessEnabled) {
        await storeState.setMicrophoneAccessEnabled(false);
      }
    } catch (e) {
      console.warn('[ProfileScreen] checkPermissions error:', e);
    }
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkPermissions();
    }, [])
  );

  // Secure Notes Security states using React Query
  const { data: snStatus, refetch: refetchSnStatus } = useQuery<SecureNotesStatus>({
    queryKey: ['secureNotesStatus'],
    queryFn: () => secureNotesApi.getStatus(),
  });
  const [snModal, setSnModal] = useState<{ visible: boolean; mode: 'set' | 'change' | 'disable' | 'forgot_otp' | 'reset' }>({ visible: false, mode: 'set' });
  const [snCurrentPassword, setSnCurrentPassword] = useState('');
  const [snPassword, setSnPassword] = useState('');
  const [snConfirmPassword, setSnConfirmPassword] = useState('');
  const [snOtpCode, setSnOtpCode] = useState('');
  const [snError, setSnError] = useState('');
  const [snLoading, setSnLoading] = useState(false);
  const [snShowPassword, setSnShowPassword] = useState(false);
  const [snShowNewPassword, setSnShowNewPassword] = useState(false);
  const [snShowConfirmPassword, setSnShowConfirmPassword] = useState(false);

  // Random quote
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);

  // Privacy collapsible states
  const [privacyExpanded, setPrivacyExpanded] = useState<Record<string, boolean>>({
    'own': false,
    'cloud': false,
    'local': false,
    'secure_notes': false,
    'encryption': false,
    'backup': false,
    'practices': false,
  });
  
  // Dynamic Security Score
  const securityScore = useMemo(() => {
    let score = 0;
    if (user?.is_verified) score += 25;
    if (snStatus?.is_password_set) score += 25;
    if (googleDriveConnected) score += 25;
    if (storageMode) score += 25;
    return score;
  }, [user?.is_verified, snStatus?.is_password_set, googleDriveConnected, storageMode]);

  const [storageInfoExpanded, setStorageInfoExpanded] = useState(false);
  const [localDbSize, setLocalDbSize] = useState(0);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const fetchLocalDbSize = async () => {
      try {
        if (FileSystem) {
          const dbPath = `${FileSystem.documentDirectory}SQLite/knovault.db`;
          const dbInfo = await FileSystem.getInfoAsync(dbPath);
          if (dbInfo && dbInfo.exists) {
            setLocalDbSize(dbInfo.size || 0);
          }
        }
      } catch (e) {
        console.warn('[Profile] Failed to fetch local db size:', e);
      }
    };
    fetchLocalDbSize();
  }, []);

  const cloudUsedBytes = storageStats?.used_bytes ?? 0;
  const cloudLimitBytes = storageStats?.limit_bytes ?? (5 * 1024 * 1024);
  const cloudProgress = Math.min(1, cloudUsedBytes / cloudLimitBytes);
  const cloudPercent = Math.round(cloudProgress * 100);

  const getStorageModeInfo = (mode: string) => {
    switch (mode) {
      case 'local':
        return {
          title: '📱 Local Device Storage',
          desc: 'All new data is stored securely on this device.',
        };
      case 'cloud_gdrive':
        return {
          title: '☁️ Cloud + Google Drive',
          desc: 'Data is synchronized with Neon Cloud and backed up to Google Drive.',
        };
      case 'gdrive':
        return {
          title: '📂 Google Drive Only',
          desc: 'All data is stored directly inside your Google Drive.',
        };
      case 'cloud_local':
        return {
          title: '☁️ Cloud + Local Strategy',
          desc: 'Data is synchronized with Neon Cloud with local device backup caching.',
        };
      case 'cloud':
      default:
        return {
          title: '☁️ Neon Cloud Storage',
          desc: 'Your notes are securely stored in KnoVault Cloud and automatically synchronized across your devices.',
        };
    }
  };

  // Support & Feedback states
  const [rateAppModal, setRateAppModal] = useState(false);
  const [bugReportModal, setBugReportModal] = useState(false);
  const [featureRequestModal, setFeatureRequestModal] = useState(false);
  const [submittingBug, setSubmittingBug] = useState(false);
  const [submittingFeature, setSubmittingFeature] = useState(false);

  // Custom Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | 'info'>('success');

  // Bug Report Form states
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSteps, setBugSteps] = useState('');
  const [bugScreenshotUri, setBugScreenshotUri] = useState<string | null>(null);
  const [bugScreenshotName, setBugScreenshotName] = useState<string | null>(null);
  const [bugScreenshotType, setBugScreenshotType] = useState<string | null>(null);

  // Feature Suggestion Form states
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [featureBenefit, setFeatureBenefit] = useState('');
  const [featurePriority, setFeaturePriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
    setTimeout(() => {
      setSnackbarVisible(false);
    }, 3500);
  };


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

  const { data: workspaces, isLoading: loadingWorkspaces } = useQuery({ 
    queryKey: ['workspaces'], 
    queryFn: () => workspacesApi.getWorkspaces() 
  });

  const handleSelectScreenshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showSnackbar('Storage permission is required to upload screenshots.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setBugScreenshotUri(asset.uri);
        setBugScreenshotName(asset.fileName || 'screenshot.jpg');
        setBugScreenshotType(asset.mimeType || 'image/jpeg');
        showSnackbar('Screenshot selected successfully!', 'success');
      }
    } catch (e) {
      showSnackbar('Failed to select screenshot.', 'error');
    }
  };

  const handleShareApp = async () => {
    try {
      triggerHaptic();
      await Share.share({
        message: "I'm using KnoVault – a powerful personal knowledge management app for Notes, Projects, Goals, Reminders, Calendar, Secure Notes and AI Productivity.\nDownload it soon!",
      });
    } catch (error) {
      showSnackbar("Failed to open share menu.", 'error');
    }
  };

  const handleContact = async () => {
    try {
      triggerHaptic();
      const url = "mailto:thinkgood24hrs@gmail.com?subject=KnoVault Support&body=Hello KnoVault Team,\n\nI need help regarding...";
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showSnackbar("No email client installed. Please email thinkgood24hrs@gmail.com manually.", "info");
      }
    } catch (e) {
      showSnackbar("No email client installed. Please email thinkgood24hrs@gmail.com manually.", "info");
    }
  };

  const handleSubmitBugReport = async () => {
    if (!bugTitle.trim() || !bugDescription.trim() || !bugSteps.trim()) {
      showSnackbar('Please fill in all fields.', 'error');
      return;
    }
    try {
      triggerHaptic();
      setSubmittingBug(true);

      let screenshotUrl: string | null = null;
      if (bugScreenshotUri) {
        const uploadRes = await filesApi.uploadImage(
          bugScreenshotUri, 
          bugScreenshotType || 'image/jpeg', 
          bugScreenshotName || 'screenshot.jpg'
        );
        screenshotUrl = uploadRes.file_path;
      }

      const deviceInfo = `OS: ${Platform.OS} ${Platform.Version}, Model: ${Constants.deviceName || 'Unknown Device'}`;
      const appVersion = '1.2.5';

      await supportApi.submitBugReport({
        title: bugTitle,
        description: bugDescription,
        steps_to_reproduce: bugSteps,
        screenshot_url: screenshotUrl,
        device_info: deviceInfo,
        app_version: appVersion,
      });

      showSnackbar('Thank you! Your bug report has been submitted.', 'success');
      setBugTitle('');
      setBugDescription('');
      setBugSteps('');
      setBugScreenshotUri(null);
      setBugScreenshotName(null);
      setBugScreenshotType(null);
      setBugReportModal(false);
    } catch (e) {
      showSnackbar('Failed to submit bug report. Please try again.', 'error');
    } finally {
      setSubmittingBug(false);
    }
  };

  const handleSubmitFeatureSuggestion = async () => {
    if (!featureTitle.trim() || !featureDescription.trim() || !featureBenefit.trim()) {
      showSnackbar('Please fill in all fields.', 'error');
      return;
    }
    try {
      triggerHaptic();
      setSubmittingFeature(true);

      await supportApi.submitFeatureSuggestion({
        title: featureTitle,
        description: featureDescription,
        expected_benefit: featureBenefit,
        priority: featurePriority,
      });

      showSnackbar('Thank you for your suggestion.', 'success');
      setFeatureTitle('');
      setFeatureDescription('');
      setFeatureBenefit('');
      setFeaturePriority('Medium');
      setFeatureRequestModal(false);
    } catch (e) {
      showSnackbar('Failed to submit suggestion. Please try again.', 'error');
    } finally {
      setSubmittingFeature(false);
    }
  };

  // Quick Storage Handlers
  const handleExportBackup = async () => {
    try {
      triggerHaptic();
      showSnackbar('Exporting backup...', 'info');
      const res = await exportLocalBackupAsJson();
      if (res.success) {
        showSnackbar(`Backup exported: ${res.filename}`, 'success');
      } else if (res.error) {
        showSnackbar(`Export failed: ${res.error}`, 'error');
      }
    } catch (e) {
      showSnackbar('Backup export failed.', 'error');
    }
  };

  const handleImportBackup = async () => {
    triggerHaptic();
    Alert.alert(
      'Import Backup',
      'This will OVERWRITE your local database. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            try {
              showSnackbar('Importing backup...', 'info');
              const res = await importLocalBackupFromJson();
              if (res.success) {
                showSnackbar('Backup restored successfully!', 'success');
                qc.invalidateQueries();
              } else if (res.error) {
                showSnackbar(`Import failed: ${res.error}`, 'error');
              }
            } catch (e) {
              showSnackbar('Backup import failed.', 'error');
            }
          }
        }
      ]
    );
  };

  const handleCleanCache = async () => {
    try {
      triggerHaptic();
      showSnackbar('Cleaning cache...', 'info');
      if (FileSystem && FileSystem.cacheDirectory) {
        const cacheDir = FileSystem.cacheDirectory;
        const files = await FileSystem.readDirectoryAsync(cacheDir);
        let deletedCount = 0;
        for (const file of files) {
          await FileSystem.deleteAsync(cacheDir + file, { idempotent: true });
          deletedCount++;
        }
        showSnackbar(`Cleared ${deletedCount} cached files.`, 'success');
      } else {
        showSnackbar('Cache is already clean.', 'success');
      }
    } catch (e) {
      showSnackbar('Failed to clean local cache.', 'error');
    }
  };

  const handleRefreshStorage = async () => {
    try {
      triggerHaptic();
      showSnackbar('Refreshing storage stats...', 'info');
      await qc.refetchQueries({ queryKey: ['profileStorage'] });
      if (FileSystem) {
        const dbPath = `${FileSystem.documentDirectory}SQLite/knovault.db`;
        const dbInfo = await FileSystem.getInfoAsync(dbPath);
        if (dbInfo && dbInfo.exists) {
          setLocalDbSize(dbInfo.size || 0);
        }
      }
      showSnackbar('Storage stats refreshed!', 'success');
    } catch (e) {
      showSnackbar('Refresh failed.', 'error');
    }
  };

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

  const fetchSnStatus = async () => {
    try {
      await qc.invalidateQueries({ queryKey: ['secureNotesStatus'] });
      await refetchSnStatus();
    } catch (e) {
      console.log('Error fetching secure notes status:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchSnStatus();
    }, [refetchSnStatus])
  );

  const handleSnAction = async () => {
    setSnError('');
    setSnLoading(true);
    try {
      if (snModal.mode === 'set') {
        if (snPassword.length < 6 || snPassword.length > 32) {
          throw new Error('Password must be between 6 and 32 characters');
        }
        if (snPassword !== snConfirmPassword) {
          throw new Error('Passwords do not match');
        }
        await secureNotesApi.setPassword(snPassword);
        showToast('Secure Password set successfully', 'success');
        setSnModal({ visible: false, mode: 'set' });
        await fetchSnStatus();
        logNotificationToHistory(
          '🛡️ Secure Protection Enabled',
          'Secure notes protection has been enabled with a secure password.',
          'security',
          { type: 'security' }
        );
      } else if (snModal.mode === 'change') {
        if (snPassword.length < 6 || snPassword.length > 32) {
          throw new Error('Password must be between 6 and 32 characters');
        }
        if (snPassword !== snConfirmPassword) {
          throw new Error('Passwords do not match');
        }
        await secureNotesApi.changePassword(snCurrentPassword, snPassword);
        showToast('Secure Password updated successfully', 'success');
        setSnModal({ visible: false, mode: 'set' });
        await fetchSnStatus();
        logNotificationToHistory(
          '🔒 Secure Password Changed',
          'Your Secure Notes password has been updated successfully.',
          'security',
          { type: 'security' }
        );
      } else if (snModal.mode === 'disable') {
        await secureNotesApi.disableProtection(snCurrentPassword);
        showToast('Secure Protection disabled successfully', 'success');
        setSnModal({ visible: false, mode: 'set' });
        await fetchSnStatus();
        logNotificationToHistory(
          '⚠️ Secure Protection Disabled',
          'Secure notes protection has been disabled. Your notes are no longer protected.',
          'security',
          { type: 'security' }
        );
      } else if (snModal.mode === 'forgot_otp') {
        if (snOtpCode.length !== 6) {
          throw new Error('Enter a valid 6-digit OTP code');
        }
        await secureNotesApi.verifyResetOtp(snOtpCode);
        setSnModal({ visible: true, mode: 'reset' });
        setSnPassword('');
        setSnConfirmPassword('');
      } else if (snModal.mode === 'reset') {
        if (snPassword.length < 6 || snPassword.length > 32) {
          throw new Error('Password must be between 6 and 32 characters');
        }
        if (snPassword !== snConfirmPassword) {
          throw new Error('Passwords do not match');
        }
        await secureNotesApi.resetPassword(snOtpCode, snPassword);
        showToast('Secure Password reset successfully', 'success');
        setSnModal({ visible: false, mode: 'set' });
        await fetchSnStatus();
        logNotificationToHistory(
          '🔑 Secure Password Reset',
          'Your Secure Notes password has been reset successfully using OTP.',
          'security',
          { type: 'security' }
        );
      }
    } catch (err: any) {
      setSnError(err.response?.data?.detail || err.message || 'Operation failed');
    } finally {
      setSnLoading(false);
    }
  };

  const startSnForgotPassword = async () => {
    setSnError('');
    setSnLoading(true);
    try {
      await secureNotesApi.sendResetOtp();
      setSnModal({ visible: true, mode: 'forgot_otp' });
      setSnOtpCode('');
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Failed to send reset OTP', 'error');
    } finally {
      setSnLoading(false);
    }
  };
  // Back handler for modals
  useEffect(() => {
    const onBackPress = () => {
      if (snModal.visible) { setSnModal(prev => ({ ...prev, visible: false })); return true; }
      if (aboutModal) { setAboutModal(false); return true; }
      if (editModal) { setEditModal(false); return true; }
      if (privacyModal) { setPrivacyModal(false); return true; }
      if (avatarModal) { setAvatarModal(false); return true; }
      if (signOutModal) { setSignOutModal(false); return true; }
      if (cloudFullModalVisible) { setCloudFullModalVisible(false); return true; }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [aboutModal, editModal, privacyModal, avatarModal, signOutModal, cloudFullModalVisible]);

  // Quota and cloud-full listener
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('CLOUD_STORAGE_FULL_TRIGGER', () => {
      setCloudFullModalVisible(true);
    });
    return () => sub.remove();
  }, []);

  const handleConnectDriveFromModal = async () => {
    try {
      setCloudFullModalVisible(false);
      const user = await signInWithGoogle();
      if (user) {
        const { accessToken } = await GoogleSignin.getTokens();
        await useSettingsStore.getState().setGoogleDriveAccessToken(accessToken);
        await useSettingsStore.getState().setGoogleDriveConnected(true);
        await useSettingsStore.getState().setStorageMode('cloud_gdrive');
        Alert.alert('Connected', 'Secondary backups will now route to your Google Drive!');
      }
    } catch (err: any) {
      Alert.alert('Connection Failed', err.message || 'Could not connect to Google Drive.');
    }
  };

  const handleSwitchToLocalOnly = async () => {
    setCloudFullModalVisible(false);
    await useSettingsStore.getState().setStorageMode('local');
    Alert.alert('Updated', 'Storage mode switched to Local Storage Only.');
  };

  // Auto-scroll and highlight Microphone setting when scrollTo parameter is present
  useEffect(() => {
    if (scrollTo === 'microphone') {
      const timer = setTimeout(() => {
        if (scrollViewRef.current) {
          // Calculate absolute y position relative to ScrollView container
          const targetY = sectionYRef.current + micItemYRef.current;
          // Offset slightly so the card is not at the very top edge of the screen
          const scrollY = Math.max(0, targetY - 20);

          scrollViewRef.current.scrollTo({
            y: scrollY,
            animated: true,
          });

          // Highlight the card for 2 seconds (using a pulse / glow effect)
          setShouldHighlightMic(true);
          const highlightTimer = setTimeout(() => {
            setShouldHighlightMic(false);
          }, 2000);

          return () => clearTimeout(highlightTimer);
        }
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [scrollTo]);

  // Randomize quote on mount
  useEffect(() => {
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  }, []);

  // Shared Animation Values
  const avatarScale = useSharedValue(1);
  const skeletonOpacity = useSharedValue(0.4);
  const orbTranslateY = useSharedValue(0);
  const arrowRotation = useSharedValue(0);
  const snArrowRotation = useSharedValue(0);

  useEffect(() => {
    arrowRotation.value = animationsEnabled ? withTiming(isNotifExpanded ? 180 : 0, { duration: 300 }) : (isNotifExpanded ? 180 : 0);
  }, [isNotifExpanded, animationsEnabled]);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }]
  }));

  useEffect(() => {
    snArrowRotation.value = animationsEnabled ? withTiming(secureNotesExpanded ? 180 : 0, { duration: 250 }) : (secureNotesExpanded ? 180 : 0);
  }, [secureNotesExpanded, animationsEnabled]);

  const animatedSnArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${snArrowRotation.value}deg` }]
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

  // About Page Animations
  const aboutLogoRotation = useSharedValue(0);
  const aboutLogoScale = useSharedValue(1);
  const aboutOrb1X = useSharedValue(0);
  const aboutOrb1Y = useSharedValue(0);
  const aboutOrb2X = useSharedValue(0);
  const aboutOrb2Y = useSharedValue(0);
  const heartScale = useSharedValue(1);
  const { withSequence } = require('react-native-reanimated');

  useEffect(() => {
    if (aboutModal) {
      aboutLogoRotation.value = withRepeat(
        withTiming(360, { duration: 12000, easing: Easing.linear }),
        -1,
        false
      );
      aboutLogoScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      heartScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      aboutOrb1X.value = withRepeat(
        withSequence(
          withTiming(20, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-10, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      aboutOrb1Y.value = withRepeat(
        withSequence(
          withTiming(-15, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
          withTiming(15, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      aboutOrb2X.value = withRepeat(
        withSequence(
          withTiming(-25, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
          withTiming(15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      aboutOrb2Y.value = withRepeat(
        withSequence(
          withTiming(20, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-20, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(aboutLogoRotation);
      cancelAnimation(aboutLogoScale);
      cancelAnimation(aboutOrb1X);
      cancelAnimation(aboutOrb1Y);
      cancelAnimation(aboutOrb2X);
      cancelAnimation(aboutOrb2Y);
      cancelAnimation(heartScale);
      aboutLogoRotation.value = 0;
      aboutLogoScale.value = 1;
      aboutOrb1X.value = 0;
      aboutOrb1Y.value = 0;
      aboutOrb2X.value = 0;
      aboutOrb2Y.value = 0;
      heartScale.value = 1;
    }
  }, [aboutModal]);

  const animatedAboutLogoStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${aboutLogoRotation.value}deg` },
      { scale: aboutLogoScale.value }
    ],
  }));

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }]
  }));

  const animatedAboutOrb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: aboutOrb1X.value },
      { translateY: aboutOrb1Y.value }
    ]
  }));

  const animatedAboutOrb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: aboutOrb2X.value },
      { translateY: aboutOrb2Y.value }
    ]
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
  const handleMicrophoneToggle = async () => {
    triggerHaptic();
    const micPerm = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    const isGranted = !!(micPerm.granted || micPerm.status === 'granted');
    
    if (isGranted) {
      // Toggle store configuration
      const targetState = !microphoneAccessEnabled;
      await setMicrophoneAccessEnabled(targetState);
      showToast(targetState ? 'Microphone access enabled' : 'Microphone access disabled', 'info');
    } else {
      // If permanently denied, prompt user to go to settings
      const isPermanentlyDenied = micPerm.status === 'denied' && micPerm.canAskAgain === false;
      if (isPermanentlyDenied) {
        showToast('Please enable microphone access in settings', 'info');
        Linking.openSettings();
      } else {
        // Request the permission
        try {
          const isAvailable = ExpoSpeechRecognitionModule.isRecognitionAvailable();
          if (!isAvailable) {
            showToast('Speech recognition not available on this device', 'error');
            return;
          }
          const req = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (req.granted || req.status === 'granted') {
            await setMicrophoneAccessEnabled(true);
            showToast('Microphone access enabled', 'success');
          } else {
            await setMicrophoneAccessEnabled(false);
            showToast('Microphone permission denied', 'error');
          }
        } catch (e) {
          showToast('Failed to request microphone permission', 'error');
        }
      }
    }
    await checkPermissions();
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

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scroll}>
        
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
        <View 
          style={dynamicStyles.section}
          onLayout={(e) => {
            sectionYRef.current = e.nativeEvent.layout.y;
          }}
        >
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

          <TouchableOpacity 
            activeOpacity={0.95}
            onPress={handleMicrophoneToggle}
            style={[
              dynamicStyles.menuItemCol,
              shouldHighlightMic && {
                borderColor: accentColor || '#7C4DFF',
                borderWidth: 1.5,
                shadowColor: accentColor || '#7C4DFF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 10,
                elevation: 6,
                backgroundColor: isDark ? 'rgba(124, 77, 255, 0.15)' : 'rgba(124, 77, 255, 0.08)'
              }
            ]}
            onLayout={(e) => {
              micItemYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={dynamicStyles.menuItemRow}>
              <View style={[dynamicStyles.iconBox, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="mic-outline" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={dynamicStyles.menuText}>Microphone Access</Text>
                <Text style={[typography.caption, { color: theme.textSecondary }]}>Required for Voice Notes, STT, and AI Assistant</Text>
                <Text style={[
                  typography.caption, 
                  { 
                    color: microphonePermissionGranted ? '#10B981' : '#EF4444', 
                    marginTop: 2, 
                    fontWeight: '600' 
                  }
                ]}>
                  Permission: {microphonePermissionGranted ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <Switch
                value={microphoneAccessEnabled}
                onValueChange={handleMicrophoneToggle}
                trackColor={{ false: theme.border, true: accentColor }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Expandable Permission Panel */}
            {!microphonePermissionGranted && (
              <Animated.View entering={getFadeInDown(0, 300)} style={dynamicStyles.permPanel}>
                {micPermissionDetails.status === 'denied' && micPermissionDetails.canAskAgain === false ? (
                  // Permanently Denied State
                  <View style={[dynamicStyles.permBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.06)' }]}>
                    <Ionicons name="warning-outline" size={18} color="#EF4444" style={{ marginRight: 8, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[dynamicStyles.permBannerTitle, { color: '#EF4444' }]}>Permission Permanently Disabled</Text>
                      <Text style={[dynamicStyles.permBannerText, { color: theme.textSecondary }]}>
                        Microphone access has been disabled in your device settings. Enable it to use voice features.
                      </Text>
                      <TouchableOpacity 
                        style={[dynamicStyles.permButton, { backgroundColor: accentColor }]}
                        onPress={() => {
                          triggerHaptic();
                          Linking.openSettings();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={dynamicStyles.permButtonText}>Open App Settings</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // Denied / Undetermined State
                  <View style={[dynamicStyles.permBanner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.06)' }]}>
                    <Ionicons name="information-circle-outline" size={18} color="#F59E0B" style={{ marginRight: 8, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[dynamicStyles.permBannerTitle, { color: '#F59E0B' }]}>Permission: Disabled</Text>
                      <Text style={[dynamicStyles.permBannerText, { color: theme.textSecondary }]}>
                        Microphone access is required for Voice Notes, Speech-to-Text, and AI Voice Assistant.
                      </Text>
                      <TouchableOpacity 
                        style={[dynamicStyles.permButton, { backgroundColor: accentColor }]}
                        onPress={handleMicrophoneToggle}
                        activeOpacity={0.8}
                      >
                        <Text style={dynamicStyles.permButtonText}>Grant Permission</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Animated.View>
            )}
          </TouchableOpacity>
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
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={dynamicStyles.menuText}>Master Notifications</Text>
                <Text style={[typography.caption, { color: notificationPermissionGranted ? '#10B981' : '#EF4444', marginTop: 2, fontWeight: '600' }]}>Permission: {notificationPermissionGranted ? 'Enabled' : 'Disabled'}</Text>
              </View>
              
              <Switch
                value={notificationsEnabled}
                onValueChange={async (val) => { triggerHaptic(); await toggleNotificationSetting('notificationsEnabled', 'knovault_notifications', val); await checkPermissions(); }}
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
          
          <View style={{ marginBottom: 15 }}>
            <Animated.View layout={getLinearTransition()} style={dynamicStyles.notificationCard}>
              <TouchableOpacity 
                style={[dynamicStyles.notificationHeaderRow, { paddingVertical: 14, paddingHorizontal: 16 }]} 
                onPress={() => { triggerHaptic(); setSecureNotesExpanded(!secureNotesExpanded); }}
                activeOpacity={0.7}
              >
                <Text style={[dynamicStyles.menuText, { fontWeight: '700', flex: 1 }]}>🔒 Secure Notes Security</Text>
                <Animated.View style={animatedSnArrowStyle}>
                  <Ionicons name="chevron-down-outline" size={20} color={theme.textSecondary} />
                </Animated.View>
              </TouchableOpacity>

              {secureNotesExpanded && (
                <Animated.View entering={getFadeInDown(0, 250)} exiting={getFadeOutUp(250)}>
                  <View style={[dynamicStyles.notificationDivider, { marginLeft: 16 }]} />
                  <View style={{ padding: 16 }}>
                    {snStatus?.is_password_set ? (
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Secure Protection Status</Text>
                          <Text style={[dynamicStyles.menuValue, { color: '#10B981', fontWeight: '700' }]}>Enabled</Text>
                        </View>
                        
                        <View style={[dynamicStyles.notificationDivider, { marginLeft: 0 }]} />

                        <TouchableOpacity 
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
                          onPress={() => {
                            triggerHaptic();
                            setSnCurrentPassword('');
                            setSnPassword('');
                            setSnConfirmPassword('');
                            setSnError('');
                            setSnModal({ visible: true, mode: 'change' });
                          }}
                        >
                          <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Change Secure Password</Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                        </TouchableOpacity>

                        <View style={[dynamicStyles.notificationDivider, { marginLeft: 0 }]} />

                        <TouchableOpacity 
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
                          onPress={() => {
                            triggerHaptic();
                            startSnForgotPassword();
                          }}
                        >
                          <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Forgot Secure Password</Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                        </TouchableOpacity>

                        <View style={[dynamicStyles.notificationDivider, { marginLeft: 0 }]} />

                        <TouchableOpacity 
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
                          onPress={() => {
                            triggerHaptic();
                            setSnCurrentPassword('');
                            setSnError('');
                            setSnModal({ visible: true, mode: 'disable' });
                          }}
                        >
                          <Text style={[dynamicStyles.menuText, { fontSize: 14, color: '#EF4444' }]}>Disable Secure Protection</Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Secure Protection Status</Text>
                          <Text style={[dynamicStyles.menuValue, { color: '#EF4444', fontWeight: '700' }]}>Disabled</Text>
                        </View>
                        <TouchableOpacity 
                          style={[dynamicStyles.aboutActionBtn, { backgroundColor: accentColor }]}
                          onPress={() => {
                            triggerHaptic();
                            setSnPassword('');
                            setSnConfirmPassword('');
                            setSnError('');
                            setSnModal({ visible: true, mode: 'set' });
                          }}
                        >
                          <Text style={dynamicStyles.aboutActionText}>Enable Secure Protection</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          </View>
        </View>

        {/* ── 10. CLOUD STORAGE ─────────────────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Cloud Storage Dashboard</Text>
          
          {/* Storage Overview Card */}
          <View style={[dynamicStyles.dashboardOverviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={dynamicStyles.dashboardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="cloud-outline" size={24} color={accentColor} style={{ marginRight: 8 }} />
                <Text style={[dynamicStyles.dashboardCardTitle, { color: theme.text }]}>Cloud Storage</Text>
              </View>
              {/* Dynamic Health Status Badge */}
              <View style={[
                dynamicStyles.healthBadge, 
                { 
                  backgroundColor: cloudProgress >= 0.95 
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : cloudProgress >= 0.8 
                    ? 'rgba(245, 158, 11, 0.1)' 
                    : 'rgba(16, 185, 129, 0.1)'
                }
              ]}>
                <Text style={[
                  dynamicStyles.healthBadgeText,
                  { 
                    color: cloudProgress >= 0.95 
                      ? '#EF4444' 
                      : cloudProgress >= 0.8 
                      ? '#F59E0B' 
                      : '#10B981' 
                  }
                ]}>
                  {cloudProgress >= 0.95 ? '🔴 Full' : cloudProgress >= 0.8 ? '🟡 Nearly Full' : '🟢 Healthy'}
                </Text>
              </View>
            </View>

            <View style={{ marginVertical: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[dynamicStyles.dashboardUsageText, { color: theme.textSecondary }]}>
                  Used: {formatBytes(cloudUsedBytes)} / {formatBytes(cloudLimitBytes)}
                </Text>
                <Text style={[dynamicStyles.dashboardUsageText, { color: theme.textSecondary }]}>
                  Available: {formatBytes(Math.max(0, cloudLimitBytes - cloudUsedBytes))}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={{ height: 10, backgroundColor: theme.border, borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
                <View style={{ 
                  height: '100%', 
                  backgroundColor: cloudProgress >= 0.95 ? '#EF4444' : cloudProgress >= 0.8 ? '#F59E0B' : '#10B981', 
                  width: `${cloudProgress * 100}%`, 
                  borderRadius: 5 
                }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[dynamicStyles.dashboardUsageLabel, { color: theme.textSecondary }]}>
                  Cloud Sync Status: <Text style={{ fontWeight: '700', color: user ? '#10B981' : theme.textSecondary }}>{user ? 'Connected' : 'Offline'}</Text>
                </Text>
                <Text style={[dynamicStyles.dashboardPercentText, { 
                  color: cloudProgress >= 0.95 ? '#EF4444' : cloudProgress >= 0.8 ? '#F59E0B' : '#10B981',
                  fontWeight: '800'
                }]}>
                  {cloudPercent}%
                </Text>
              </View>
            </View>
          </View>

          {/* Storage Mode Card */}
          <View style={[dynamicStyles.dashboardModeCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
            <Text style={[dynamicStyles.dashboardCardTitle, { color: theme.text, fontSize: 13, marginBottom: 8 }]}>Active Storage Strategy</Text>
            <View style={dynamicStyles.dashboardModeHeader}>
              <Ionicons 
                name={storageMode === 'local' ? "phone-portrait-outline" : "cloud-done-outline"} 
                size={22} 
                color={accentColor} 
                style={{ marginRight: 10 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={[dynamicStyles.dashboardModeTitle, { color: theme.text }]}>
                  {getStorageModeInfo(storageMode).title}
                </Text>
                <Text style={[dynamicStyles.dashboardModeDesc, { color: theme.textSecondary }]}>
                  {getStorageModeInfo(storageMode).desc}
                </Text>
              </View>
            </View>
          </View>

          {/* How Storage Works Panel */}
          <View style={[dynamicStyles.dashboardModeCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }} 
              onPress={() => { triggerHaptic(); setStorageInfoExpanded(!storageInfoExpanded); }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="help-circle-outline" size={20} color={accentColor} style={{ marginRight: 8 }} />
                <Text style={[dynamicStyles.dashboardCardTitle, { color: theme.text, fontSize: 13 }]}>How Storage Works</Text>
              </View>
              <Ionicons name={storageInfoExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            {storageInfoExpanded && (
              <Animated.View entering={getFadeIn(0, 200)} style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                {[
                  { icon: 'cloud-outline', title: 'Free Cloud Storage', text: 'Every user receives 5 MB of secure cloud storage.' },
                  { icon: 'list-outline', title: 'What counts toward storage?', text: 'Notes, Secure Notes, Projects, Daily Goals, Reminders, Special Days, AI Attachments.' },
                  { icon: 'warning-outline', title: 'When storage reaches 5 MB', text: 'No data is deleted. KnoVault dynamically routes saving locally, directly to Google Drive, or Hybrid.' },
                  { icon: 'sync-outline', title: 'Existing cloud data', text: 'Previously synchronized data remains available.' },
                  { icon: 'phone-portrait-outline', title: 'Offline Support', text: 'Local data stays accessible without internet.' },
                  { icon: 'shield-checkmark-outline', title: 'Security', text: 'All sensitive information remains protected during storage and synchronization.' }
                ].map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' }}>
                    <Ionicons name={item.icon as any} size={16} color={accentColor} style={{ marginRight: 10, marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>{item.title}</Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2, lineHeight: 15 }}>{item.text}</Text>
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>

          {/* Storage Tips Card */}
          <View style={[dynamicStyles.dashboardTipsCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="bulb-outline" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={[dynamicStyles.dashboardCardTitle, { color: theme.text, fontSize: 13 }]}>Storage Tips</Text>
            </View>
            {[
              'Delete unnecessary large attachments.',
              'Export backups regularly.',
              'Connect Google Drive for unlimited personal storage.',
              'Keep cloud storage below 80% for best performance.',
              'Secure Notes use encrypted storage.'
            ].map((tip, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: '#F59E0B', marginRight: 8, fontSize: 14 }}>•</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, flex: 1, lineHeight: 16 }}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Storage Statistics Card */}
          <View style={[dynamicStyles.dashboardStatsCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="bar-chart-outline" size={20} color={accentColor} style={{ marginRight: 8 }} />
              <Text style={[dynamicStyles.dashboardCardTitle, { color: theme.text, fontSize: 13 }]}>Storage Statistics</Text>
            </View>
            <View style={dynamicStyles.statsGridContainer}>
              <View style={dynamicStyles.statsGridCol}>
                <View style={dynamicStyles.statsItem}>
                  <Text style={dynamicStyles.statsLabel}>Notes</Text>
                  <Text style={[dynamicStyles.statsValue, { color: theme.text }]}>{totalNotes}</Text>
                </View>
                <View style={dynamicStyles.statsItem}>
                  <Text style={dynamicStyles.statsLabel}>Projects</Text>
                  <Text style={[dynamicStyles.statsValue, { color: theme.text }]}>{stats?.total_projects || projects?.length || 0}</Text>
                </View>
                <View style={dynamicStyles.statsItem}>
                  <Text style={dynamicStyles.statsLabel}>Goals</Text>
                  <Text style={[dynamicStyles.statsValue, { color: theme.text }]}>{stats?.total_goals || 0}</Text>
                </View>
                <View style={dynamicStyles.statsItem}>
                  <Text style={dynamicStyles.statsLabel}>Reminders</Text>
                  <Text style={[dynamicStyles.statsValue, { color: theme.text }]}>{reminders?.length || 0}</Text>
                </View>
              </View>
              <View style={dynamicStyles.statsGridCol}>
                <View style={dynamicStyles.statsItem}>
                  <Text style={dynamicStyles.statsLabel}>Special Days</Text>
                  <Text style={[dynamicStyles.statsValue, { color: theme.text }]}>{specialDays?.length || 0}</Text>
                </View>
                <View style={dynamicStyles.statsItem}>
                  <Text style={dynamicStyles.statsLabel}>Cloud Size</Text>
                  <Text style={[dynamicStyles.statsValue, { color: theme.text }]}>{formatBytes(cloudUsedBytes)}</Text>
                </View>
                <View style={dynamicStyles.statsItem}>
                  <Text style={dynamicStyles.statsLabel}>Local SQLite</Text>
                  <Text style={[dynamicStyles.statsValue, { color: theme.text }]}>{formatBytes(localDbSize)}</Text>
                </View>
                <View style={dynamicStyles.statsItem}>
                  <Text style={dynamicStyles.statsLabel}>Last Cloud Sync</Text>
                  <Text style={[dynamicStyles.statsValue, { color: theme.text }]}>
                    {lastDriveSync ? new Date(lastDriveSync).toLocaleDateString() : 'Never'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Storage Actions */}
          <View style={[dynamicStyles.dashboardActionsCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
            <Text style={[dynamicStyles.dashboardCardTitle, { color: theme.text, fontSize: 13, marginBottom: 12 }]}>Storage Quick Actions</Text>
            
            <TouchableOpacity 
              style={[dynamicStyles.actionListItem, { borderBottomColor: theme.border }]} 
              onPress={() => { triggerHaptic(); router.push('/storage_settings'); }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={"settings-outline" as any} size={18} color={accentColor} style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>View Storage Details (Settings)</Text>
              </View>
              <Ionicons name={"chevron-forward" as any} size={14} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[dynamicStyles.actionListItem, { borderBottomColor: theme.border }]} 
              onPress={handleExportBackup}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={"download-outline" as any} size={18} color="#10B981" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>Export Backup (JSON)</Text>
              </View>
              <Ionicons name={"chevron-forward" as any} size={14} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[dynamicStyles.actionListItem, { borderBottomColor: theme.border }]} 
              onPress={handleImportBackup}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={"cloud-upload-outline" as any} size={18} color="#F59E0B" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>Import Backup (JSON)</Text>
              </View>
              <Ionicons name={"chevron-forward" as any} size={14} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[dynamicStyles.actionListItem, { borderBottomColor: theme.border }]} 
              onPress={handleCleanCache}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={"trash-outline" as any} size={18} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>Clean Local Cache</Text>
              </View>
              <Ionicons name={"chevron-forward" as any} size={14} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={dynamicStyles.actionListItem} 
              onPress={handleRefreshStorage}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={"refresh-outline" as any} size={18} color="#3B82F6" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>Refresh Storage Usage</Text>
              </View>
              <Ionicons name={"chevron-forward" as any} size={14} color={theme.textSecondary} />
            </TouchableOpacity>
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

      {/* Cloud Storage Full Alert Modal */}
      <Modal visible={cloudFullModalVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setCloudFullModalVisible(false)}>
          <Animated.View entering={getFadeIn()} exiting={getFadeOut()} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={getZoomIn()} exiting={getZoomOut()} style={dynamicStyles.modalCard}>
                <View style={[dynamicStyles.signOutWarnIconBox, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
                </View>
                <Text style={dynamicStyles.modalTitle}>Cloud Storage Limit Reached</Text>
                <Text style={dynamicStyles.signOutDescText}>
                  Your Neon Cloud storage is 100% full (5.0 MB quota). Choose how you would like to proceed with your data:
                </Text>
                
                <View style={{ width: '100%', gap: 10, marginTop: 15 }}>
                  <TouchableOpacity 
                    style={[dynamicStyles.aboutActionBtn, { backgroundColor: accentColor, width: '100%' }]}
                    onPress={handleConnectDriveFromModal}
                  >
                    <Ionicons name="logo-google" size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={dynamicStyles.aboutActionText}>Connect Google Drive Backup</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[dynamicStyles.aboutActionBtn, { backgroundColor: theme.card, borderWidth: 1.2, borderColor: theme.border, width: '100%' }]}
                    onPress={handleSwitchToLocalOnly}
                  >
                    <Ionicons name="phone-portrait-outline" size={16} color={theme.text} style={{ marginRight: 8 }} />
                    <Text style={[dynamicStyles.aboutActionText, { color: theme.text }]}>Switch to Local Only Storage</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[dynamicStyles.aboutActionBtn, { backgroundColor: 'transparent', width: '100%' }]}
                    onPress={() => setCloudFullModalVisible(false)}
                  >
                    <Text style={[dynamicStyles.aboutActionText, { color: theme.textSecondary }]}>Dismiss & Keep Using Cloud</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Secure Notes Settings Modal */}
      <Modal visible={snModal.visible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setSnModal(prev => ({ ...prev, visible: false }))}>
          <Animated.View entering={getFadeIn()} exiting={getFadeOut()} style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={getZoomIn()} exiting={getZoomOut()} style={dynamicStyles.modalCard}>
                <Text style={dynamicStyles.modalTitle}>
                  {snModal.mode === 'set' && '🔒 Set Secure Password'}
                  {snModal.mode === 'change' && '🔒 Change Secure Password'}
                  {snModal.mode === 'disable' && '🔓 Disable Secure Protection'}
                  {snModal.mode === 'forgot_otp' && '🔑 Verify Reset OTP'}
                  {snModal.mode === 'reset' && '🔒 Reset Secure Password'}
                </Text>

                {snError ? (
                  <View style={{ backgroundColor: '#EF444415', padding: 10, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' }}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', flex: 1 }}>{snError}</Text>
                  </View>
                ) : null}

                {snModal.mode === 'set' && (
                  <View style={{ width: '100%' }}>
                    <Text style={[dynamicStyles.modalLabel, { marginBottom: 6 }]}>Create secure password (min 6 chars):</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48 }}>
                      <TextInput
                        style={{ flex: 1, color: theme.text }}
                        value={snPassword}
                        onChangeText={setSnPassword}
                        secureTextEntry={!snShowPassword}
                        placeholder="New Secure Password"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TouchableOpacity onPress={() => setSnShowPassword(!snShowPassword)}>
                        <Ionicons name={snShowPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[dynamicStyles.modalLabel, { marginBottom: 6 }]}>Confirm password:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48 }}>
                      <TextInput
                        style={{ flex: 1, color: theme.text }}
                        value={snConfirmPassword}
                        onChangeText={setSnConfirmPassword}
                        secureTextEntry={!snShowConfirmPassword}
                        placeholder="Confirm Password"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TouchableOpacity onPress={() => setSnShowConfirmPassword(!snShowConfirmPassword)}>
                        <Ionicons name={snShowConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {snModal.mode === 'change' && (
                  <View style={{ width: '100%' }}>
                    <Text style={[dynamicStyles.modalLabel, { marginBottom: 6 }]}>Current Secure Password:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48 }}>
                      <TextInput
                        style={{ flex: 1, color: theme.text }}
                        value={snCurrentPassword}
                        onChangeText={setSnCurrentPassword}
                        secureTextEntry={!snShowPassword}
                        placeholder="Current Secure Password"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TouchableOpacity onPress={() => setSnShowPassword(!snShowPassword)}>
                        <Ionicons name={snShowPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[dynamicStyles.modalLabel, { marginBottom: 6 }]}>New Secure Password (min 6 chars):</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48 }}>
                      <TextInput
                        style={{ flex: 1, color: theme.text }}
                        value={snPassword}
                        onChangeText={setSnPassword}
                        secureTextEntry={!snShowNewPassword}
                        placeholder="New Secure Password"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TouchableOpacity onPress={() => setSnShowNewPassword(!snShowNewPassword)}>
                        <Ionicons name={snShowNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[dynamicStyles.modalLabel, { marginBottom: 6 }]}>Confirm New Password:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48 }}>
                      <TextInput
                        style={{ flex: 1, color: theme.text }}
                        value={snConfirmPassword}
                        onChangeText={setSnConfirmPassword}
                        secureTextEntry={!snShowConfirmPassword}
                        placeholder="Confirm Password"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TouchableOpacity onPress={() => setSnShowConfirmPassword(!snShowConfirmPassword)}>
                        <Ionicons name={snShowConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {snModal.mode === 'disable' && (
                  <View style={{ width: '100%' }}>
                    <Text style={[dynamicStyles.modalLabel, { marginBottom: 6 }]}>Enter Secure Password to disable protection:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48 }}>
                      <TextInput
                        style={{ flex: 1, color: theme.text }}
                        value={snCurrentPassword}
                        onChangeText={setSnCurrentPassword}
                        secureTextEntry={!snShowPassword}
                        placeholder="Secure Password"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TouchableOpacity onPress={() => setSnShowPassword(!snShowPassword)}>
                        <Ionicons name={snShowPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {snModal.mode === 'forgot_otp' && (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <Text style={[dynamicStyles.modalLabel, { textAlign: 'center', marginBottom: 12, lineHeight: 18 }]}>
                      We sent a 6-digit OTP code to your registered email address.
                    </Text>
                    <View style={{ borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48, width: '100%', justifyContent: 'center' }}>
                      <TextInput
                        style={{ color: theme.text, fontSize: 16, textAlign: 'center', letterSpacing: 4, fontWeight: 'bold' }}
                        value={snOtpCode}
                        onChangeText={setSnOtpCode}
                        placeholder="6-Digit OTP"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>
                )}

                {snModal.mode === 'reset' && (
                  <View style={{ width: '100%' }}>
                    <Text style={[dynamicStyles.modalLabel, { marginBottom: 6 }]}>New Secure Password (min 6 chars):</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48 }}>
                      <TextInput
                        style={{ flex: 1, color: theme.text }}
                        value={snPassword}
                        onChangeText={setSnPassword}
                        secureTextEntry={!snShowPassword}
                        placeholder="New Secure Password"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TouchableOpacity onPress={() => setSnShowPassword(!snShowPassword)}>
                        <Ionicons name={snShowPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[dynamicStyles.modalLabel, { marginBottom: 6 }]}>Confirm New Password:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, backgroundColor: theme.background, height: 48 }}>
                      <TextInput
                        style={{ flex: 1, color: theme.text }}
                        value={snConfirmPassword}
                        onChangeText={setSnConfirmPassword}
                        secureTextEntry={!snShowConfirmPassword}
                        placeholder="Confirm Password"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <TouchableOpacity onPress={() => setSnShowConfirmPassword(!snShowConfirmPassword)}>
                        <Ionicons name={snShowConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={dynamicStyles.modalActions}>
                  <TouchableOpacity style={dynamicStyles.modalCancelBtn} onPress={() => setSnModal(prev => ({ ...prev, visible: false }))}>
                    <Text style={dynamicStyles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[dynamicStyles.modalSaveBtn, { backgroundColor: accentColor }]} 
                    onPress={handleSnAction} 
                    disabled={snLoading}
                  >
                    {snLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={dynamicStyles.modalSaveText}>Submit</Text>}
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

          {/* Floating animated glowing circles in background */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View style={[dynamicStyles.aboutOrbLarge, animatedAboutOrb1Style, { backgroundColor: `${accentColor}10` }]} />
            <Animated.View style={[dynamicStyles.aboutOrbSmall, animatedAboutOrb2Style, { backgroundColor: '#3B82F60a' }]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            {/* TOP HERO SECTION */}
            <View style={dynamicStyles.aboutHeroContainer}>
              <Animated.View style={[dynamicStyles.aboutLogoWrapper, animatedAboutLogoStyle]}>
                <LinearGradient colors={[accentColor, '#3B82F6']} style={dynamicStyles.aboutLogoGradient}>
                  <Ionicons name="sparkles" size={42} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <Text style={dynamicStyles.aboutHeroTitle}>KnoVault</Text>
              <Text style={dynamicStyles.aboutHeroTagline}>Your Intelligent Personal Knowledge Hub</Text>

            </View>

            {/* APP OVERVIEW & STATISTICS */}
            <View style={dynamicStyles.aboutSection}>
              <View style={dynamicStyles.aboutSectionCard}>
                <Text style={[dynamicStyles.sectionCardTitle, { color: theme.text }]}>✨ What is KnoVault?</Text>
                <Text style={dynamicStyles.sectionCardBody}>
                  KnoVault is an intelligent productivity workspace that helps organize notes, reminders, projects, goals, calendars and knowledge in one secure place.
                </Text>
              </View>

              <View style={dynamicStyles.aboutStatsGrid}>
                <View style={dynamicStyles.aboutStatsGridCol}>
                  <View style={dynamicStyles.statsMiniCard}>
                    <Ionicons name="document-text-outline" size={20} color="#8B5CF6" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.statsMiniValue}>{totalNotes}</Text>
                      <Text style={dynamicStyles.statsMiniLabel}>Notes</Text>
                    </View>
                  </View>
                  <View style={dynamicStyles.statsMiniCard}>
                    <Ionicons name="folder-open-outline" size={20} color="#3B82F6" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.statsMiniValue}>{stats?.total_projects || projects?.length || 0}</Text>
                      <Text style={dynamicStyles.statsMiniLabel}>Projects</Text>
                    </View>
                  </View>
                  <View style={dynamicStyles.statsMiniCard}>
                    <Ionicons name="people-outline" size={20} color="#14B8A6" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.statsMiniValue}>{workspaces?.length || 0}</Text>
                      <Text style={dynamicStyles.statsMiniLabel}>Workspaces</Text>
                    </View>
                  </View>
                </View>
                
                <View style={dynamicStyles.aboutStatsGridCol}>
                  <View style={dynamicStyles.statsMiniCard}>
                    <Ionicons name="trophy-outline" size={20} color="#EF4444" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.statsMiniValue}>{stats?.completed_goals || 0}/{stats?.total_goals || 0}</Text>
                      <Text style={dynamicStyles.statsMiniLabel}>Goals</Text>
                    </View>
                  </View>
                  <View style={dynamicStyles.statsMiniCard}>
                    <Ionicons name="alarm-outline" size={20} color="#F59E0B" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.statsMiniValue}>{reminders?.length || 0}</Text>
                      <Text style={dynamicStyles.statsMiniLabel}>Calendar</Text>
                    </View>
                  </View>
                  <View style={dynamicStyles.statsMiniCard}>
                    <Ionicons name="gift-outline" size={20} color="#10B981" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.statsMiniValue}>{specialDays?.length || 0}</Text>
                      <Text style={dynamicStyles.statsMiniLabel}>Special Days</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={[dynamicStyles.statsMiniCardFull, { marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="hardware-chip-outline" size={20} color="#6C4EFF" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={dynamicStyles.statsMiniValue}>Active & Ready</Text>
                    <Text style={dynamicStyles.statsMiniLabel}>AI Assistant</Text>
                  </View>
                </View>
                <View style={dynamicStyles.activeDot} />
              </View>
            </View>

            {/* FEATURE HIGHLIGHTS */}
            <View style={dynamicStyles.aboutSection}>
              <Text style={dynamicStyles.aboutSectionTitle}>Feature Highlights</Text>
              {[
                { title: 'Smart Notes', icon: 'document-text-outline', color: '#8B5CF6', desc: 'Rich note taking with checklists, voice notes and secure notes.' },
                { title: 'AI Assistant', icon: 'hardware-chip-outline', color: '#6C4EFF', desc: 'Summarize, search and organize knowledge instantly.' },
                { title: 'Smart Calendar', icon: 'calendar-outline', color: '#F59E0B', desc: 'Unified schedule with reminders and deadlines.' },
                { title: 'Goal Tracking', icon: 'trophy-outline', color: '#EF4444', desc: 'Track daily progress and productivity.' },
                { title: 'Projects', icon: 'folder-open-outline', color: '#3B82F6', desc: 'Manage long-term personal and team projects.' },
                { title: 'Workspaces', icon: 'people-outline', color: '#14B8A6', desc: 'Collaborate with family, classmates and teams.' },
                { title: 'Special Days', icon: 'gift-outline', color: '#10B981', desc: 'Never miss birthdays and important occasions.' },
                { title: 'Secure Notes', icon: 'lock-closed-outline', color: '#EC4899', desc: 'Password-protected private notes.' },
                { title: 'Cloud Sync', icon: 'cloud-done-outline', color: '#06B6D4', desc: 'Automatic secure cloud synchronization.' }
              ].map((feat) => (
                <View key={feat.title} style={dynamicStyles.featureHighlightCard}>
                  <View style={[dynamicStyles.featureHighlightIcon, { backgroundColor: `${feat.color}12` }]}>
                    <Ionicons name={feat.icon as any} size={22} color={feat.color} />
                  </View>
                  <View style={dynamicStyles.featureHighlightContent}>
                    <Text style={[dynamicStyles.featureHighlightTitle, { color: theme.text }]}>{feat.title}</Text>
                    <Text style={dynamicStyles.featureHighlightDesc}>{feat.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* WHY CHOOSE KNOVAULT */}
            <View style={dynamicStyles.aboutSection}>
              <Text style={dynamicStyles.aboutSectionTitle}>Why Choose KnoVault</Text>
              <View style={dynamicStyles.pillsContainer}>
                {[
                  { label: 'Fast', icon: 'flash-outline', color: '#F59E0B' },
                  { label: 'Secure', icon: 'shield-checkmark-outline', color: '#10B981' },
                  { label: 'Cloud Backup', icon: 'cloud-upload-outline', color: '#3B82F6' },
                  { label: 'AI Powered', icon: 'hardware-chip-outline', color: '#6C4EFF' },
                  { label: 'Offline Support', icon: 'airplane-outline', color: '#6B7280' },
                  { label: 'Collaboration', icon: 'people-outline', color: '#14B8A6' },
                  { label: 'Beautiful UI', icon: 'color-palette-outline', color: '#EC4899' }
                ].map((pill) => (
                  <View key={pill.label} style={[dynamicStyles.pillCard, { borderColor: theme.border }]}>
                    <Ionicons name={pill.icon as any} size={14} color={pill.color} style={{ marginRight: 6 }} />
                    <Text style={[dynamicStyles.pillText, { color: theme.text }]}>{pill.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* HOW IT WORKS */}
            <View style={dynamicStyles.aboutSection}>
              <Text style={dynamicStyles.aboutSectionTitle}>How It Works</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.timelineScroll}>
                {[
                  { step: '1', title: 'Create Notes', desc: 'Capture ideas instantly', icon: 'create-outline' },
                  { step: '2', title: 'Organize', desc: 'Categorize & structure', icon: 'list-outline' },
                  { step: '3', title: 'Set Goals', desc: 'Track daily progress', icon: 'ribbon-outline' },
                  { step: '4', title: 'Get Reminders', desc: 'Never miss deadlines', icon: 'notifications-outline' },
                  { step: '5', title: 'Achieve More', desc: 'Build second brain', icon: 'checkmark-done-circle-outline' }
                ].map((item, idx) => (
                  <React.Fragment key={item.step}>
                    <View style={dynamicStyles.aboutTimelineCard}>
                      <View style={dynamicStyles.timelineNumberContainer}>
                        <Text style={dynamicStyles.timelineNumber}>{item.step}</Text>
                      </View>
                      <Ionicons name={item.icon as any} size={22} color={accentColor} style={{ marginVertical: 8 }} />
                      <Text style={[dynamicStyles.timelineTitle, { color: theme.text }]}>{item.title}</Text>
                      <Text style={dynamicStyles.timelineDesc}>{item.desc}</Text>
                    </View>
                    {idx < 4 && (
                      <View style={dynamicStyles.timelineArrowContainer}>
                        <Ionicons name="arrow-forward-outline" size={16} color={theme.textSecondary} />
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </ScrollView>
            </View>

            {/* PRIVACY & SECURITY */}
            <View style={dynamicStyles.aboutSection}>
              <Text style={dynamicStyles.aboutSectionTitle}>Privacy & Security Features</Text>
              <View style={dynamicStyles.aboutPrivacyGrid}>
                {[
                  { title: 'Secure Notes', desc: 'Dedicated password separate from account login.', icon: 'lock-closed-outline', color: '#A78BFA' },
                  { title: 'Smart Cloud', desc: '5 MB secure cloud storage with automatic storage switching.', icon: 'cloud-done-outline', color: '#3B82F6' },
                  { title: 'Offline Access', desc: 'Continue working without internet.', icon: 'wifi-off-outline', color: '#10B981' },
                  { title: 'Flexible Storage', desc: 'Choose between Neon Cloud, Local, Google Drive, or Hybrid.', icon: 'swap-horizontal-outline', color: '#F59E0B' },
                  { title: 'Password Reset', desc: 'Secure password reset using OTP verification.', icon: 'key-outline', color: '#EC4899' },
                  { title: 'Backup & Restore', desc: 'JSON Export, JSON Import, and Google Drive Backup.', icon: 'archive-outline', color: '#06B6D4' },
                  { title: 'Privacy First', desc: 'Your data belongs only to you. No selling. No third-party ads.', icon: 'shield-checkmark-outline', color: '#EF4444' },
                  { title: 'Performance', desc: 'Fast local caching. Optimized cloud synchronization.', icon: 'flash-outline', color: '#8B5CF6' }
                ].map(item => (
                  <View key={item.title} style={[dynamicStyles.aboutPrivacyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={dynamicStyles.aboutPrivacyCardHeader}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} style={{ marginRight: 8 }} />
                      <Text style={[dynamicStyles.aboutPrivacyCardTitle, { color: theme.text }]}>{item.title}</Text>
                    </View>
                    <Text style={dynamicStyles.aboutPrivacyCardDesc}>{item.desc}</Text>
                  </View>
                ))}
              </View>
            </View>


            {/* WHAT'S NEW */}
            <View style={dynamicStyles.aboutSection}>
              <Text style={dynamicStyles.aboutSectionTitle}>What's New in v1.2.5</Text>
              <View style={dynamicStyles.aboutSectionCard}>
                {[
                  { title: 'Workspace Notifications', desc: 'Stay updated with workspace activities instantly.' },
                  { title: 'Secure Notes Password', desc: 'Dedicated custom password separate from account login.' },
                  { title: 'Special Days Improvements', desc: 'Improved list view and countdown logic.' },
                  { title: 'AI Wish Generator', desc: 'Create personalized wishes for special days.' },
                  { title: 'Better Calendar', desc: 'Enhanced month and list layouts.' },
                  { title: 'Faster Performance', desc: 'Optimized query loads and DB queries.' }
                ].map((item) => (
                  <View key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                    <Ionicons name="sparkles" size={16} color={accentColor} style={{ marginRight: 10, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[dynamicStyles.whatsNewTitle, { color: theme.text }]}>{item.title}</Text>
                      <Text style={dynamicStyles.whatsNewDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* SOCIAL SECTION */}
            <View style={dynamicStyles.aboutSection}>
              <Text style={dynamicStyles.aboutSectionTitle}>Support & Community</Text>
              <View style={dynamicStyles.socialGrid}>
                <TouchableOpacity 
                  style={[dynamicStyles.socialButton, { borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); setRateAppModal(true); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="star" size={20} color="#F59E0B" />
                  <Text style={[dynamicStyles.socialButtonText, { color: theme.text }]}>Rate App</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[dynamicStyles.socialButton, { borderColor: theme.border }]} 
                  onPress={handleShareApp}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social" size={20} color="#3B82F6" />
                  <Text style={[dynamicStyles.socialButtonText, { color: theme.text }]}>Share App</Text>
                </TouchableOpacity>
              </View>
              <View style={dynamicStyles.socialGrid}>
                <TouchableOpacity 
                  style={[dynamicStyles.socialButton, { borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); setBugReportModal(true); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bug" size={20} color="#EF4444" />
                  <Text style={[dynamicStyles.socialButtonText, { color: theme.text }]}>Report Bug</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[dynamicStyles.socialButton, { borderColor: theme.border }]} 
                  onPress={() => { triggerHaptic(); setFeatureRequestModal(true); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bulb" size={20} color="#10B981" />
                  <Text style={[dynamicStyles.socialButtonText, { color: theme.text }]}>Suggest Feature</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[dynamicStyles.socialButtonFull, { borderColor: theme.border, marginTop: 10 }]} 
                onPress={handleContact}
                activeOpacity={0.7}
              >
                <Ionicons name="mail" size={20} color={accentColor} />
                <Text style={[dynamicStyles.socialButtonText, { color: theme.text, marginLeft: 10 }]}>Contact (thinkgood24hrs@gmail.com)</Text>
              </TouchableOpacity>
            </View>

            {/* FOOTER */}
            <View style={[dynamicStyles.aboutFooterCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(108,78,255,0.04)' }]}>
              <Animated.View style={animatedHeartStyle}>
                <Ionicons name="heart" size={36} color="#EF4444" style={{ marginBottom: 12 }} />
              </Animated.View>
              <Text style={[dynamicStyles.footerThankYou, { color: theme.text }]}>Thank you for choosing KnoVault ❤️</Text>
              
              <Text style={dynamicStyles.footerSlogan}>
                Organize Knowledge.{"\n"}Increase Productivity.{"\n"}Build Your Second Brain.
              </Text>
              
              <Text style={[dynamicStyles.footerSlogan, { fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 10 }]}>
                Version 1.2.5
              </Text>
              
              <Text style={dynamicStyles.footerCopyright}>
                © {new Date().getFullYear()} KnoVault. All rights reserved.
              </Text>
            </View>
            
            <TouchableOpacity style={[dynamicStyles.aboutActionBtn, { backgroundColor: accentColor, marginTop: 20 }]} onPress={() => setAboutModal(false)}>
              <Text style={dynamicStyles.aboutActionText}>Close About Page</Text>
            </TouchableOpacity>

          </ScrollView>

          {/* Rate App Bottom Sheet */}
          <Modal visible={rateAppModal} transparent animationType="slide" onRequestClose={() => setRateAppModal(false)}>
            <TouchableWithoutFeedback onPress={() => setRateAppModal(false)}>
              <View style={dynamicStyles.supportModalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[dynamicStyles.bottomSheetContainer, { backgroundColor: theme.card }]}>
                    <View style={dynamicStyles.bottomSheetIndicator} />
                    <Ionicons name="star" size={48} color="#F59E0B" style={{ alignSelf: 'center', marginBottom: 15 }} />
                    <Text style={[dynamicStyles.bottomSheetTitle, { color: theme.text }]}>Rate KnoVault</Text>
                    <Text style={[dynamicStyles.bottomSheetBody, { color: theme.textSecondary }]}>
                      KnoVault is not yet available on the Play Store. Rating will be available after public release.
                    </Text>
                    <TouchableOpacity style={[dynamicStyles.bottomSheetBtn, { backgroundColor: accentColor }]} onPress={() => setRateAppModal(false)}>
                      <Text style={dynamicStyles.bottomSheetBtnText}>Got it</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Report Bug Modal */}
          <Modal visible={bugReportModal} transparent animationType="slide" onRequestClose={() => setBugReportModal(false)}>
            <TouchableWithoutFeedback onPress={() => setBugReportModal(false)}>
              <View style={dynamicStyles.supportModalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[dynamicStyles.modalFormContainer, { backgroundColor: theme.card }]}>
                    <View style={dynamicStyles.formHeader}>
                      <Text style={[dynamicStyles.formHeaderTitle, { color: theme.text }]}>Report a Bug</Text>
                      <TouchableOpacity onPress={() => setBugReportModal(false)}>
                        <Ionicons name="close" size={24} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Bug Title</Text>
                      <TextInput
                        style={[dynamicStyles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        placeholder="Brief summary of the issue..."
                        placeholderTextColor={theme.textSecondary + '77'}
                        value={bugTitle}
                        onChangeText={setBugTitle}
                      />

                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Description</Text>
                      <TextInput
                        style={[dynamicStyles.formTextArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        placeholder="What happened? What did you expect to happen?"
                        placeholderTextColor={theme.textSecondary + '77'}
                        multiline
                        numberOfLines={4}
                        value={bugDescription}
                        onChangeText={setBugDescription}
                      />

                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Steps to Reproduce</Text>
                      <TextInput
                        style={[dynamicStyles.formTextArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        placeholder="1. Open App&#10;2. Navigate to...&#10;3. Click on..."
                        placeholderTextColor={theme.textSecondary + '77'}
                        multiline
                        numberOfLines={3}
                        value={bugSteps}
                        onChangeText={setBugSteps}
                      />

                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Screenshot (Optional)</Text>
                      <TouchableOpacity 
                        style={[dynamicStyles.screenshotSelector, { borderColor: theme.border, backgroundColor: theme.background }]}
                        onPress={handleSelectScreenshot}
                      >
                        <Ionicons name="image-outline" size={20} color={accentColor} style={{ marginRight: 8 }} />
                        <Text style={[dynamicStyles.screenshotSelectorText, { color: theme.textSecondary }]}>
                          {bugScreenshotUri ? 'Change Screenshot' : 'Choose from Gallery'}
                        </Text>
                      </TouchableOpacity>
                      {bugScreenshotUri && (
                        <Text style={{ fontSize: 12, color: '#10B981', marginTop: 5, fontWeight: '600' }}>
                          ✓ {bugScreenshotName}
                        </Text>
                      )}

                      <View style={[dynamicStyles.formDivider, { borderColor: theme.border }]} />

                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Auto-filled Diagnostics</Text>
                      <View style={[dynamicStyles.diagnosticsBox, { backgroundColor: theme.background }]}>
                        <Text style={[dynamicStyles.diagnosticsText, { color: theme.textSecondary }]}>
                          Device: {Platform.OS} {Platform.Version} ({Constants.deviceName || 'Unknown'})
                        </Text>
                        <Text style={[dynamicStyles.diagnosticsText, { color: theme.textSecondary, marginTop: 4 }]}>
                          App Version: 1.2.5
                        </Text>
                      </View>

                      <TouchableOpacity 
                        style={[dynamicStyles.formSubmitBtn, { backgroundColor: accentColor }]}
                        onPress={handleSubmitBugReport}
                        disabled={submittingBug}
                      >
                        {submittingBug ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={dynamicStyles.formSubmitBtnText}>Submit Bug Report</Text>
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Suggest Feature Modal */}
          <Modal visible={featureRequestModal} transparent animationType="slide" onRequestClose={() => setFeatureRequestModal(false)}>
            <TouchableWithoutFeedback onPress={() => setFeatureRequestModal(false)}>
              <View style={dynamicStyles.supportModalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[dynamicStyles.modalFormContainer, { backgroundColor: theme.card }]}>
                    <View style={dynamicStyles.formHeader}>
                      <Text style={[dynamicStyles.formHeaderTitle, { color: theme.text }]}>Feature Request</Text>
                      <TouchableOpacity onPress={() => setFeatureRequestModal(false)}>
                        <Ionicons name="close" size={24} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Feature Title</Text>
                      <TextInput
                        style={[dynamicStyles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        placeholder="What is your suggestion?"
                        placeholderTextColor={theme.textSecondary + '77'}
                        value={featureTitle}
                        onChangeText={setFeatureTitle}
                      />

                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Description</Text>
                      <TextInput
                        style={[dynamicStyles.formTextArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        placeholder="Describe how this feature should work..."
                        placeholderTextColor={theme.textSecondary + '77'}
                        multiline
                        numberOfLines={4}
                        value={featureDescription}
                        onChangeText={setFeatureDescription}
                      />

                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Expected Benefit</Text>
                      <TextInput
                        style={[dynamicStyles.formTextArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        placeholder="Why would this feature be useful?"
                        placeholderTextColor={theme.textSecondary + '77'}
                        multiline
                        numberOfLines={3}
                        value={featureBenefit}
                        onChangeText={setFeatureBenefit}
                      />

                      <Text style={[dynamicStyles.formLabel, { color: theme.textSecondary }]}>Priority</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                        {['Low', 'Medium', 'High'].map((p) => (
                          <TouchableOpacity 
                            key={p} 
                            style={[
                              dynamicStyles.priorityChip,
                              { borderColor: theme.border },
                              featurePriority === p && { backgroundColor: accentColor, borderColor: accentColor }
                            ]}
                            onPress={() => setFeaturePriority(p as any)}
                          >
                            <Text style={[
                              dynamicStyles.priorityChipText,
                              { color: theme.textSecondary },
                              featurePriority === p && { color: '#fff', fontWeight: '700' }
                            ]}>
                              {p}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity 
                        style={[dynamicStyles.formSubmitBtn, { backgroundColor: accentColor, marginTop: 25 }]}
                        onPress={handleSubmitFeatureSuggestion}
                        disabled={submittingFeature}
                      >
                        {submittingFeature ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={dynamicStyles.formSubmitBtnText}>Submit Suggestion</Text>
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Toast Snackbar */}
          {snackbarVisible && (
            <View style={[dynamicStyles.snackbarContainer, { backgroundColor: snackbarType === 'success' ? '#10B981' : snackbarType === 'error' ? '#EF4444' : '#3B82F6' }]}>
              <Ionicons 
                name={snackbarType === 'success' ? "checkmark-circle" : snackbarType === 'error' ? "alert-circle" : "information-circle"} 
                size={18} 
                color="#fff" 
                style={{ marginRight: 10 }} 
              />
              <Text style={dynamicStyles.snackbarText}>{snackbarMessage}</Text>
            </View>
          )}
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
                <Text style={[dynamicStyles.shieldHeading, { color: theme.text }]}>Privacy & Security Center</Text>
                <Text style={dynamicStyles.shieldSubheading}>Learn how KnoVault protects your personal database across cloud, local, and drive storage.</Text>
              </View>

              {/* Security Status Card */}
              <View style={[dynamicStyles.securityStatusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={dynamicStyles.scoreContainer}>
                  <View style={[dynamicStyles.scoreCircle, { borderColor: accentColor }]}>
                    <Text style={[dynamicStyles.scoreText, { color: theme.text }]}>{securityScore}%</Text>
                    <Text style={dynamicStyles.scoreSub}>Score</Text>
                  </View>
                  <View style={{ marginLeft: 15, flex: 1 }}>
                    <Text style={[dynamicStyles.statusTitle, { color: theme.text }]}>Security Health</Text>
                    <Text style={dynamicStyles.statusGrade}>
                      {securityScore === 100 ? 'Excellent 🛡️' : securityScore >= 75 ? 'Strong 💪' : securityScore >= 50 ? 'Moderate ⚖️' : 'Basic ⚠️'}
                    </Text>
                  </View>
                </View>
                <View style={dynamicStyles.statusGrid}>
                  <View style={dynamicStyles.statusGridRow}>
                    <Text style={dynamicStyles.gridLabel}>Cloud Storage</Text>
                    <Text style={[dynamicStyles.gridVal, { color: theme.text }]}>
                      {storageStats ? `${(storageStats.used_bytes / (1024*1024)).toFixed(2)} / ${(storageStats.limit_bytes / (1024*1024)).toFixed(0)} MB` : 'Active'}
                    </Text>
                  </View>
                  <View style={dynamicStyles.statusGridRow}>
                    <Text style={dynamicStyles.gridLabel}>Secure Notes</Text>
                    <Text style={[dynamicStyles.gridVal, { color: snStatus?.is_password_set ? '#10B981' : '#F59E0B' }]}>
                      {snStatus?.is_password_set ? 'Enabled 🔒' : 'Disabled 🔓'}
                    </Text>
                  </View>
                  <View style={dynamicStyles.statusGridRow}>
                    <Text style={dynamicStyles.gridLabel}>Google Drive</Text>
                    <Text style={[dynamicStyles.gridVal, { color: googleDriveConnected ? '#10B981' : '#EF4444' }]}>
                      {googleDriveConnected ? 'Connected 🔗' : 'Disconnected ❌'}
                    </Text>
                  </View>
                  <View style={dynamicStyles.statusGridRow}>
                    <Text style={dynamicStyles.gridLabel}>Last Backup</Text>
                    <Text style={[dynamicStyles.gridVal, { color: theme.text }]}>
                      {lastDriveSync ? new Date(lastDriveSync).toLocaleDateString() : 'Never'}
                    </Text>
                  </View>
                  <View style={dynamicStyles.statusGridRow}>
                    <Text style={dynamicStyles.gridLabel}>Email Status</Text>
                    <Text style={[dynamicStyles.gridVal, { color: user?.is_verified ? '#10B981' : '#F59E0B' }]}>
                      {user?.is_verified ? 'Verified ✅' : 'Unverified ⚠️'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Privacy detailed sections */}
              {[
                { 
                  key: 'own', 
                  title: '🔒 Data Ownership', 
                  content: [
                    '• Users always own their data completely. KnoVault operates as a shell for your digital second-brain.',
                    '• We never sell, rent, or monetize your notes, ideas, projects, or personal information.',
                    '• You have the right to export your entire database as standardized JSON or delete your cloud account instantly.'
                  ]
                },
                { 
                  key: 'cloud', 
                  title: '☁️ Cloud Storage Privacy', 
                  content: [
                    '• Cloud data is stored securely on protected Neon PostgreSQL instances.',
                    '• Every user account receives a free cloud storage quota of 5 MB.',
                    '• When storage is full, writes route dynamically to your selected secondary storage (Local SQLite or Google Drive).',
                    '• No user data is ever deleted automatically when reaching limits.'
                  ]
                },
                { 
                  key: 'local', 
                  title: '📱 Local Device Security', 
                  content: [
                    '• Local-first notes are saved directly inside your device in a client-side SQLite database.',
                    '• Sensitive, private categories are kept out of shared cloud registers unless sync is configured.',
                    '• Local data remains available completely offline, ensuring access even without internet connections.'
                  ]
                },
                { 
                  key: 'secure_notes', 
                  title: '🔑 Secure Notes Protection', 
                  content: [
                    '• Secure Notes are locked behind a dedicated, custom password.',
                    '• This protection passcode is entirely independent of your primary account credentials.',
                    '• Forgot passcode recovery relies on a secure OTP code verification sent to your registered email address.',
                    '• Notes remain fully encrypted and inaccessible until password authentication succeeds.'
                  ]
                },
                { 
                  key: 'encryption', 
                  title: '🔐 Encryption & Privacy', 
                  content: [
                    '• Sensitive user data is encrypted client-side using industry-grade algorithms before database entry.',
                    '• Authentication tokens and user passwords are encrypted using one-way cryptographic hashing.',
                    '• API network exchanges are strictly conducted over encrypted HTTPS connections.'
                  ]
                },
                { 
                  key: 'backup', 
                  title: '📂 Backup & Recovery', 
                  content: [
                    '• Backup and restore operations utilize standardized, human-readable JSON files.',
                    '• Google Drive synchronization is optional and uses secure OAuth API tokens to keep backups private.',
                    '• Cloud backups allow full recovery of your notes, settings, and reminders after reinstalling KnoVault.'
                  ]
                },
                { 
                  key: 'practices', 
                  title: '🛡️ Security Best Practices', 
                  content: [
                    '• Create a strong, unique Secure Notes password that differs from your login password.',
                    '• Connect your Google Drive to enable automated cloud backups.',
                    '• Keep your account email verified to ensure access to password resets.',
                    '• Regularly export a local JSON backup of your database as an extra safeguard.',
                    '• Never share your Secure Notes password or account credentials with anyone.'
                  ]
                }
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
                        <View style={{ marginTop: 10, paddingHorizontal: 4 }}>
                          {sec.content.map((bullet, idx) => (
                            <Text key={idx} style={dynamicStyles.privacySectionBody}>{bullet}</Text>
                          ))}
                        </View>
                      </Animated.View>
                    )}
                  </View>
                );
              })}

              <View style={dynamicStyles.privacyBottomTag}>
                <Ionicons name="heart-outline" size={16} color={accentColor} style={{ marginRight: 6 }} />
                <Text style={[dynamicStyles.privacyBottomTagText, { color: theme.text }]}>Your productivity data belongs entirely to you.</Text>
              </View>

              <TouchableOpacity 
                style={[dynamicStyles.aboutActionBtn, { backgroundColor: accentColor, marginTop: 20, width: '100%' }]} 
                onPress={() => setPrivacyPolicyVisible(true)}
              >
                <Text style={dynamicStyles.aboutActionText}>View Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ScreenContainer>
      </Modal>

      {/* Custom Full Screen Privacy Policy Modal */}
      <Modal visible={privacyPolicyVisible} transparent={false} animationType="slide">
        <ScreenContainer style={[dynamicStyles.container, { backgroundColor: theme.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          
          <View style={dynamicStyles.fullModalHeader}>
            <Text style={dynamicStyles.fullModalTitle}>Privacy Policy</Text>
            <TouchableOpacity 
              style={dynamicStyles.fullCloseBtn} 
              onPress={() => setPrivacyPolicyVisible(false)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 25, paddingBottom: 60 }}>
            <View style={{ alignItems: 'flex-start', width: '100%' }}>
              <Ionicons name="document-text-outline" size={48} color={accentColor} style={{ marginBottom: 15, alignSelf: 'center' }} />
              <Text style={[dynamicStyles.policyMainTitle, { color: theme.text }]}>KnoVault Privacy Commitment</Text>
              <Text style={dynamicStyles.policyDate}>Effective Date: July 3, 2026</Text>
              
              <Text style={dynamicStyles.policySectionHeader}>1. Introduction</Text>
              <Text style={dynamicStyles.policyBody}>
                Welcome to KnoVault. We respect your privacy and are committed to protecting your personal productivity database. This policy outlines how your information is stored, processed, and secured.
              </Text>

              <Text style={dynamicStyles.policySectionHeader}>2. Information We Collect</Text>
              <Text style={dynamicStyles.policyBody}>
                We collect your email address and profile metadata solely for authentication, notifications, and secure password recovery purposes. KnoVault does not monitor, index, or parse the content of your notes, workspaces, goals, or private attachments.
              </Text>

              <Text style={dynamicStyles.policySectionHeader}>3. Data Ownership & Storage Choice</Text>
              <Text style={dynamicStyles.policyBody}>
                You retain 100% ownership of your data. We support multiple flexible storage options:
                {"\n"}• Neon Cloud Storage (Primary secure backend database with a 5 MB quota limit)
                {"\n"}• Google Drive Storage (Linked dynamically via secure OAuth scoped strictly to the KnoVault directory)
                {"\n"}• Local Device Storage (Client-side SQLite database keeping your notes completely offline)
              </Text>

              <Text style={dynamicStyles.policySectionHeader}>4. Local Encryption & Secure Notes</Text>
              <Text style={dynamicStyles.policyBody}>
                Notes marked as secure are encrypted client-side using industry-standard cryptography. The decryption password resides strictly on your device and is never stored in plaintext or transmitted to our servers. Recovery is only possible via email OTP verification.
              </Text>

              <Text style={dynamicStyles.policySectionHeader}>5. No Ads & No Data Selling</Text>
              <Text style={dynamicStyles.policyBody}>
                We do not sell, rent, or lease your personal information to third parties. KnoVault is completely ad-free, ensuring a premium, private space for your digital mind.
              </Text>

              <Text style={dynamicStyles.policySectionHeader}>6. Changes to this Policy</Text>
              <Text style={dynamicStyles.policyBody}>
                We may update this policy periodically to reflect architectural changes. Your continued use of the application indicates acceptance of any revisions.
              </Text>

              <TouchableOpacity 
                style={[dynamicStyles.aboutActionBtn, { backgroundColor: accentColor, marginTop: 30, width: '100%' }]} 
                onPress={() => setPrivacyPolicyVisible(false)}
              >
                <Text style={dynamicStyles.aboutActionText}>Close Policy</Text>
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
    permPanel: {
      marginTop: 12,
      width: '100%',
    },
    permBanner: {
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    permBannerTitle: {
      ...typography.titleSmall,
      fontWeight: '700',
      fontSize: 13,
      marginBottom: 4,
    },
    permBannerText: {
      ...typography.bodySmall,
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 10,
    },
    permButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    permButtonText: {
      ...typography.caption,
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 11,
    },

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

    aboutOrbLarge: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 160,
      top: -80,
      right: -80,
      opacity: 0.8,
    },
    aboutOrbSmall: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      bottom: -40,
      left: -40,
      opacity: 0.6,
    },
    aboutHeroContainer: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30,
      width: '100%',
    },
    aboutLogoWrapper: {
      width: 100,
      height: 100,
      borderRadius: 32,
      padding: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      elevation: 8,
      shadowColor: '#6C4EFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    aboutLogoGradient: {
      width: '100%',
      height: '100%',
      borderRadius: 29,
      justifyContent: 'center',
      alignItems: 'center',
    },
    aboutHeroTitle: {
      fontSize: 32,
      fontWeight: '900',
      color: theme.text,
      letterSpacing: 1,
    },
    aboutHeroTagline: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 6,
      paddingHorizontal: 20,
      fontWeight: '600',
    },
    aboutSection: {
      width: '100%',
      marginBottom: 25,
    },
    aboutSectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 12,
      letterSpacing: 0.3,
    },
    aboutSectionCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: borderCol,
      padding: 20,
      width: '100%',
      marginBottom: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 8,
    },
    sectionCardTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 8,
    },
    sectionCardBody: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    aboutStatsGrid: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    aboutStatsGridCol: {
      flex: 1,
      gap: 12,
    },
    statsMiniCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: borderCol,
      padding: 14,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.15 : 0.03,
      shadowRadius: 4,
    },
    statsMiniCardFull: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: borderCol,
      padding: 14,
      width: '100%',
      elevation: 1,
    },
    statsMiniValue: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.text,
    },
    statsMiniLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    },
    featureHighlightCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: borderCol,
      padding: 16,
      marginBottom: 10,
    },
    featureHighlightIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    featureHighlightContent: {
      flex: 1,
    },
    featureHighlightTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 3,
    },
    featureHighlightDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    pillsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pillCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1.2,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '700',
    },
    timelineScroll: {
      paddingVertical: 10,
      paddingRight: 20,
    },
    aboutTimelineCard: {
      width: 140,
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: borderCol,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineNumberContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(108, 78, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    timelineNumber: {
      fontSize: 12,
      fontWeight: '800',
      color: '#6C4EFF',
    },
    timelineTitle: {
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    timelineDesc: {
      fontSize: 10,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },
    timelineArrowContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    securityText: {
      fontSize: 13,
      fontWeight: '700',
    },
    whatsNewTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 2,
    },
    whatsNewDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 17,
    },
    socialGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
      width: '100%',
    },
    socialButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      borderWidth: 1.2,
      borderRadius: 16,
      paddingVertical: 12,
      gap: 8,
    },
    socialButtonFull: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      borderWidth: 1.2,
      borderRadius: 16,
      paddingVertical: 14,
    },
    socialButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
    aboutFooterCard: {
      alignItems: 'center',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: borderCol,
      padding: 24,
      width: '100%',
      marginTop: 20,
      marginBottom: 10,
    },
    footerThankYou: {
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 8,
    },
    footerSlogan: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: 18,
      marginBottom: 16,
    },
    footerCopyright: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    supportModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    bottomSheetContainer: {
      width: '100%',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      alignItems: 'center',
    },
    bottomSheetIndicator: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.textSecondary + '33',
      marginBottom: 20,
    },
    bottomSheetTitle: {
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 10,
      textAlign: 'center',
    },
    bottomSheetBody: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    bottomSheetBtn: {
      width: '100%',
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomSheetBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    modalFormContainer: {
      width: '100%',
      height: '80%',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    formHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    formHeaderTitle: {
      fontSize: 20,
      fontWeight: '900',
    },
    formLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginTop: 14,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    formInput: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
    },
    formTextArea: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      textAlignVertical: 'top',
      minHeight: 80,
    },
    screenshotSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 12,
      borderStyle: 'dashed',
    },
    screenshotSelectorText: {
      fontSize: 13,
      fontWeight: '600',
    },
    formDivider: {
      borderBottomWidth: 1,
      marginVertical: 18,
    },
    diagnosticsBox: {
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    diagnosticsText: {
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    formSubmitBtn: {
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
      marginBottom: 20,
    },
    formSubmitBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },
    priorityChip: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priorityChipText: {
      fontSize: 12,
      fontWeight: '600',
    },
    snackbarContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 40 : 20,
      left: 20,
      right: 20,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
      zIndex: 9999,
    },
    snackbarText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },

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
    },
    // New Privacy & Security Redesign styles
    securityStatusCard: {
      width: '100%',
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginVertical: 14,
      ...getThemedShadow(2),
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 12,
      marginBottom: 12,
    },
    scoreCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 3,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scoreText: {
      fontSize: 15,
      fontWeight: '800',
    },
    scoreSub: {
      fontSize: 8,
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    statusTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    statusGrade: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    statusGrid: {
      gap: 8,
    },
    statusGridRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    gridLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    gridVal: {
      fontSize: 12,
      fontWeight: '700',
    },
    policyMainTitle: {
      fontSize: 18,
      fontWeight: '800',
      alignSelf: 'center',
      marginBottom: 4,
    },
    policyDate: {
      fontSize: 11,
      color: theme.textSecondary,
      alignSelf: 'center',
      marginBottom: 20,
    },
    policySectionHeader: {
      fontSize: 14,
      fontWeight: '800',
      marginTop: 16,
      marginBottom: 6,
      color: '#7C4DFF',
    },
    policyBody: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    aboutPrivacyGrid: {
      gap: 12,
      marginVertical: 10,
    },
    aboutPrivacyCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      ...getThemedShadow(2),
    },
    aboutPrivacyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    aboutPrivacyCardTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    aboutPrivacyCardDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    dashboardOverviewCard: {
      borderRadius: cardRadius,
      borderWidth: 1,
      padding: 20,
      ...getThemedShadow(2),
    },
    dashboardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dashboardCardTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    dashboardUsageText: {
      fontSize: 11,
      fontWeight: '600',
    },
    dashboardUsageLabel: {
      fontSize: 11,
    },
    dashboardPercentText: {
      fontSize: 18,
    },
    dashboardModeCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      ...getThemedShadow(1),
    },
    dashboardModeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    dashboardModeTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 3,
    },
    dashboardModeDesc: {
      fontSize: 11,
      lineHeight: 16,
    },
    dashboardTipsCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      ...getThemedShadow(1),
    },
    dashboardStatsCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      ...getThemedShadow(1),
    },
    statsGridContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statsGridCol: {
      flex: 1,
      gap: 10,
    },
    statsItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingRight: 12,
    },
    statsLabel: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    statsValue: {
      fontSize: 12,
      fontWeight: '800',
    },
    dashboardActionsCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      ...getThemedShadow(1),
    },
    actionListItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
    }
  });
};
