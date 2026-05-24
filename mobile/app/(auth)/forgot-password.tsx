import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing } from '../../src/theme';
import { GradientButton } from '../../src/components/GradientButton';
import { ThemedInput } from '../../src/components/ThemedInput';
import { authApi } from '../../src/api/auth';

export default function ForgotPasswordScreen() {
  const { colors, theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const router = useRouter();

  const handleRequestOtp = async () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      router.push({
        pathname: '/(auth)/verify',
        params: { email: email.trim().toLowerCase(), purpose: 'reset' }
      });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const ds = styles(theme, isDark, colors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={ds.container}
    >
      <View style={ds.content}>
        <TouchableOpacity style={ds.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={ds.header}>
          <Text style={[ds.title, { color: theme.text }]}>Forgot Password?</Text>
          <Text style={[ds.subtitle, { color: theme.textSecondary }]}>
            Enter your email address and we'll send you a 6-digit code to reset your password.
          </Text>
        </View>

        <ThemedInput
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError(null);
          }}
          error={emailError}
          icon="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <GradientButton
          title="Send Reset Code"
          onPress={handleRequestOtp}
          loading={isLoading}
          disabled={isLoading}
          style={ds.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (theme: any, isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.displayMedium,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    lineHeight: 24,
  },
  button: {
    marginTop: spacing.xl,
  },
});
