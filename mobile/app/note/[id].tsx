import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  LayoutAnimation,
  Pressable,
  Linking,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ScreenContainer from '../../src/components/ScreenContainer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { getFadeIn, getFadeInDown, getFadeOut, getFadeOutUp, getZoomIn } from '../../src/utils/animations';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import { notesApi } from '../../src/api/notes';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';
import { getThemedShadow } from '../../src/components/ThemedComponents';

const CATEGORIES = [
  'General', 'Work', 'Personal', 'Study', 'Ideas', 
  'Shopping', 'Health', 'Finance', 'Travel', 'Secure'
];

const CATEGORY_ICONS: Record<string, string> = {
  General: '📋',
  Work: '💼',
  Personal: '👤',
  Study: '📚',
  Ideas: '💡',
  Shopping: '🛒',
  Health: '❤️',
  Finance: '💰',
  Travel: '✈️',
  Secure: '🔒',
};

const CategoryChip = ({ cat, isSelected, onPress, isDark, colors, theme, ds }: any) => {
  const emoji = CATEGORY_ICONS[cat] || '📋';
  
  if (isSelected) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ds.catChipSelectedWrapper,
          { transform: [{ scale: pressed ? 0.96 : 1.0 }] },
          isDark ? ds.catChipSelectedGlowDark : ds.catChipSelectedGlowLight
        ]}
      >
        <LinearGradient
          colors={colors.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ds.catChipSelectedGradient}
        >
          <Text style={ds.catChipEmoji}>{emoji}</Text>
          <Text style={ds.catChipTextActive}>{cat}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ds.catChipUnselected,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          transform: [{ scale: pressed ? 0.96 : 1.0 }]
        }
      ]}
    >
      <Text style={ds.catChipEmoji}>{emoji}</Text>
      <Text style={[ds.catChipText, { color: theme.textSecondary }]}>{cat}</Text>
    </Pressable>
  );
};

const getFieldIcon = (label: string): string => {
  const l = label.toLowerCase().trim();
  if (l.includes('email') || l.includes('mail')) return '📧';
  if (l.includes('password') || l.includes('pass') || l.includes('secret') || l.includes('key')) return '🔑';
  if (l.includes('website') || l.includes('site') || l.includes('url') || l.includes('link') || l.includes('web')) return '🌐';
  if (l.includes('phone') || l.includes('mobile') || l.includes('tel') || l.includes('contact')) return '📱';
  if (l.includes('note') || l.includes('notes') || l.includes('description') || l.includes('info') || l.includes('about')) return '📝';
  if (l.includes('address') || l.includes('location') || l.includes('city') || l.includes('map')) return '📍';
  if (l.includes('user') || l.includes('username') || l.includes('profile') || l.includes('name')) return '👤';
  return '📁'; // Default generic field icon
};

const shouldUppercaseLabel = (label: string): boolean => {
  const trimmed = label.trim();
  if (!trimmed) return false;
  
  // If it matches email, url/link, or phone, do NOT uppercase
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  if (/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i.test(trimmed)) return false;
  if (/^\+?(\d[\s\-()]*){7,}$/.test(trimmed)) return false;
  
  // Standard labels lists
  const standardLabels = [
    'email', 'mail', 'username', 'user', 'password', 'pass', 'secret', 'key', 
    'website', 'site', 'url', 'link', 'web', 'phone', 'mobile', 'tel', 'contact', 
    'note', 'notes', 'description', 'info', 'about', 'address', 'location', 'city', 'map'
  ];
  if (standardLabels.includes(trimmed.toLowerCase())) {
    return true;
  }
  
  // If it has lowercase and no spaces and has digits/symbols, it's likely a credential/username/password/token value
  const hasLowercase = /[a-z]/.test(trimmed);
  const hasSpaces = /\s/.test(trimmed);
  const hasDigitsOrSymbols = /[\d\W_]/.test(trimmed);
  if (hasLowercase && !hasSpaces && hasDigitsOrSymbols) {
    return false;
  }
  
  return true;
};

const detectFieldType = (val: string): 'url' | 'email' | 'phone' | null => {
  const trimmed = val.trim();
  if (!trimmed) return null;
  
  // Email check
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'email';
  }
  
  // URL check
  const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;
  if (urlRegex.test(trimmed) || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('www.')) {
    return 'url';
  }
  
  // Phone number check (must contain at least 7 digits, allowing + - ( ) spaces)
  const phoneRegex = /^\+?(\d[\s\-()]*){7,}$/;
  if (phoneRegex.test(trimmed)) {
    return 'phone';
  }
  
  return null;
};

export default function NoteEditorScreen() {
  const { colors, theme, isDark } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isExistingNote = id && id !== 'create';
  const [isEditing, setIsEditing] = useState(!isExistingNote);
  const [showHint, setShowHint] = useState(isExistingNote);
  const [saveStatus, setSaveStatus] = useState<'Saving...' | 'Saved ✓' | ''>('');
  
  const bodyInputRef = useRef<TextInput>(null);
  const titleInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<any>(null);

  const scrollToTop = () => {
    if (scrollViewRef.current) {
      if (typeof scrollViewRef.current.scrollToPosition === 'function') {
        scrollViewRef.current.scrollToPosition(0, 0, true);
      } else if (typeof scrollViewRef.current.scrollTo === 'function') {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      } else if (typeof scrollViewRef.current.getScrollResponder === 'function') {
        scrollViewRef.current.getScrollResponder()?.scrollTo({ y: 0, animated: true });
      }
    }
  };

  const handleInteractivePress = async (value: string, type: 'url' | 'email' | 'phone') => {
    let url = value.trim();
    if (type === 'email') {
      url = `mailto:${url}`;
    } else if (type === 'phone') {
      const sanitizedPhone = url.replace(/[^\d+]/g, '');
      url = `tel:${sanitizedPhone}`;
    } else if (type === 'url') {
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log('[Haptics Not Available]');
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open link: ${value}`);
      }
    } catch (error) {
      console.log('Error opening link:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [previousCategory, setPreviousCategory] = useState('General');
  const [noteType, setNoteType] = useState<'standard' | 'checklist' | 'field'>('standard');
  const [isSecure, setIsSecure] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  const [checklist, setChecklist] = useState<{ id: string, text: string, done: boolean }[]>([]);
  const [fields, setFields] = useState<{ id: string, label: string, value: string }[]>([]);

  // ── Edit Mode Animation Values & Handlers ───────────────────────
  const editScale = useSharedValue(1);
  const isEditPressed = useSharedValue(false);
  const editProgress = useSharedValue(isExistingNote ? 0 : 1);
  const [lastTap, setLastTap] = useState(0);

  useEffect(() => {
    editProgress.value = withTiming(isEditing ? 1 : 0, { duration: 300 });
  }, [isEditing]);

  useEffect(() => {
    if (isExistingNote) {
      const timer = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setSaveStatus('');
      return;
    }
    setSaveStatus('Saving...');
    const timer = setTimeout(() => {
      setSaveStatus('Saved ✓');
    }, 1200);
    return () => clearTimeout(timer);
  }, [title, content, checklist, fields, isEditing]);

  const animatedEditBtnStyle = useAnimatedStyle(() => {
    const glowOpacity = withTiming(isEditPressed.value ? 0.6 : 0, { duration: 150 });
    return {
      transform: [{ scale: editScale.value }],
      shadowColor: '#7C4DFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity,
      shadowRadius: isEditPressed.value ? 8 : 0,
      elevation: isEditPressed.value ? 4 : 0,
    };
  });

  const getFormattedTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `Edited ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `Edited ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `Edited ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return `Edited on ${date.toLocaleDateString()}`;
    } catch {
      return '';
    }
  };

  const handleEnableEdit = async () => {
    console.log('[EDIT MODE ENABLED]');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEditing(true);
    await triggerHaptic(Haptics.NotificationFeedbackType.Success);
    scrollToTop();
    setTimeout(() => {
      bodyInputRef.current?.focus();
    }, 100);
  };

  const handleContentPress = async () => {
    if (isEditing) return;
    if (isSecure) {
      console.log('[COPY BLOCKED - SECURE NOTE]');
      showToast('Edit button required for secure notes 🔒', 'warning');
      await triggerHaptic(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      console.log('[Double Tap Detected]');
      console.log('[EDIT MODE ENABLED]');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsEditing(true);
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
      scrollToTop();
      setTimeout(() => {
        bodyInputRef.current?.focus();
      }, 100);
    } else {
      setLastTap(now);
    }
  };

  // ── Copy Note States & Animation Values ─────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const copyScale = useSharedValue(1);
  const isCopyPressed = useSharedValue(false);
  const rippleScale = useSharedValue(0.8);
  const rippleOpacity = useSharedValue(0);

  const animatedCopyBtnStyle = useAnimatedStyle(() => {
    const glowOpacity = withTiming(isCopyPressed.value ? 0.6 : 0, { duration: 150 });
    return {
      transform: [{ scale: copyScale.value }],
      shadowColor: '#7C4DFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity,
      shadowRadius: isCopyPressed.value ? 8 : 0,
      elevation: isCopyPressed.value ? 4 : 0,
    };
  });

  const animatedRippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    };
  });

  const showToast = (message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getNoteTextToCopy = () => {
    let text = '';
    
    if (noteType === 'standard') {
      text = content;
    } else if (noteType === 'checklist') {
      text = checklist
        .map(item => `${item.done ? '☑' : '☐'} ${item.text}`)
        .join('\n');
    } else if (noteType === 'field') {
      text = fields
        .map(f => `${f.label}: ${f.value}`)
        .join('\n');
    }

    const trimmedTitle = title.trim();
    const trimmedText = text.trim();

    if (trimmedTitle) {
      if (trimmedText) {
        return `${trimmedTitle}\n\n${trimmedText}`;
      }
      return trimmedTitle;
    }
    return trimmedText;
  };

  const handleCopy = async () => {
    console.log('[COPY BUTTON PRESSED]');
    if (isCopying) return;
    setIsCopying(true);

    if (isSecure) {
      console.log('[COPY BLOCKED - SECURE NOTE]');
      showToast('Copy disabled for secure notes 🔒', 'warning');
      await triggerHaptic(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => setIsCopying(false), 1500);
      return;
    }

    const textToCopy = getNoteTextToCopy();
    if (!textToCopy) {
      console.log('[COPY FAILED] Content is empty');
      showToast('Nothing to copy', 'warning');
      await triggerHaptic(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => setIsCopying(false), 1500);
      return;
    }

    // Trigger ripple animation
    rippleScale.value = 0.8;
    rippleOpacity.value = 0.6;
    rippleScale.value = withTiming(1.6, { duration: 450 });
    rippleOpacity.value = withTiming(0, { duration: 450 });

    try {
      await Clipboard.setStringAsync(textToCopy);
      console.log('[NOTE COPIED]');
      showToast('Note copied successfully ✨', 'success');
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('[COPY FAILED]', error);
      showToast('Failed to copy note', 'error');
      await triggerHaptic(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTimeout(() => {
        setIsCopying(false);
      }, 1500);
    }
  };

  const handleCopyFieldValue = async (val: string) => {
    console.log('[FIELD VALUE COPY PRESSED]');
    if (!val) {
      console.log('[COPY FAILED] Content is empty');
      showToast('Nothing to copy', 'warning');
      await triggerHaptic(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (isSecure) {
      console.log('[COPY BLOCKED - SECURE NOTE]');
      showToast('Copy disabled for secure notes 🔒', 'warning');
      await triggerHaptic(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    try {
      await Clipboard.setStringAsync(val);
      console.log('[FIELD VALUE COPIED]');
      showToast('Value copied successfully ✨', 'success');
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('[COPY FAILED]', error);
      showToast('Failed to copy value', 'error');
      await triggerHaptic(Haptics.NotificationFeedbackType.Error);
    }
  };

  // ── Animation Values ──────────────────────────────────────────
  const secureProgress = useSharedValue(0);
  const lockScale = useSharedValue(1);
  const lockRotate = useSharedValue(0);

  useEffect(() => {
    secureProgress.value = withTiming(isSecure ? 1 : 0, { duration: 300 });
    
    if (isSecure) {
      lockScale.value = withSequence(
        withTiming(1.3, { duration: 120 }),
        withSpring(1, { damping: 8 })
      );
      lockRotate.value = withSequence(
        withTiming(-15, { duration: 80 }),
        withTiming(15, { duration: 80 }),
        withSpring(0, { damping: 6 })
      );
    } else {
      lockScale.value = withSequence(
        withTiming(0.8, { duration: 120 }),
        withSpring(1, { damping: 8 })
      );
      lockRotate.value = withSpring(0);
    }
  }, [isSecure]);

  const animatedInputsStyle = useAnimatedStyle(() => {
    const editBorderColor = interpolateColor(
      editProgress.value,
      [0, 1],
      ['transparent', '#7C4DFF']
    );
    const secureBorderColor = interpolateColor(
      secureProgress.value,
      [0, 1],
      ['transparent', '#A855F7']
    );
    
    const borderColor = isSecure ? secureBorderColor : editBorderColor;
    const borderWidth = interpolate(editProgress.value, [0, 1], [1, 2]);

    const scale = interpolate(
      editProgress.value,
      [0, 1],
      [0.995, 1.0]
    );

    const shadowOpacity = interpolate(
      editProgress.value,
      [0, 1],
      [0, 0.08]
    );

    const shadowRadius = interpolate(
      editProgress.value,
      [0, 1],
      [0, 10]
    );

    const cardBgColor = isDark ? '#182235' : '#FFFFFF';
    const readModeBgColor = isDark ? '#0C1527' : '#F8FAFC';

    const baseBackgroundColor = interpolateColor(
      editProgress.value,
      [0, 1],
      [readModeBgColor, cardBgColor]
    );

    const backgroundColor = isSecure
      ? interpolateColor(
          secureProgress.value,
          [0, 1],
          [baseBackgroundColor, isDark ? '#1C152E' : '#FAF5FF']
        )
      : baseBackgroundColor;

    return {
      borderColor,
      borderWidth,
      borderRadius: 20,
      padding: 16,
      marginVertical: 10,
      backgroundColor,
      shadowColor: '#7C4DFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isSecure
        ? interpolate(secureProgress.value, [0, 1], [0, 0.12])
        : shadowOpacity,
      shadowRadius: isSecure
        ? interpolate(secureProgress.value, [0, 1], [0, 12])
        : shadowRadius,
      elevation: interpolate(editProgress.value, [0, 1], [0, 3]),
      transform: [{ scale }],
    };
  });

  const animatedLockStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: lockScale.value },
        { rotate: `${lockRotate.value}deg` }
      ]
    };
  });

  const animatedLockToggleStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      secureProgress.value,
      [0, 1],
      [theme.card, isDark ? '#2C1D42' : '#F3E8FF']
    );
    const borderColor = interpolateColor(
      secureProgress.value,
      [0, 1],
      [theme.border, isDark ? '#6B21A8' : '#D8B4FE']
    );
    return {
      backgroundColor,
      borderColor,
      borderWidth: 1,
    };
  });

  const triggerHaptic = async (type: Haptics.NotificationFeedbackType) => {
    try {
      await Haptics.notificationAsync(type);
    } catch (e) {
      console.log('[Haptics Not Available]');
    }
  };

  // ── Sync Handlers ──────────────────────────────────────────────
  const handleToggleSecure = async () => {
    const nextSecure = !isSecure;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (nextSecure) {
      console.log('[SECURE MODE ENABLED]');
      console.log('[SECURE CATEGORY AUTO-SELECTED]');
      setIsSecure(true);
      setCategory('Secure');
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
    } else {
      console.log('[SECURE MODE DISABLED]');
      setIsSecure(false);
      setCategory(previousCategory);
      await triggerHaptic(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleCategoryChange = async (cat: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (cat === 'Secure') {
      if (!isSecure) {
        console.log('[SECURE MODE ENABLED]');
        console.log('[SECURE CATEGORY AUTO-SELECTED]');
        setIsSecure(true);
        setCategory('Secure');
        await triggerHaptic(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      setPreviousCategory(cat);
      if (isSecure) {
        console.log('[SECURE MODE DISABLED]');
        setIsSecure(false);
        await triggerHaptic(Haptics.NotificationFeedbackType.Warning);
      }
      setCategory(cat);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log('[Haptics Not Available]', e);
    }

    const nextVal = !isFavorite;
    setIsFavorite(nextVal);

    if (isExistingNote) {
      try {
        await notesApi.updateNote(Number(id), { is_favorite: nextVal });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['note', id] });
      } catch (e) {
        setIsFavorite(!nextVal);
        Alert.alert('Error', 'Failed to toggle favorite');
      }
    }
  };

  const hasContent = () => {
    if (noteType === 'standard') {
      return content.trim().length > 0;
    }
    if (noteType === 'checklist') {
      return checklist.some(item => item.text.trim().length > 0);
    }
    if (noteType === 'field') {
      return fields.some(f => f.label.trim().length > 0 || f.value.trim().length > 0);
    }
    return false;
  };

  const { data: existingNote } = useQuery({
    queryKey: ['note', id],
    queryFn: () => notesApi.getNote(Number(id)),
    enabled: !!isExistingNote,
  });

  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title || '');
      const cat = existingNote.category || 'General';
      setCategory(cat);
      if (cat !== 'Secure') {
        setPreviousCategory(cat);
      }
      setNoteType(existingNote.note_type as any || 'standard');
      setIsSecure(Boolean(existingNote.is_secure));
      setIsFavorite(Boolean(existingNote.is_favorite));
      setIsEditing(false); // Open existing note in read mode initially
      
      if (existingNote.note_type === 'checklist' && Array.isArray(existingNote.checklist_items)) {
        setChecklist(existingNote.checklist_items.map(i => ({ 
          id: i.id.toString(), 
          text: i.text, 
          done: i.completed 
        })));
      } else if (existingNote.note_type === 'field' && existingNote.field_notes) {
        setFields(existingNote.field_notes.map(f => ({ 
          id: f.id.toString(), 
          label: f.label, 
          value: f.value 
        })));
      } else {
        setContent(existingNote.content || '');
      }
    }
  }, [existingNote]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: title || 'Untitled Note',
        category,
        note_type: noteType,
        is_secure: isSecure,
        is_favorite: isFavorite,
      };

      if (noteType === 'standard') {
        payload.content = content;
      } else if (noteType === 'checklist') {
        payload.checklist_items = checklist.map((item, idx) => ({
          text: item.text,
          completed: item.done,
          order: idx
        }));
      } else if (noteType === 'field') {
        payload.field_notes = fields.map((field, idx) => ({
          label: field.label,
          value: field.value,
          order: idx
        }));
      }

      if (isExistingNote) return notesApi.updateNote(Number(id), payload);
      return notesApi.createNote(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['note', id] });
      }
      setIsEditing(false);
      router.back();
    },
    onError: (err: any) => {
      console.error('Save failed:', err);
      Alert.alert('Error', `Failed to save note: ${err.message || 'Unknown error'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      return notesApi.deleteNote(Number(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      router.back();
    },
    onError: (err: any) => {
      console.error('Delete failed:', err);
      Alert.alert('Error', 'Failed to delete note');
    }
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteMutation.mutate() 
        },
      ]
    );
  };

  const ds = styles(theme, isDark, colors);

  const TypeChip = ({ active, icon, label, onPress }: any) => {
    return (
      <TouchableOpacity 
        style={[ds.typeChip, { borderColor: theme.border }, active && ds.typeChipActive]} 
        onPress={onPress}
      >
        <Ionicons name={icon} size={18} color={active ? '#FFFFFF' : theme.textSecondary} />
        <Text style={[ds.typeChipText, { color: theme.textSecondary }, active && ds.typeChipTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer style={ds.container}>
      <View style={ds.header}>
        <TouchableOpacity onPress={() => router.back()} style={ds.backBtn}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        
        <View style={ds.headerTitleContainer}>
          <Text style={[ds.headerTitle, { color: theme.text }]}>{isExistingNote ? 'Edit Note' : 'New Note'}</Text>
        </View>

        <View style={ds.headerActions}>
          {isEditing && isExistingNote && (
            <Animated.View entering={getFadeIn(0, 200)} exiting={getFadeOut(200)}>
              <TouchableOpacity 
                onPress={handleDelete} 
                style={[ds.deleteBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2' }]}
                disabled={deleteMutation.isPending}
              >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </TouchableOpacity>
            </Animated.View>
          )}

          <Pressable
            onPress={handleCopy}
            onPressIn={() => {
              isCopyPressed.value = true;
              copyScale.value = withTiming(0.92, { duration: 100 });
            }}
            onPressOut={() => {
              isCopyPressed.value = false;
              copyScale.value = withTiming(1, { duration: 100 });
            }}
            hitSlop={10}
            accessibilityLabel="Copy note content"
          >
            <View style={ds.copyBtnContainer}>
              <Animated.View style={[ds.rippleRing, animatedRippleStyle]} />
              <Animated.View style={[ds.copyBtn, animatedCopyBtnStyle]}>
                <Ionicons name="copy-outline" size={22} color={theme.primary} />
              </Animated.View>
            </View>
          </Pressable>

          {/* Favorite Toggle Button */}
          <Pressable
            onPress={handleToggleFavorite}
            hitSlop={10}
            accessibilityLabel="Toggle Favorite status"
          >
            <View style={ds.copyBtn}>
              <Ionicons 
                name={isFavorite ? "star" : "star-outline"} 
                size={22} 
                color={isFavorite ? "#F59E0B" : theme.primary} 
              />
            </View>
          </Pressable>

          {!isEditing ? (
            <Animated.View entering={getFadeIn(0, 200)} exiting={getFadeOut(200)}>
              <Pressable
                onPress={handleEnableEdit}
                onPressIn={() => {
                  editScale.value = withTiming(0.92, { duration: 100 });
                  isEditPressed.value = true;
                }}
                onPressOut={() => {
                  editScale.value = withTiming(1, { duration: 100 });
                  isEditPressed.value = false;
                }}
                hitSlop={10}
                accessibilityLabel="Enable edit mode"
              >
                <Animated.View style={[ds.copyBtn, animatedEditBtnStyle]}>
                  <Ionicons name="create-outline" size={22} color={theme.primary} />
                </Animated.View>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={getFadeIn(0, 200)} exiting={getFadeOut(200)}>
              <TouchableOpacity 
                onPress={() => {
                  console.log('Save button pressed');
                  saveMutation.mutate();
                }} 
                disabled={saveMutation.isPending}
              >
                <LinearGradient colors={colors.gradient.primary} style={ds.saveBtn}>
                  <Text style={ds.saveText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={ds.content}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={Platform.OS === 'ios' ? 60 : 100}
          extraHeight={120}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={handleContentPress} style={{ flex: 1 }}>
            <Animated.View pointerEvents={isEditing ? 'auto' : 'box-only'} style={animatedInputsStyle}>
              {/* Mode Badges & Metadata */}
              {isEditing ? (
                <Animated.View 
                  entering={getFadeInDown(0, 200)}
                  style={ds.badgeRow}
                >
                  <View style={[ds.editModeBadge, { backgroundColor: 'rgba(124, 77, 255, 0.1)' }]}>
                    <Text style={[ds.editModeText, { color: theme.primary }]}>EDITING ✏️</Text>
                  </View>
                  {saveStatus ? (
                    <Text style={[ds.saveStatusText, { color: theme.textSecondary }]}>{saveStatus}</Text>
                  ) : null}
                </Animated.View>
              ) : (
                <View style={ds.badgeRow}>
                  <Animated.View 
                    entering={getFadeInDown(0, 200)}
                    style={[ds.readModeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                  >
                    <Ionicons name="eye-outline" size={12} color={theme.textSecondary} />
                    <Text style={[ds.readModeText, { color: theme.textSecondary }]}>READ MODE</Text>
                  </Animated.View>
                  {existingNote && (
                    <Text style={[ds.lastEditedText, { color: theme.textSecondary }]}>
                      {getFormattedTime(existingNote.updated_at)}
                    </Text>
                  )}
                </View>
              )}

              {/* Title Field */}
              <TextInput
                ref={titleInputRef}
                style={ds.titleInput}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.text.tertiary}
                value={title}
                onChangeText={setTitle}
                multiline
                editable={isEditing}
                showSoftInputOnFocus={isEditing}
              />

              {/* Note Type Selector Chips */}
              {isEditing && (
                <View style={ds.typeSelector}>
                  <TypeChip active={noteType === 'standard'} icon="document-text-outline" label="Standard" onPress={() => setNoteType('standard')} />
                  <TypeChip active={noteType === 'checklist'} icon="checkbox-outline" label="Checklist" onPress={() => setNoteType('checklist')} />
                  <TypeChip active={noteType === 'field'} icon="list-outline" label="Field Note" onPress={() => setNoteType('field')} />
                </View>
              )}

              {/* Category Selector */}
              <View style={ds.categorySection}>
                <View style={[ds.sectionHeader, { marginBottom: 0 }]}>
                  <Text style={[ds.sectionTitle, { color: theme.textSecondary }]} numberOfLines={1}>CATEGORY</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity 
                      style={[
                        ds.compactCategoryChip, 
                        { 
                          backgroundColor: isDark ? 'rgba(124, 77, 255, 0.15)' : '#F5F3FF',
                          borderColor: isDark ? 'rgba(124, 77, 255, 0.3)' : '#E9D5FF'
                        }
                      ]}
                      onPress={() => isEditing && setCategoryModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={ds.compactCategoryEmoji}>{CATEGORY_ICONS[category] || '📋'}</Text>
                      <Text style={[ds.compactCategoryText, { color: theme.primary }]}>{category}</Text>
                      {isEditing && <Ionicons name="chevron-down" size={14} color={theme.primary} style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>

                    {isEditing && (
                      <TouchableOpacity onPress={handleToggleSecure}>
                        <Animated.View style={[ds.lockToggle, { backgroundColor: theme.card, borderColor: theme.border }, animatedLockToggleStyle]}>
                          <Animated.View style={animatedLockStyle}>
                            <Ionicons name={isSecure ? "lock-closed" : "lock-open-outline"} size={18} color={isSecure ? theme.primary : theme.textSecondary} />
                          </Animated.View>
                        </Animated.View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {isEditing && isSecure && !hasContent() && (
                <Animated.View entering={getFadeInDown()} exiting={getFadeOutUp()} style={[ds.helperTextContainer, { backgroundColor: isDark ? 'rgba(124,77,255,0.15)' : '#FAF5FF', borderColor: isDark ? 'rgba(124,77,255,0.3)' : '#E9D5FF' }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} />
                  <Text style={[ds.helperText, { color: theme.primary }]}>Secure notes are encrypted and hidden from AI access.</Text>
                </Animated.View>
              )}

              {/* Dynamic Content Areas */}
              <View style={ds.bodyArea}>
                {noteType === 'standard' && (
                  <TextInput
                    ref={bodyInputRef}
                    style={[
                      ds.bodyInput,
                      !isEditing && { lineHeight: 34, letterSpacing: 0.2, color: theme.textSecondary }
                    ]}
                    placeholder="Start writing..."
                    placeholderTextColor={colors.text.tertiary}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                    editable={isEditing}
                    showSoftInputOnFocus={isEditing}
                  />
                )}

              {noteType === 'checklist' && (
                <View>
                  {checklist.map((item, index) => (
                    <View key={item.id} style={ds.checkItem}>
                      <TouchableOpacity 
                        onPress={() => {
                          const n = [...checklist];
                          n[index].done = !n[index].done;
                          setChecklist(n);
                        }}
                        disabled={!isEditing}
                      >
                        <Ionicons name={item.done ? "checkmark-circle" : "ellipse-outline"} size={24} color={item.done ? theme.primary : theme.border} />
                      </TouchableOpacity>
                      <TextInput
                        style={[ds.checkInput, { color: theme.text }, item.done && ds.checkDone]}
                        value={item.text}
                        onChangeText={(t) => {
                          const n = [...checklist];
                          n[index].text = t;
                          setChecklist(n);
                        }}
                        placeholder="Add item..."
                        placeholderTextColor={colors.text.tertiary}
                        editable={isEditing}
                        showSoftInputOnFocus={isEditing}
                      />
                      {isEditing && (
                        <TouchableOpacity onPress={() => setChecklist(checklist.filter(i => i.id !== item.id))}>
                          <Ionicons name="remove-circle-outline" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {isEditing && (
                    <TouchableOpacity style={ds.addItemBtn} onPress={() => setChecklist([...checklist, { id: Date.now().toString(), text: '', done: false }])}>
                      <Ionicons name="add" size={20} color={theme.primary} />
                      <Text style={ds.addItemText}>Add New Item</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {noteType === 'field' && (
                <View style={ds.fieldsListContainer}>
                  {fields.map((field, index) => {
                    const detectedType = detectFieldType(field.value);
                    return (
                      <View key={field.id} style={[ds.fieldItemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        {/* Top Row: Icon + Label Input + Actions (Copy/Delete) */}
                        <View style={ds.fieldItemHeader}>
                          <View style={ds.fieldLabelWrapper}>
                            <Text style={ds.fieldIconEmoji}>{getFieldIcon(field.label)}</Text>
                            <TextInput
                              style={[
                                ds.fieldLabelInput, 
                                { 
                                  color: theme.textSecondary,
                                  textTransform: shouldUppercaseLabel(field.label) ? 'uppercase' : 'none'
                                }
                              ]}
                              value={field.label}
                              onChangeText={(t) => {
                                const n = [...fields];
                                n[index].label = t;
                                setFields(n);
                              }}
                              placeholder="Label"
                              placeholderTextColor={colors.text.tertiary}
                              editable={isEditing}
                              showSoftInputOnFocus={isEditing}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                          </View>
                          <View style={ds.fieldActionsWrapper}>
                            {/* Copy Button */}
                            <TouchableOpacity 
                              onPress={() => handleCopyFieldValue(field.value)}
                              style={ds.fieldActionButton}
                              hitSlop={8}
                              accessibilityLabel="Copy field value"
                            >
                              <Ionicons name="copy-outline" size={18} color={theme.textSecondary} />
                            </TouchableOpacity>
                            {/* Delete Button */}
                            {isEditing && (
                              <TouchableOpacity 
                                onPress={() => setFields(fields.filter(f => f.id !== field.id))}
                                style={ds.fieldActionButton}
                                hitSlop={8}
                                accessibilityLabel="Delete field"
                              >
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Bottom Content Area: Value Input (allows multi-line/wrapping) */}
                        <View style={ds.fieldValueWrapper}>
                          {!isEditing && detectedType ? (
                            <TouchableOpacity
                              onPress={() => handleInteractivePress(field.value, detectedType)}
                              activeOpacity={0.6}
                              style={ds.interactiveFieldContainer}
                            >
                              <View style={ds.interactiveFieldContent}>
                                <Text style={[ds.fieldValueText, { color: theme.text }]}>
                                  {field.value}
                                </Text>
                                <Ionicons 
                                  name={
                                    detectedType === 'url' 
                                      ? "open-outline" 
                                      : detectedType === 'email' 
                                      ? "mail-outline" 
                                      : "call-outline"
                                  } 
                                  size={14} 
                                  color={theme.primary} 
                                  style={ds.interactiveIcon}
                                />
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <TextInput
                              style={[
                                ds.fieldValueInput, 
                                { color: theme.text }
                              ]}
                              value={field.value}
                              onChangeText={(t) => {
                                const n = [...fields];
                                n[index].value = t;
                                setFields(n);
                              }}
                              placeholder="Value"
                              placeholderTextColor={colors.text.tertiary}
                              editable={isEditing}
                              showSoftInputOnFocus={isEditing}
                              multiline
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {isEditing && (
                    <TouchableOpacity style={ds.addItemBtn} onPress={() => setFields([...fields, { id: Date.now().toString(), label: '', value: '' }])}>
                      <Ionicons name="add" size={20} color={theme.primary} />
                      <Text style={ds.addItemText}>Add New Field</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        </Pressable>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <Animated.View
          entering={getFadeInDown(0, 350).springify()}
          exiting={getFadeOutUp(250)}
          style={[
            ds.toastWrapper,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 16,
              elevation: 6,
            }
          ]}
        >
          <BlurView
            intensity={isDark ? 80 : 90}
            tint={isDark ? 'dark' : 'light'}
            style={[
              ds.toastContainer,
              {
                backgroundColor: isDark ? 'rgba(20, 20, 30, 0.85)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: isDark ? 'rgba(124, 77, 255, 0.25)' : 'rgba(124, 77, 255, 0.15)',
              }
            ]}
          >
            <Animated.View entering={getZoomIn()}>
              <Ionicons
                name={
                  toast.type === 'success'
                    ? 'checkmark-circle'
                    : toast.type === 'warning'
                    ? 'alert-circle'
                    : 'close-circle'
                }
                size={22}
                color={
                  toast.type === 'success'
                    ? '#10B981'
                    : toast.type === 'warning'
                    ? '#F59E0B'
                    : '#EF4444'
                }
              />
            </Animated.View>
            <Text style={[ds.toastText, { color: isDark ? '#FFFFFF' : '#111111' }]}>
              {toast.message}
            </Text>
          </BlurView>
        </Animated.View>
      )}

      {showHint && !isEditing && (
        <Animated.View
          entering={getFadeInDown(0, 400).springify()}
          exiting={getFadeOut(300)}
          style={[
            ds.hintWrapper,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 16,
              elevation: 6,
            }
          ]}
        >
          <BlurView
            intensity={isDark ? 80 : 90}
            tint={isDark ? 'dark' : 'light'}
            style={[
              ds.hintContainer,
              {
                backgroundColor: isDark ? 'rgba(20, 20, 30, 0.85)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: isDark ? 'rgba(124, 77, 255, 0.25)' : 'rgba(124, 77, 255, 0.15)',
              }
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
            <Text style={[ds.hintText, { color: isDark ? '#FFFFFF' : '#111111' }]}>
              Double tap anywhere to edit ✨
            </Text>
          </BlurView>
        </Animated.View>
      )}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={ds.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <BlurView intensity={isDark ? 80 : 90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setCategoryModalVisible(false)} />
          
          <Animated.View 
            entering={getFadeInDown(0, 300).springify()}
            style={[ds.bottomSheet, { backgroundColor: theme.background, maxHeight: '80%' }]}
          >
            <View style={ds.bottomSheetHeader}>
              <Text style={[ds.bottomSheetTitle, { color: theme.text }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={[ds.categorySearchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} />
              <TextInput
                style={[ds.categorySearchInput, { color: theme.text }]}
                placeholder="Search categories..."
                placeholderTextColor={theme.textSecondary}
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
                autoCapitalize="none"
              />
              {categorySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                  <Ionicons name="close" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={ds.bottomSheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {CATEGORIES.filter(c => c.toLowerCase().includes(categorySearchQuery.toLowerCase())).map(cat => (
                <TouchableOpacity 
                  key={cat}
                  style={[
                    ds.bottomSheetItem, 
                    category === cat && [ds.bottomSheetItemSelected, { backgroundColor: isDark ? 'rgba(124, 77, 255, 0.15)' : '#F5F3FF', borderColor: theme.primary }]
                  ]}
                  onPress={() => {
                    console.log('Category pressed:', cat);
                    Haptics.selectionAsync();
                    handleCategoryChange(cat);
                    console.log('Category updated:', cat);
                    setCategoryModalVisible(false);
                    setCategorySearchQuery('');
                  }}
                >
                  <View style={ds.bottomSheetItemContent}>
                    <View style={[ds.categoryIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                      <Text style={ds.bottomSheetItemEmoji}>{CATEGORY_ICONS[cat]}</Text>
                    </View>
                    <Text style={[
                      ds.bottomSheetItemText, 
                      { color: theme.text },
                      category === cat && [ds.bottomSheetItemTextSelected, { color: theme.primary }]
                    ]}>
                      {cat}
                    </Text>
                  </View>
                  {category === cat && (
                    <Animated.View entering={getZoomIn()}>
                      <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                    </Animated.View>
                  )}
                </TouchableOpacity>
              ))}
              {CATEGORIES.filter(c => c.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.textSecondary }}>No categories found</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 10,
  },
  headerTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  saveText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 25,
  },
  titleInput: {
    ...typography.displaySmall,
    color: theme.text,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: theme.card,
    borderWidth: 1.2,
  },
  typeChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  typeChipText: {
    ...typography.caption,
    fontWeight: '700',
    marginLeft: 6,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categorySection: {
    marginBottom: 25,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChipSelectedWrapper: {
    borderRadius: 20,
    overflow: 'visible',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  catChipSelectedGlowDark: {
    shadowColor: '#7C4DFF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  catChipSelectedGlowLight: {
    shadowColor: '#7C4DFF',
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  catChipSelectedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  catChipUnselected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.2,
    gap: 6,
    opacity: 0.85,
  },
  catChipEmoji: {
    fontSize: 14,
  },
  catChipText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  catChipTextActive: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  helperText: {
    ...typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  lockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1.2,
  },
  lockText: {
    ...typography.caption,
    fontWeight: '800',
  },
  bodyArea: {
    minHeight: 400,
  },
  bodyInput: {
    ...typography.bodyLarge,
    color: theme.text,
    lineHeight: 26,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 15,
  },
  checkInput: {
    flex: 1,
    ...typography.bodyLarge,
  },
  checkDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  fieldsListContainer: {
    gap: 12,
    marginBottom: 20,
  },
  fieldItemCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 8,
  },
  fieldLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fieldIconEmoji: {
    fontSize: 16,
  },
  fieldLabelInput: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    padding: 0,
  },
  fieldActionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldActionButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldValueWrapper: {
    marginTop: 4,
  },
  fieldValueInput: {
    ...typography.bodyMedium,
    fontWeight: '600',
    lineHeight: 22,
    padding: 0,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 10,
  },
  addItemText: {
    ...typography.bodyMedium,
    color: theme.primary,
    fontWeight: '700',
    marginLeft: 10,
  },
  copyBtnContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#7C4DFF',
    backgroundColor: 'rgba(124, 77, 255, 0.2)',
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(124, 77, 255, 0.15)' : '#EDE9FE',
  },
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 50,
    left: 25,
    right: 25,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 9999,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  toastText: {
    ...typography.bodyMedium,
    fontWeight: '600',
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  editModeText: {
    ...typography.caption,
    fontWeight: '800',
  },
  saveStatusText: {
    ...typography.caption,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  readModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  readModeText: {
    ...typography.caption,
    fontWeight: '800',
  },
  lastEditedText: {
    ...typography.caption,
    fontWeight: '600',
  },
  hintWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 9999,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  hintText: {
    ...typography.caption,
    fontWeight: '800',
  },
  interactiveFieldContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#7C4DFF',
    paddingBottom: 2,
    marginVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  interactiveFieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldValueText: {
    ...typography.bodyMedium,
    fontWeight: '600',
    lineHeight: 22,
    flexShrink: 1,
  },
  interactiveIcon: {
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomSheetTitle: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  bottomSheetScroll: {
    marginBottom: 20,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  bottomSheetItemSelected: {
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.3)',
  },
  bottomSheetItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomSheetItemEmoji: {
    fontSize: 20,
  },
  bottomSheetItemText: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  bottomSheetItemTextSelected: {
    fontWeight: '800',
  },
  compactCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  compactCategoryEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  compactCategoryText: {
    ...typography.bodySmall,
    fontWeight: '800',
  },
  categorySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  categorySearchInput: {
    flex: 1,
    marginLeft: 10,
    ...typography.bodyMedium,
  },
  categoryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});
