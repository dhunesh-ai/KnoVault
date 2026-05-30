import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { GradientButton } from '../../src/components/GradientButton';
import { ThemedInput } from '../../src/components/ThemedInput';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';

export default function RegisterScreen() {
  const { colors, theme, isDark } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const router = useRouter();
  const { register, isAuthenticating, error, clearError } = useAuthStore();

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Reset state on mount/focus
  useEffect(() => {
    useAuthStore.getState().logout(); // This clears token, user, and isAuthenticating
  }, []);

  const validateForm = (): boolean => {
    console.log('[Register] Validating form...');
    let valid = true;
    clearError();

    if (!fullName.trim()) {
      console.log('[Register] Validation Error: Name missing');
      setNameError('Full name is required');
      valid = false;
    } else {
      setNameError(null);
    }

    if (!email.trim()) {
      console.log('[Register] Validation Error: Email missing');
      setEmailError('Email is required');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      console.log('[Register] Validation Error: Email invalid format');
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError(null);
    }

    console.log('[Register] Form validation result:', valid);
    return valid;
  };

  const handleRegister = async () => {
    console.log('--- Button clicked ---');
    console.log('Full Name:', fullName);
    console.log('Email:', email);
    
    if (!validateForm()) {
      console.log('[Register] Validation failed, stopping.');
      return;
    }

    try {
      console.log('Sending OTP request...');
      await register(
        email.trim().toLowerCase(),
        fullName.trim(),
      );
      
      console.log('OTP API success');
      console.log('[Register] Navigating to verify screen...');
      
      // Navigate to verification screen
      router.push({
        pathname: '/(auth)/verify',
        params: { email: email.trim().toLowerCase(), purpose: 'signup' }
      });
    } catch (error: any) {
      console.error('[Register] Error occurred:', error);
      Alert.alert('Error', error?.message || 'Something went wrong');
    }
  };

  const ds = styles(theme, isDark, colors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={ds.container}
    >
      <ScrollView
        contentContainerStyle={ds.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <LinearGradient
          colors={colors.gradient.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ds.header}
        >
          <TouchableOpacity
            style={ds.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={ds.headerContent}>
            <View style={ds.iconCircle}>
              <Ionicons name="person-add" size={28} color="#FFFFFF" />
            </View>
            <Text style={ds.headerTitle}>Create Account</Text>
            <Text style={ds.headerSubtitle}>
              Join KnoVault and boost your productivity
            </Text>
          </View>
        </LinearGradient>

        {/* ── Form ────────────────────────────────────────── */}
        <View style={ds.formContainer}>
          {error && (
            <View style={ds.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={isDark ? '#FCA5A5' : '#EF4444'} />
              <Text style={ds.errorBannerText}>{error}</Text>
            </View>
          )}

          <ThemedInput
            label="Full Name"
            placeholder="John Doe"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              setNameError(null);
            }}
            error={nameError}
            icon="person-outline"
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
          />

          <ThemedInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError(null);
              clearError();
            }}
            error={emailError}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <GradientButton
            title="Continue"
            onPress={handleRegister}
            loading={isAuthenticating}
            disabled={isAuthenticating}
            style={ds.registerButton}
          />

          <View style={ds.dividerContainer}>
            <View style={[ds.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
            <Text style={[ds.dividerText, { color: theme.textSecondary }]}>OR</Text>
            <View style={[ds.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
          </View>

          <TouchableOpacity
            style={[ds.googleButton, { backgroundColor: isDark ? '#2D2452' : '#FFFFFF', borderColor: isDark ? '#3A3065' : '#E5E7EB' }]}
            onPress={async () => {
              await useAuthStore.getState().loginWithGoogle();
            }}
            disabled={isAuthenticating}
          >
            <Ionicons name="logo-google" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
            <Text style={[ds.googleButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={ds.footer}>
            <Text style={[ds.footerText, { color: theme.textSecondary }]}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[ds.footerLink, { color: theme.primary }]}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // ── Header ──────────────────────────────────────────────
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.xxl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    ...typography.displayMedium,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  // ── Form ────────────────────────────────────────────────
  formContainer: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
  },
  errorBannerText: {
    ...typography.bodyMedium,
    color: isDark ? '#FCA5A5' : '#EF4444',
    marginLeft: spacing.sm,
    flex: 1,
  },
  registerButton: {
    marginTop: spacing.sm,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typography.bodyMedium,
    marginHorizontal: spacing.md,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  googleButtonText: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  footerText: {
    ...typography.bodyMedium,
  },
  footerLink: {
    ...typography.titleMedium,
  },
});
