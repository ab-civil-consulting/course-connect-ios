import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { usePushNotificationStore } from "../store/pushNotificationStore";
import { useAuthSessionStore } from "../store";
import { ROUTES } from "../types";

// Only set notification handler on native platforms
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const NOTIFICATION_SERVER_URL =
  process.env.EXPO_PUBLIC_NOTIFICATION_SERVER_URL || "https://course-connect.ab-civil.com/notifications";

export interface PushNotificationPayload {
  type: "new_video" | "announcement";
  videoId?: string;
  videoTitle?: string;
  channelName?: string;
  message?: string;
  backend?: string;
}

export const usePushNotifications = () => {
  const router = useRouter();
  const { session } = useAuthSessionStore();
  const {
    state,
    isInitialized,
    initializePushNotificationStore,
    setExpoPushToken,
    setIsEnabled,
    setIsRegistered,
    setHasBeenPrompted,
  } = usePushNotificationStore();

  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    initializePushNotificationStore();
  }, [initializePushNotificationStore]);

  useEffect(() => {
    // Only auto-register if user has enabled notifications AND not already registered
    if (isInitialized && session && state.isEnabled && !state.isRegistered) {
      registerForPushNotifications();
    }
  }, [isInitialized, session, state.isEnabled, state.isRegistered]);

  useEffect(() => {
    // Skip notification listeners on web
    if (Platform.OS === "web") {
      return;
    }

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      if (__DEV__) {
        console.log("[PushNotifications] Received:", notification);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as unknown as PushNotificationPayload;
      handleNotificationTap(data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const handleNotificationTap = (data: PushNotificationPayload) => {
    if (data.type === "new_video" && data.videoId) {
      const backend = data.backend || session?.backend || "course-connect.ab-civil.com";
      router.push({
        pathname: `/(home)/${ROUTES.VIDEO}`,
        params: { backend, id: data.videoId },
      });
    }
  };

  const registerForPushNotifications = async (): Promise<string | null> => {
    // Push notifications not supported on web
    if (Platform.OS === "web") {
      if (__DEV__) {
        console.log("[PushNotifications] Skipping registration - web platform");
      }
      return null;
    }

    if (isRegistering) {
      if (__DEV__) {
        console.log("[PushNotifications] Already registering, skipping");
      }
      return null;
    }

    setIsRegistering(true);
    setError(null);

    try {
      // Log device info
      if (__DEV__) {
        console.log("[PushNotifications] Device check:", {
          isDevice: Device.isDevice,
          osVersion: Platform.Version,
          platform: Platform.OS,
        });
      }

      if (!Device.isDevice) {
        const errorMsg = "Push notifications require a physical device";
        console.warn("[PushNotifications]", errorMsg);
        setError(errorMsg);
        setIsRegistering(false);
        return null;
      }

      // Check current permission status
      if (__DEV__) {
        console.log("[PushNotifications] Checking existing permissions...");
      }

      const permissionResult = await Notifications.getPermissionsAsync();
      const { status: existingStatus, canAskAgain, granted } = permissionResult;

      if (__DEV__) {
        console.log("[PushNotifications] Existing permission status:", {
          status: existingStatus,
          canAskAgain,
          granted,
        });
      }

      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== "granted") {
        if (__DEV__) {
          console.log("[PushNotifications] Requesting permissions...");
        }

        const requestResult = await Notifications.requestPermissionsAsync();
        finalStatus = requestResult.status;

        if (__DEV__) {
          console.log("[PushNotifications] Permission request result:", {
            status: requestResult.status,
            canAskAgain: requestResult.canAskAgain,
            granted: requestResult.granted,
          });
        }

        // Mark that user has been prompted (after request is made)
        await setHasBeenPrompted(true);
        if (__DEV__) {
          console.log("[PushNotifications] hasBeenPrompted flag set to true");
        }
      }

      if (finalStatus !== "granted") {
        const errorMsg = `Permission for push notifications was ${finalStatus}`;
        console.warn("[PushNotifications]", errorMsg);
        setError(errorMsg);
        await setIsEnabled(false);
        setIsRegistering(false);
        return null;
      }

      // Get EAS project ID
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        const errorMsg = "Missing EAS project ID";
        console.error("[PushNotifications]", errorMsg);
        setError(errorMsg);
        setIsRegistering(false);
        return null;
      }

      if (__DEV__) {
        console.log("[PushNotifications] Getting Expo push token...");
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      if (__DEV__) {
        console.log("[PushNotifications] Token received:", token.substring(0, 20) + "...");
      }

      await setExpoPushToken(token);
      await setIsEnabled(true);
      await registerTokenWithServer(token);

      if (__DEV__) {
        console.log("[PushNotifications] Registration complete");
      }

      setIsRegistering(false);
      return token;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register";
      console.error("[PushNotifications] Registration error:", err);
      setError(message);
      setIsRegistering(false);
      return null;
    }
  };

  const registerTokenWithServer = async (token: string): Promise<void> => {
    if (!session) return;

    try {
      const response = await fetch(`${NOTIFICATION_SERVER_URL}/api/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expoPushToken: token,
          userId: session.userInfoResponse?.id,
          username: session.userInfoResponse?.username,
          backend: session.backend,
          platform: Platform.OS,
          deviceId: Device.deviceName || "unknown",
        }),
      });

      if (response.ok) {
        await setIsRegistered(true);
        if (__DEV__) {
          console.log("[PushNotifications] Registered with server");
        }
      }
    } catch (err) {
      console.error("[PushNotifications] Server registration error:", err);
    }
  };

  const unregisterFromPushNotifications = async (): Promise<void> => {
    // Push notifications not supported on web
    if (Platform.OS === "web") {
      return;
    }

    try {
      if (state.expoPushToken) {
        await fetch(`${NOTIFICATION_SERVER_URL}/api/devices/unregister`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expoPushToken: state.expoPushToken }),
        });
      }
      await setExpoPushToken(null);
      await setIsEnabled(false);
      await setIsRegistered(false);
    } catch (err) {
      console.error("[PushNotifications] Unregistration error:", err);
    }
  };

  const getLastNotificationResponse = async () => {
    // getLastNotificationResponseAsync not available on web
    if (Platform.OS === "web") {
      return;
    }

    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content.data as unknown as PushNotificationPayload;
      handleNotificationTap(data);
    }
  };

  return {
    expoPushToken: state.expoPushToken,
    isEnabled: state.isEnabled,
    isRegistered: state.isRegistered,
    isRegistering,
    error,
    registerForPushNotifications,
    unregisterFromPushNotifications,
    getLastNotificationResponse,
  };
};
