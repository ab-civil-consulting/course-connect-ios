import "@react-navigation/native";
import { Theme } from "@react-navigation/native";
import { ColorScheme } from "./theme";

// Add TV-specific types for react-native-tvos
declare module "react-native" {
  export const TVEventControl: {
    enableTVMenuKey: () => void;
    disableTVMenuKey: () => void;
  };
}

// Override the theme in react native navigation to accept our custom theme props.
declare module "@react-navigation/native" {
  export type ExtendedTheme = {
    dark: boolean;
    colors: Theme["colors"] & ColorScheme;
  };
  export function useTheme(): ExtendedTheme;
}

declare global {
  interface Document {
    webkitExitFullscreen?: () => Promise<void>;
    webkitFullscreenElement?: Element;
  }

  interface Element {
    webkitEnterFullscreen?: () => Promise<void>;
  }

  interface Window {
    WebKitPlaybackTargetAvailabilityEvent: typeof Event;
  }

  interface Event {
    availability: "available" | "not-available";
  }

  interface HTMLVideoElement {
    webkitShowPlaybackTargetPicker(): void;
    webkitCurrentPlaybackTargetIsWireless: boolean;
  }
}
