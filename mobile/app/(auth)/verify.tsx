import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { typography, spacing, borderRadius } from '../../src/theme';
import { GradientButton } from '../../src/components/GradientButton';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';

export default function VerifyScreen() {
  const { colors, theme, isDark } = useTheme();
  const { email, purpose } = useLocalSearchParams<{ email: string; purpose: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const router = useRouter();
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Please enter all 6 digits.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyOtp(email, code);
      
      if (response.purpose === 'signup') {
        router.push({
          pathname: '/(auth)/create-password',
          params: { email, code }
        });
      } else if (response.purpose === 'reset' || response.purpose === 'verification') {
        router.push({
          pathname: '/(auth)/reset-password',
          params: { email, code }
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Invalid or expired code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    
    setResendLoading(true);
    try {
      await authApi.resendOtp(email, purpose);
      setTimer(60);
      Alert.alert('OTP Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to resend code.');
    } finally {
      setResendLoading(false);
    }
  };

  const ds = styles(theme, isDark, colors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={ds.container}
    >
      <View style={ds.content}>
        <TouchableOpacity 
          style={ds.backButton} 
          onPress={async () => {
            await useAuthStore.getState().logout();
            router.replace('/(auth)/login');
          }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={ds.header}>
          <Text style={[ds.title, { color: theme.text }]}>Verify Email</Text>
          <Text style={[ds.subtitle, { color: theme.textSecondary }]}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={[ds.emailText, { color: theme.primary }]}>{email}</Text>
          </Text>
        </View>

        <View style={ds.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[ds.otpInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <GradientButton
          title="Verify Now"
          onPress={handleVerify}
          loading={isLoading}
          disabled={isLoading}
          style={ds.verifyButton}
        />

        <View style={ds.resendContainer}>
          <Text style={[ds.resendText, { color: theme.textSecondary }]}>Didn't receive the code?</Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0 || resendLoading}>
            <Text style={[ds.resendLink, { color: theme.primary }, timer > 0 && ds.resendDisabled]}>
              {resendLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : timer > 0 ? (
                ` Resend in ${timer}s`
              ) : (
                ' Resend Code'
              )}
            </Text>
          </TouchableOpacity>
        </View>
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
  emailText: {
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxxl,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderRadius: borderRadius.md,
    borderWidth: 1.2,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  verifyButton: {
    marginTop: spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  resendText: {
    ...typography.bodyMedium,
  },
  resendLink: {
    ...typography.titleMedium,
  },
  resendDisabled: {
    color: theme.textSecondary,
    opacity: 0.6,
  },
});
