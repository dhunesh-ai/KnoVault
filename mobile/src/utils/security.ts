import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export const biometricAuth = {
  /**
   * Prompts the user for biometric or fallback PIN authentication.
   */
  authenticate: async (promptMessage = 'Authenticate to access secure content'): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // If no hardware is available, we assume true for now or fallback to app PIN if implemented
        return true;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric Auth Error:', error);
      return false;
    }
  },
};

export const secureStorage = {
  saveItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  deleteItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};
