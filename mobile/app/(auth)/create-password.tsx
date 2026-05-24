import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { GradientButton } from '../../src/components/GradientButton';
import { ThemedInput } from '../../src/components/ThemedInput';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';

export default function CreatePasswordScreen() {
  const { colors, theme, isDark } = useTheme();
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const router = useRouter();
  const { completeSignup, isAuthenticating, error } = useAuthStore();

  const validateForm = (): boolean => {
    let valid = true;

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError('Include at least one uppercase letter');
      valid = false;
    } else if (!/[0-9]/.test(password)) {
      setPasswordError('Include at least one number');
      valid = false;
    } else {
      setPasswordError(null);
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      valid = false;
    } else {
      setConfirmError(null);
    }

    return valid;
  };

  const handleFinish = async () => {
    if (!validateForm()) return;

    const success = await completeSignup(email, code, password);
    if (success) {
      Alert.alert(
        'Account Ready! 🚀',
        'Your account has been created successfully. You can now sign in.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }]
      );
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
      >
        <LinearGradient
          colors={colors.gradient.primary}
          style={ds.header}
        >
          <View style={ds.iconCircle}>
            <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
          </View>
          <Text style={ds.title}>Secure Your Account</Text>
          <Text style={ds.subtitle}>Create a strong password for {email}</Text>
        </LinearGradient>

        <View style={ds.form}>
          {error && (
            <View style={ds.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={isDark ? '#FCA5A5' : '#EF4444'} />
              <Text style={ds.errorText}>{error}</Text>
            </View>
          )}

          <ThemedInput
            label="Create Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            isPassword
            icon="lock-closed-outline"
          />

          <ThemedInput
            label="Confirm Password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmError}
            isPassword
            icon="shield-checkmark-outline"
          />

          <View style={ds.hints}>
             <PasswordHint met={password.length >= 8} label="8+ characters" theme={theme} isDark={isDark} />
             <PasswordHint met={/[A-Z]/.test(password)} label="Uppercase letter" theme={theme} isDark={isDark} />
             <PasswordHint met={/[0-9]/.test(password)} label="One number" theme={theme} isDark={isDark} />
          </View>

          <GradientButton
            title="Create Account"
            onPress={handleFinish}
            loading={isAuthenticating}
            disabled={isAuthenticating}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordHint({ met, label, theme, isDark }: { met: boolean; label: string; theme: any; isDark: boolean }) {
  return (
    <View style={hintStyles.hintRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? '#10B981' : theme.textSecondary}
        style={{ opacity: met ? 1 : 0.6 }}
      />
      <Text style={[
        hintStyles.hintText, 
        { color: theme.textSecondary }, 
        met && { color: isDark ? '#A7F3D0' : '#065F46', fontWeight: '600' as const }
      ]}>
        {label}
      </Text>
    </View>
  );
}

const hintStyles = StyleSheet.create({
  hintRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  hintText: { ...typography.bodySmall, marginLeft: spacing.sm },
});

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.displaySmall, color: '#FFFFFF', textAlign: 'center' },
  subtitle: { ...typography.bodyMedium, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', marginTop: spacing.xs },
  form: { padding: spacing.xxl, marginTop: spacing.lg },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
  },
  errorText: { ...typography.bodyMedium, color: isDark ? '#FCA5A5' : '#EF4444', marginLeft: spacing.sm },
  hints: { marginBottom: spacing.xl },
});
