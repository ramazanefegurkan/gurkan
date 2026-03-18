import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Configure how foreground notifications are displayed.
 * Must be called once at app startup (before any notification arrives).
 */
export function setupNotificationHandlers(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  console.debug('[push] notification handler configured');
}

/**
 * Create the default Android notification channel.
 * No-op on iOS. Must be called before notifications will display on Android 8+.
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Bildirimler',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c4653a',
    });
    console.debug('[push] Android notification channel created');
  } catch (error) {
    console.warn('[push] failed to create notification channel:', error);
  }
}

/**
 * Request push notification permissions and acquire an Expo push token.
 *
 * Returns the token string on success, or null if:
 * - Running on a simulator/emulator (push tokens aren't available)
 * - Permission was denied
 * - Token acquisition failed for any reason
 *
 * Never throws — all errors are caught and logged.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Push tokens are only available on physical devices
    if (!Device.isDevice) {
      console.debug('[push] must use physical device for push notifications');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.debug('[push] permission not granted, status:', finalStatus);
      return null;
    }

    // Get the Expo push token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId || projectId === 'your-eas-project-id') {
      console.warn(
        '[push] EAS projectId not configured — run `eas init` and set EXPO_PUBLIC_EAS_PROJECT_ID',
      );
      // Still attempt token acquisition — it may work in development builds
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });

    const token = tokenResponse.data;
    console.debug('[push] token acquired:', token.substring(0, 25) + '...]');
    return token;
  } catch (error) {
    console.warn('[push] error acquiring push token:', error);
    return null;
  }
}
