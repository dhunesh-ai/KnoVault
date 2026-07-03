import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/useTheme';
import { getThemedShadow } from './ThemedComponents';
import { typography, spacing } from '../theme';
import { secureNotesApi } from '../api/secureNotes';
import { useAuthStore } from '../store/authStore';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { logNotificationToHistory } from '../store/notificationStore';

interface SecurityOverlayProps {
  visible: boolean;
  onAuthenticate: () => void;
  onCancel: () => void;
}

type DialogStep = 'unlock' | 'set_password' | 'forgot_otp' | 'reset_password';

export const SecurityOverlay: React.FC<SecurityOverlayProps> = ({
  visible,
  onAuthenticate,
  onCancel,
}) => {
  const { colors, theme, isDark, danger } = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<DialogStep>('unlock');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password fields
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Set/Reset password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP field
  const [otpCode, setOtpCode] = useState('');

  // Lockout states
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0); // in seconds

  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Clear inputs when modal is toggled
  useEffect(() => {
    if (visible) {
      setStep('unlock');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setErrorMsg('');
      setSuccessMsg('');
      setShowPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      checkStatus();
    }
  }, [visible]);

  // Lockout Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutTimeLeft > 0) {
      interval = setInterval(() => {
        setLockoutTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsLocked(false);
            setErrorMsg('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  const triggerHaptic = async (type: Haptics.NotificationFeedbackType) => {
    try {
      await Haptics.notificationAsync(type);
    } catch (e) {}
  };

  const triggerSelectionHaptic = async () => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {}
  };

  const checkStatus = async () => {
    try {
      setLoading(true);
      const statusRes = await secureNotesApi.getStatus();
      if (!statusRes.is_password_set) {
        setStep('set_password');
      } else {
        setStep('unlock');
        if (statusRes.is_locked && statusRes.locked_until) {
          const lockTime = new Date(statusRes.locked_until).getTime();
          const nowTime = new Date().getTime();
          const diffSecs = Math.max(0, Math.floor((lockTime - nowTime) / 1000));
          if (diffSecs > 0) {
            setIsLocked(true);
            setLockoutTimeLeft(diffSecs);
            setErrorMsg(`Too many failed attempts. Try again in ${formatTime(diffSecs)}.`);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to fetch security status');
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Password Strength Evaluator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '#EF4444' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: '#EF4444' };
    if (score <= 4) return { score, label: 'Medium', color: '#F59E0B' };
    return { score, label: 'Strong', color: '#10B981' };
  };

  const strength = getPasswordStrength(newPassword);

  // Action Handlers
  const handleUnlock = async () => {
    if (!password) {
      setErrorMsg('Password is required');
      triggerShake();
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await secureNotesApi.verifyPassword(password);
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
      onAuthenticate();
    } catch (err: any) {
      await triggerHaptic(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      const backendMsg = err.response?.data?.detail || err.message || 'Incorrect secure password';
      setErrorMsg(backendMsg);
      if (err.response?.status === 423) {
        // Locked
        setIsLocked(true);
        setLockoutTimeLeft(300); // 5 minutes
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 6 || newPassword.length > 32) {
      setErrorMsg('Password must be between 6 and 32 characters');
      triggerShake();
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      triggerShake();
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await secureNotesApi.setPassword(newPassword);
      queryClient.invalidateQueries({ queryKey: ['secureNotesStatus'] });
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
      setSuccessMsg('Secure Notes Password set successfully!');
      logNotificationToHistory(
        '🛡️ Secure Protection Enabled',
        'Secure notes protection has been enabled with a secure password.',
        'security',
        { type: 'security' }
      );
      setTimeout(() => {
        setSuccessMsg('');
        setStep('unlock');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err: any) {
      await triggerHaptic(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to set secure password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await secureNotesApi.sendResetOtp();
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
      setStep('forgot_otp');
      setOtpCode('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to send reset OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setErrorMsg('Enter a valid 6-digit OTP code');
      triggerShake();
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await secureNotesApi.verifyResetOtp(otpCode);
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
      setStep('reset_password');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      triggerShake();
      setErrorMsg(err.response?.data?.detail || err.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6 || newPassword.length > 32) {
      setErrorMsg('Password must be between 6 and 32 characters');
      triggerShake();
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      triggerShake();
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await secureNotesApi.resetPassword(otpCode, newPassword);
      queryClient.invalidateQueries({ queryKey: ['secureNotesStatus'] });
      await triggerHaptic(Haptics.NotificationFeedbackType.Success);
      setSuccessMsg('Secure password reset successfully!');
      logNotificationToHistory(
        '🔑 Secure Password Reset',
        'Your Secure Notes password has been reset successfully using OTP.',
        'security',
        { type: 'security' }
      );
      setTimeout(() => {
        setSuccessMsg('');
        setStep('unlock');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpCode('');
      }, 1500);
    } catch (err: any) {
      await triggerHaptic(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to reset secure password');
    } finally {
      setLoading(false);
    }
  };

  const formatEmail = (emailStr?: string) => {
    if (!emailStr) return 'your email';
    const parts = emailStr.split('@');
    if (parts.length < 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    const masked = name.slice(0, 2) + '***' + name.slice(-1);
    return `${masked}@${domain}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        
        <Animated.View style={[
          styles.content, 
          { 
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderTopWidth: 1.2,
            transform: [{ translateX: shakeAnimation }],
            ...getThemedShadow(theme, 'strong')
          }
        ]}>
          <View style={styles.header}>
            <Image 
              source={{ uri: 'https://img.icons8.com/color/96/google-logo.png' }}
              style={styles.logo}
              defaultSource={require('../../assets/icon.png')}
            />
            <Text style={[styles.brand, { color: theme.textSecondary }]}>KnoVault Security</Text>
          </View>

          {/* Error Message display */}
          {errorMsg ? (
            <View style={[styles.errorContainer, { backgroundColor: `${danger}15` }]}>
              <Ionicons name="alert-circle" size={16} color={danger} />
              <Text style={[styles.errorText, { color: danger }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Success Message display */}
          {successMsg ? (
            <View style={[styles.successContainer, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          )}

          {/* STEP 1: UNLOCK */}
          {step === 'unlock' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.title, { color: theme.text }]}>🔒 Secure Note</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Enter Secure Password
              </Text>

              <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Ionicons name="key-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLocked && !loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: theme.primary }, (isLocked || loading) && styles.btnDisabled]}
                onPress={handleUnlock}
                disabled={isLocked || loading}
              >
                <Text style={styles.btnText}>Unlock</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.forgotLink}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: SET PASSWORD (CREATE FLOW) */}
          {step === 'set_password' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.title, { color: theme.text }]}>🔒 Create Secure Password</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Secure Notes require a separate independent password.
              </Text>

              <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="New Secure Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons 
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              {/* Password strength indicator */}
              {newPassword ? (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBg}>
                    <View style={[styles.strengthBarFill, { width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>Strength: {strength.label}</Text>
                </View>
              ) : null}

              <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background, marginTop: 12 }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Confirm Secure Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: theme.primary }, loading && styles.btnDisabled]}
                onPress={handleSetPassword}
                disabled={loading}
              >
                <Text style={styles.btnText}>Create Password</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: FORGOT OTP */}
          {step === 'forgot_otp' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.title, { color: theme.text }]}>🔑 Verify Identity</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                We sent a 6-digit OTP code to {formatEmail(user?.email)}.
              </Text>

              <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Ionicons name="mail-unread-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text, letterSpacing: 4, fontWeight: 'bold' }]}
                  placeholder="6-Digit OTP"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: theme.primary }, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                <Text style={styles.btnText}>Verify OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.forgotLink}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={[styles.forgotText, { color: theme.primary }]}>Resend OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4: RESET PASSWORD */}
          {step === 'reset_password' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.title, { color: theme.text }]}>🔒 Reset Secure Password</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Enter your new Secure Notes Password.
              </Text>

              <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="New Secure Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons 
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              {/* Password strength indicator */}
              {newPassword ? (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBg}>
                    <View style={[styles.strengthBarFill, { width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>Strength: {strength.label}</Text>
                </View>
              ) : null}

              <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background, marginTop: 12 }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Confirm Secure Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: theme.primary }, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={styles.btnText}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer Action: Cancel */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
    minHeight: '55%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  logo: {
    width: 24,
    height: 24,
  },
  brand: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodyMedium,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.2,
    paddingHorizontal: 16,
    height: 54,
    width: '100%',
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  btn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  forgotLink: {
    marginTop: 18,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: 25,
    right: 25,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 10,
    gap: 8,
  },
  strengthBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
