// services/notifications.ts (Expo Go compatible)
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Show notifications while app is foregrounded (optional but common)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Request permission for push notifications
 * Returns true if permission granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const enabled = finalStatus === "granted";

    console.log(enabled ? "Notification permission granted" : "Notification permission denied");

    // Android channel (recommended)
    if (enabled && Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return enabled;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

/**
 * Get Expo push token for this device (works in Expo Go)
 * NOTE: This is NOT an FCM token.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    // Must be a physical device for push notifications
    // (Simulators often can't receive push notifications)
    const enabled = await requestNotificationPermission();
    if (!enabled) return null;

    const projectId =
      // Works for EAS projects; fallback covers older configs
      (Constants.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants.easConfig as any)?.projectId;

    if (!projectId) {
      console.warn(
        "Missing EAS projectId. Add it or configure your app.json/app.config.js so getExpoPushTokenAsync works reliably."
      );
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("Expo Push Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting Expo push token:", error);
    return null;
  }
}

/**
 * Subscribe to a train topic for push notifications
 *
 * Expo Go cannot subscribe to FCM topics on-device.
 * You must implement topic subscription on your SERVER:
 * - store the Expo push token
 * - associate it with trainNumber
 */
export async function subscribeToTrain(trainNumber: string): Promise<void> {
  console.warn(
    `subscribeToTrain(${trainNumber}) is not supported in Expo Go on-device. ` +
      `Do this on your backend by storing the Expo push token and mapping it to train_${trainNumber}.`
  );
}

/**
 * Unsubscribe from a train topic for push notifications
 * Same note as subscribeToTrain.
 */
export async function unsubscribeFromTrain(trainNumber: string): Promise<void> {
  console.warn(
    `unsubscribeFromTrain(${trainNumber}) is not supported in Expo Go on-device. ` +
      `Do this on your backend by removing the token mapping for train_${trainNumber}.`
  );
}

/**
 * Foreground "message" handler
 * In Expo Notifications, you listen for received notifications.
 */
export function onForegroundMessage(
  callback: (message: { title?: string; body?: string }) => void
): () => void {
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    const title = notification.request.content.title ?? undefined;
    const body = notification.request.content.body ?? undefined;

    console.log("Foreground notification received:", { title, body });
    callback({ title, body });
  });

  return () => sub.remove();
}

/**
 * Background handling:
 * Expo Go does NOT support a JS background message handler like Firebase.
 * You handle "tap on notification" instead.
 */
export function setBackgroundMessageHandler(): void {
  // No-op in Expo Go
}

/**
 * Initialize notifications
 */
export async function initializeNotifications(): Promise<void> {
  await requestNotificationPermission();
  await getFCMToken();
}
