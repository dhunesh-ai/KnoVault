import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { GradientButton } from '../../src/components/GradientButton';
import { ThemedInput } from '../../src/components/ThemedInput';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';

export default function LoginScreen() {
  const { colors, theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const router = useRouter();
  const { login, isAuthenticating, error, clearError } = useAuthStore();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = (): boolean => {
    let valid = true;
    clearError();

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    } else {
      setPasswordError(null);
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    await login(email.trim().toLowerCase(), password);
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
        {/* ── Hero Section ─────────────────────────────────── */}
        <LinearGradient
          colors={colors.gradient.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ds.heroGradient}
        >
          <Animated.View
            style={[
              ds.logoContainer,
              { transform: [{ scale: logoScale }] },
            ]}
          >
            <View style={ds.logoCircle}>
              <Ionicons name="flash" size={32} color="#FFFFFF" />
            </View>
          </Animated.View>
          <Text style={ds.heroTitle}>KnoVault</Text>
          <Text style={ds.heroSubtitle}>Your intelligent productivity hub</Text>
        </LinearGradient>

        {/* ── Form Section ─────────────────────────────────── */}
        <Animated.View
          style={[
            ds.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[ds.welcomeTitle, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[ds.welcomeSubtitle, { color: theme.textSecondary }]}>
            Sign in to continue your journey
          </Text>

          {error && (
            <View style={ds.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={isDark ? '#FCA5A5' : '#EF4444'} />
              <Text style={ds.errorBannerText}>{error}</Text>
            </View>
          )}

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
            returnKeyType="next"
          />

          <ThemedInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError(null);
              clearError();
            }}
            error={passwordError}
            icon="lock-closed-outline"
            isPassword
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity 
            onPress={() => router.push('/(auth)/forgot-password')}
            style={ds.forgotPassword}
          >
            <Text style={[ds.forgotPasswordText, { color: theme.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <GradientButton
            title="Sign In"
            onPress={handleLogin}
            loading={isAuthenticating}
            disabled={isAuthenticating}
            style={ds.loginButton}
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

          {/* ── Footer ─────────────────────────────────────── */}
          <View style={ds.footer}>
            <Text style={[ds.footerText, { color: theme.textSecondary }]}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[ds.footerLink, { color: theme.primary }]}> Create Account</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
  // ── Hero ────────────────────────────────────────────────
  heroGradient: {
    paddingTop: 80,
    paddingBottom: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroTitle: {
    ...typography.displayLarge,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // ── Form ────────────────────────────────────────────────
  formContainer: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
  },
  welcomeTitle: {
    ...typography.displaySmall,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    ...typography.bodyLarge,
    marginBottom: spacing.xxxl,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  loginButton: {
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
  // ── Footer ──────────────────────────────────────────────
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
