import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing } from '../../src/theme';
import { GradientButton } from '../../src/components/GradientButton';
import { ThemedInput } from '../../src/components/ThemedInput';
import { authApi } from '../../src/api/auth';

export default function ResetPasswordScreen() {
  const { colors, theme, isDark } = useTheme();
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!code) {
      Alert.alert('Error', 'Verification code is missing.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        email,
        code,
        new_password: newPassword,
      });
      Alert.alert(
        'Success! 🎉',
        'Your password has been reset successfully.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to reset password.');
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
      <ScrollView contentContainerStyle={ds.scrollContent}>
        <TouchableOpacity style={ds.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={ds.header}>
          <Text style={[ds.title, { color: theme.text }]}>New Password</Text>
          <Text style={[ds.subtitle, { color: theme.textSecondary }]}>
            Set a new strong password for your account.
          </Text>
        </View>

        <ThemedInput
          label="New Password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChangeText={setNewPassword}
          isPassword
          icon="lock-closed-outline"
        />

        <ThemedInput
          label="Confirm New Password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          isPassword
          icon="shield-checkmark-outline"
        />

        <GradientButton
          title="Update Password"
          onPress={handleReset}
          loading={isLoading}
          disabled={isLoading}
          style={ds.button}
        />
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
    paddingHorizontal: spacing.xxl,
    paddingTop: 60,
    paddingBottom: 40,
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
