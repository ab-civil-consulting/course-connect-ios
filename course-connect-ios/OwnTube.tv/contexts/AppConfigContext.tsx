import {
  createContext,
  PropsWithChildren,
  useContext,
  useState,
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
} from "react";
import { DeviceCapabilities, useDeviceCapabilities } from "../hooks/useDeviceCapabilities";
import { useFeaturedInstancesData } from "../hooks/useFeaturedInstancesData";
import { useInstanceConfig } from "../hooks/useInstanceConfig";
import { useRecentInstances } from "../hooks/useRecentInstances";
import { useSubtitlesSessionLocale } from "../hooks/useSubtitlesSessionLocale";
import { useNetInfo } from "@react-native-community/netinfo";
import { InstanceConfig } from "../instanceConfigs";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { readFromAsyncStorage, writeToAsyncStorage } from "../utils";
import { ROUTES, STORAGE } from "../types";
import { useQueryClient } from "@tanstack/react-query";
import { GLOBAL_QUERY_STALE_TIME } from "../api";
import { useInstanceConfigStore } from "../store";
import { useCustomDiagnosticsEvents } from "../diagnostics/useCustomDiagnosticEvents";
import { CustomPostHogEvents } from "../diagnostics/constants";
import Constants from "expo-constants";

interface IAppConfigContext {
  isDebugMode: boolean;
  setIsDebugMode: Dispatch<SetStateAction<boolean>>;
  deviceCapabilities: DeviceCapabilities;
  featuredInstances?: InstanceConfig[];
  primaryBackend?: string;
  sessionCCLocale: string;
  updateSessionCCLocale: (locale: string) => void;
  currentInstanceConfig?: InstanceConfig;
}

const AppConfigContext = createContext<IAppConfigContext>({
  isDebugMode: false,
  setIsDebugMode: () => {},
  deviceCapabilities: {} as DeviceCapabilities,
  sessionId: "",
  sessionCCLocale: "",
  updateSessionCCLocale: () => {},
});

export const AppConfigContextProvider = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  const [isDebugMode, setIsDebugMode] = useState(false);
  const { deviceCapabilities } = useDeviceCapabilities();
  const {
    featuredInstances,
    isLoading: _isFeaturedInstancesLoading,
    error: featuredInstancesError,
  } = useFeaturedInstancesData();
  const { isConnected } = useNetInfo();
  const pathname = usePathname();
  const lastRecordedConnectionState = useRef<boolean | undefined | null>();
  const { recentInstances, addRecentInstance } = useRecentInstances();
  const { backend } = useGlobalSearchParams<{ backend: string }>();
  const { sessionCCLocale, updateSessionCCLocale } = useSubtitlesSessionLocale();
  const { currentInstanceConfig } = useInstanceConfig(featuredInstances);
  const queryClient = useQueryClient();
  const { setCurrentInstanceConfig, setInstanceConfigList } = useInstanceConfigStore();
  const { captureDiagnosticsEvent } = useCustomDiagnosticsEvents(isDebugMode);

  useEffect(() => {
    setCurrentInstanceConfig(currentInstanceConfig);
  }, [currentInstanceConfig]);

  useEffect(() => {
    if (featuredInstances?.length) {
      setInstanceConfigList(featuredInstances);
    }
  }, [featuredInstances]);

  useEffect(() => {
    if (lastRecordedConnectionState.current === true && !isConnected) {
      Toast.show({ type: "info", text1: t("noNetworkConnection"), props: { isError: true }, autoHide: false });
    }

    if (lastRecordedConnectionState.current === false && isConnected) {
      Toast.show({ type: "info", text1: t("networkConnectionRestored"), autoHide: true });
    }

    lastRecordedConnectionState.current = isConnected;
  }, [isConnected]);

  const primaryBackend = Constants.expoConfig?.extra?.primaryBackend as string | undefined;

  useEffect(() => {
    if (backend) {
      readFromAsyncStorage(STORAGE.DIAGNOSTICS_REPORTED_BACKEND).then((storedBackend) => {
        if (String(storedBackend) !== backend) {
          captureDiagnosticsEvent(CustomPostHogEvents.ChangeBackendServer, { backend });
          writeToAsyncStorage(STORAGE.DIAGNOSTICS_REPORTED_BACKEND, backend);
        }
      });
    }

    if (backend && !recentInstances?.length) {
      addRecentInstance(backend);
      writeToAsyncStorage(STORAGE.DATASOURCE, backend);
    }
  }, [backend]);

  useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        staleTime: currentInstanceConfig?.customizations?.refreshQueriesStaleTimeMs || GLOBAL_QUERY_STALE_TIME,
      },
    });
  }, [currentInstanceConfig, queryClient]);

  useEffect(() => {
    readFromAsyncStorage(STORAGE.DEBUG_MODE).then((debugMode) => {
      setIsDebugMode(debugMode === "true");
    });
  }, []);

  // Enable API debug logging when debug mode is active
  useEffect(() => {
    const { ApiServiceImpl } = require("../api/peertubeVideosApi");
    ApiServiceImpl.debugLogging = isDebugMode;
    if (isDebugMode && __DEV__) {
      console.log("[Debug Mode] API debug logging enabled");
    }
  }, [isDebugMode]);

  // Auth routes that should render even without featured instances
  const isAuthRoute =
    pathname &&
    [ROUTES.SIGNIN, ROUTES.SIGNUP, ROUTES.OTP, ROUTES.PASSWORD_RESET].some((route) => pathname.includes(route));

  // Log errors for debugging
  useEffect(() => {
    if (featuredInstancesError) {
      console.error("[AppConfigContext] Featured instances failed to load:", featuredInstancesError);
    }
  }, [featuredInstancesError]);

  // Don't block auth routes from rendering
  const shouldRenderChildren = isAuthRoute || featuredInstances?.length > 0;

  return (
    <AppConfigContext.Provider
      value={{
        isDebugMode,
        setIsDebugMode,
        deviceCapabilities,
        featuredInstances,
        primaryBackend,
        sessionCCLocale,
        updateSessionCCLocale,
        currentInstanceConfig,
      }}
    >
      {shouldRenderChildren ? children : null}
    </AppConfigContext.Provider>
  );
};

export const useAppConfigContext = () => useContext(AppConfigContext);
