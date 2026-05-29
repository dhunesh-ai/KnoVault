import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestLocalNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
};

export const scheduleLocalReminder = async (title: string, body: string, triggerDate: Date) => {
  const hasPermission = await requestLocalNotificationPermissions();
  if (!hasPermission) {
    console.warn('[LocalNotifications] Permission denied');
    return null;
  }

  // Ensure the date is in the future
  if (triggerDate.getTime() <= Date.now()) {
    console.warn('[LocalNotifications] Cannot schedule notification in the past');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C4DFF',
    });
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    console.log(`[LocalNotifications] Scheduled notification id: ${id} for ${triggerDate.toLocaleString()}`);
    return id;
  } catch (error) {
    console.error('[LocalNotifications] Error scheduling notification:', error);
    return null;
  }
};
