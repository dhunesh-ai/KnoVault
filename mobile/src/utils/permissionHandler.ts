import * as Notifications from 'expo-notifications';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Alert, Linking } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { syncFCMToken } from './notifications';

/**
 * Handle notification permissions after a reminder, birthday, meeting, assignment, or event is successfully created.
 */
export async function handlePostSaveNotificationPermission(onDone: () => void) {
  const { 
    hasCreatedFirstNotificationItem, 
    setHasCreatedFirstNotificationItem,
    toggleNotificationSetting
  } = useSettingsStore.getState();

  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();

    // If permission is already granted, we can sync notifications and complete.
    if (status === 'granted') {
      await setHasCreatedFirstNotificationItem(true);
      await syncFCMToken();
      onDone();
      return;
    }

    const showSettingsAlert = () => {
      Alert.alert(
        "Notifications Disabled",
        "Reminder saved successfully, but notifications are disabled. Enable notifications from Settings to receive alerts.",
        [
          {
            text: "Open Settings",
            onPress: () => {
              Linking.openSettings();
              onDone();
            }
          },
          {
            text: "Not Now",
            onPress: () => {
              onDone();
            },
            style: "cancel"
          }
        ],
        { cancelable: false }
      );
    };

    // If it's the first time they are creating an item
    if (!hasCreatedFirstNotificationItem) {
      await setHasCreatedFirstNotificationItem(true);

      // Check if we can ask for permission
      if (status === 'undetermined' || (status === 'denied' && canAskAgain !== false)) {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus === 'granted') {
          await toggleNotificationSetting('notificationsEnabled', 'knovault_notifications', true);
          await syncFCMToken();
          onDone();
        } else {
          await toggleNotificationSetting('notificationsEnabled', 'knovault_notifications', false);
          showSettingsAlert();
        }
      } else {
        // Status is denied and canAskAgain is false (permanently denied)
        showSettingsAlert();
      }
    } else {
      // Subsequent items: do NOT request from OS. Just show settings alert directly.
      showSettingsAlert();
    }
  } catch (error) {
    console.error('[PermissionHandler] handlePostSaveNotificationPermission failed:', error);
    onDone();
  }
}

/**
 * Handle microphone permission when user taps mic button.
 * Returns true if the action (recording/listening) should proceed, false otherwise.
 */
export async function handleMicrophonePermission(): Promise<boolean> {
  const { 
    hasTappedMicrophoneBefore, 
    setHasTappedMicrophoneBefore,
    setMicrophoneAccessEnabled
  } = useSettingsStore.getState();

  try {
    const isAvailable = ExpoSpeechRecognitionModule.isRecognitionAvailable();
    if (!isAvailable) {
      Alert.alert("Error", "Speech recognition is not available on this device.");
      return false;
    }

    const { status, canAskAgain } = await ExpoSpeechRecognitionModule.getPermissionsAsync();

    if (status === 'granted') {
      await setMicrophoneAccessEnabled(true);
      return true;
    }

    const showSettingsAlert = () => {
      Alert.alert(
        "Microphone Access Required",
        "Microphone permission is required for Voice Notes and Speech-to-Text.",
        [
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings()
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ],
        { cancelable: false }
      );
    };

    if (!hasTappedMicrophoneBefore) {
      await setHasTappedMicrophoneBefore(true);

      if (status === 'undetermined' || (status === 'denied' && canAskAgain !== false)) {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (granted) {
          await setMicrophoneAccessEnabled(true);
          return true;
        } else {
          await setMicrophoneAccessEnabled(false);
          showSettingsAlert();
          return false;
        }
      } else {
        // Permanently denied
        showSettingsAlert();
        return false;
      }
    } else {
      // Subsequent taps: do NOT request from OS. Show alert.
      showSettingsAlert();
      return false;
    }
  } catch (error) {
    console.error('[PermissionHandler] handleMicrophonePermission failed:', error);
    return false;
  }
}
