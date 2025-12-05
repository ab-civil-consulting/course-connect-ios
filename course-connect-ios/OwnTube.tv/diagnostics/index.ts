import { Platform } from "react-native";
import { APP_IDENTIFIER } from "../api/sharedConstants";

// Try to import PostHog and DeviceInfo - these may not be available in Expo Go
let PostHog: any = null;
let DeviceInfo: any = null;

try {
  PostHog = require("posthog-react-native").default;
  DeviceInfo = require("react-native-device-info").default;
} catch (error) {
  if (__DEV__) {
    console.warn("PostHog or DeviceInfo not available (likely running in Expo Go). Analytics disabled.");
  }
}

// Create a mock PostHog instance if the real one isn't available
const createMockPostHog = () => ({
  capture: () => {},
  captureException: () => {},
  screen: () => {},
  identify: () => {},
  reset: () => {},
  debug: () => {},
  getSessionId: () => "expo-go-mock-session",
});

// Initialize PostHog if available, otherwise use mock
export const postHogInstance = PostHog && process.env.EXPO_PUBLIC_POSTHOG_API_KEY
  ? new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      disabled: !process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      defaultOptIn: true,
      customAppProperties: (properties: any) => ({
        ...properties,
        "X-App-Identifier": APP_IDENTIFIER,
        ...(Platform.OS === "android" && DeviceInfo
          ? { "X-Android-Install-Source": DeviceInfo.getInstallerPackageNameSync() }
          : {}),
      }),
    })
  : createMockPostHog();
