import { Alert } from 'react-native';
import { router } from 'expo-router';

/**
 * Shows the unified 'Microphone Access Disabled' popup.
 * When 'Open Settings' is selected, it navigates to the Profile screen and requests an auto-scroll to the Microphone toggle.
 */
export function showMicAccessDisabledAlert() {
  Alert.alert(
    "Microphone Access Disabled",
    "Microphone access is currently disabled.\n\nEnable Microphone Access in Settings to use:\n• Voice Notes\n• Speech-to-Text\n• AI Voice Input",
    [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Open Settings",
        onPress: () => {
          router.push({
            pathname: '/profile',
            params: { scrollTo: 'microphone' }
          });
        }
      }
    ]
  );
}
