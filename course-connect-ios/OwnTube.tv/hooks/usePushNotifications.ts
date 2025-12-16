import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { usePushNotificationStore } from "../store/pushNotificationStore";
import { useAuthSessionStore } from "../store";
import { ROUTES } from "../types";

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const { state, isInitialized, initializePushNotificationStore, setExpoPushToken, setIsEnabled, setIsRegistered } =
    usePushNotificationStore();

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
    if (isRegistering) return null;
    setIsRegistering(true);
    setError(null);

    try {
      if (!Device.isDevice) {
        setError("Push notifications require a physical device");
        setIsRegistering(false);
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setError("Permission for push notifications was denied");
        await setIsEnabled(false);
        setIsRegistering(false);
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        setError("Missing EAS project ID");
        setIsRegistering(false);
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      await setExpoPushToken(token);
      await setIsEnabled(true);
      await registerTokenWithServer(token);

      setIsRegistering(false);
      return token;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register";
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
