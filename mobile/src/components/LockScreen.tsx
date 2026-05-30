import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../theme';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';

const { width } = Dimensions.get('window');

interface LockScreenProps {
  onUnlock?: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { theme, isDark } = useTheme();
  const { verifyPasscode, disablePasscode } = useSettingsStore();
  const { logout } = useAuthStore();
  
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Optional: Try Biometrics on mount
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock KnoVault',
          cancelLabel: 'Use PIN',
          disableDeviceFallback: true,
        });
        if (result.success) {
          useSettingsStore.getState().setUnlocked(true);
          if (onUnlock) onUnlock();
        }
      }
    })();
  }, []);

  const handlePress = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrorMsg(null);
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-submit if 4 or 6 digits
      if (newPin.length === 4 || newPin.length === 6) {
        // Delay slightly for visual feedback
        setTimeout(() => checkPin(newPin), 100);
      }
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrorMsg(null);
    setPin(pin.slice(0, -1));
  };

  const checkPin = (currentPin: string) => {
    const isValid = verifyPasscode(currentPin);
    if (isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onUnlock) onUnlock();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg('Incorrect Passcode');
      // Clear pin if wrong
      setTimeout(() => setPin(''), 400);
    }
  };

  const handleForgot = () => {
    Alert.alert(
      'Forgot Passcode?',
      'To reset your passcode, you must sign out and sign back in. All your local offline data not synced to the cloud may be lost depending on your sync status. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out & Reset', 
          style: 'destructive',
          onPress: async () => {
            await disablePasscode();
            await logout();
          }
        }
      ]
    );
  };

  const renderDot = (index: number) => {
    const isFilled = index < pin.length;
    return (
      <View
        key={index}
        style={[
          styles.dot,
          { borderColor: theme.text },
          isFilled && { backgroundColor: theme.text }
        ]}
      />
    );
  };

  const renderKey = (num: string) => (
    <TouchableOpacity 
      style={[styles.key, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
      onPress={() => handlePress(num)}
      activeOpacity={0.7}
    >
      <Text style={[styles.keyText, { color: theme.text }]}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={true} transparent={false} animationType="fade">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={48} color={theme.text} style={{ marginBottom: 20 }} />
          <Text style={[styles.title, { color: theme.text }]}>Enter Passcode</Text>
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Enter your 4 or 6 digit PIN</Text>
          )}
        </View>

        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3, 4, 5].map(renderDot)}
        </View>

        <View style={styles.keypad}>
          <View style={styles.row}>
            {renderKey('1')}
            {renderKey('2')}
            {renderKey('3')}
          </View>
          <View style={styles.row}>
            {renderKey('4')}
            {renderKey('5')}
            {renderKey('6')}
          </View>
          <View style={styles.row}>
            {renderKey('7')}
            {renderKey('8')}
            {renderKey('9')}
          </View>
          <View style={styles.row}>
            <View style={styles.keyInvisible} />
            {renderKey('0')}
            <TouchableOpacity 
              style={[styles.key, { backgroundColor: 'transparent' }]} 
              onPress={handleDelete}
              onLongPress={() => setPin('')}
            >
              <Ionicons name="backspace-outline" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotBtn} onPress={handleForgot}>
          <Text style={[styles.forgotText, { color: theme.textSecondary }]}>Forgot Passcode?</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    ...typography.titleLarge,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodyLarge,
  },
  errorText: {
    ...typography.bodyMedium,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    marginHorizontal: 8,
  },
  keypad: {
    width: width * 0.8,
    maxWidth: 320,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  key: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyInvisible: {
    width: 75,
    height: 75,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
  },
  forgotBtn: {
    marginTop: 30,
    padding: 10,
  },
  forgotText: {
    ...typography.caption,
    fontSize: 14,
    textDecorationLine: 'underline',
  }
});
