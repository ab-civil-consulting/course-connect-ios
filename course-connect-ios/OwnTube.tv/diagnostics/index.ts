import { Platform } from "react-native";
import { APP_IDENTIFIER } from "../api/sharedConstants";

const DEFAULT_POSTHOG_API_KEY = "phc_tceJOYqTcTVPWvO9TmRBKtMS0Y2H6y6DtyVDAoC9hG4";

// Try to import PostHog and DeviceInfo - these may not be available in Expo Go
let PostHog: any = null;
let DeviceInfo: any = null;

try {
  PostHog = require("posthog-react-native").default;
  DeviceInfo = require("react-native-device-info").default;
} catch (error) {
  console.warn("PostHog or DeviceInfo not available (likely running in Expo Go). Analytics disabled.");
}

// Create a mock PostHog instance if the real one isn't available
const createMockPostHog = () => ({
  capture: () => {},
  captureException: () => {},
  screen: () => {},
  identify: () => {},
  reset: () => {},
  getSessionId: () => "expo-go-mock-session",
});

// Initialize PostHog if available, otherwise use mock
export const postHogInstance = PostHog
  ? new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY || DEFAULT_POSTHOG_API_KEY, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      disabled: process.env.EXPO_PUBLIC_POSTHOG_API_KEY === "null",
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
