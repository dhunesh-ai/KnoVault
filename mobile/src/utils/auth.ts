import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

/**
 * Kogniva — Biometric Authentication Utility
 */
export const authenticateSecureAccess = async (reason: string = 'to access this secure note'): Promise<boolean> => {
  try {
    // 1. Check if hardware supports biometrics
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      // Fallback or alert if not available
      // Note: In a real app, you might want to allow PIN fallback
      return true; // For now, allow if no hardware to avoid locking user out, but notify
    }

    // 2. Authenticate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Authenticate ${reason}`,
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });

    return result.success;
  } catch (error) {
    console.error('Authentication error:', error);
    Alert.alert('Security Error', 'An error occurred during authentication.');
    return false;
  }
};
