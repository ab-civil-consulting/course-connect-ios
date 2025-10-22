import { usePostHog } from "posthog-react-native";
import { CustomPostHogEvents, CustomPostHogExceptions, DebugLevelCustomPostHogEvents } from "./constants";
import { CustomPostHogEventParams } from "./models";

export const useCustomDiagnosticsEvents = (isDebugMode: boolean = false) => {
  const posthog = usePostHog();

  const captureDiagnosticsEvent = (event: CustomPostHogEvents, properties?: CustomPostHogEventParams[typeof event]) => {
    if (!isDebugMode && DebugLevelCustomPostHogEvents.includes(event)) {
      return;
    }

    posthog.capture(event, properties);
  };

  const captureError = (error: unknown, errorType: CustomPostHogExceptions) => {
    posthog.captureException(error, { errorType });
  };

  return {
    captureDiagnosticsEvent,
    captureError,
  };
};
