import { useEffect, useState } from "react";
import { useGlobalSearchParams } from "expo-router";
import { useAuthSessionStore } from "../store";
import { RootStackParams } from "../app/_layout";
import { ROUTES } from "../types";
import { useFullScreenModalContext } from "../contexts";
import { SignedOutModal } from "../components";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../api";

export const useAuthSessionSync = () => {
  const { backend } = useGlobalSearchParams<RootStackParams[ROUTES.INDEX]>();
  const { session, selectSession, isInitialized } = useAuthSessionStore();
  const { setContent, toggleModal } = useFullScreenModalContext();
  const [isSessionDataLoaded, setIsSessionDataLoaded] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (session?.sessionExpired) {
      toggleModal(true);
      setContent(<SignedOutModal handleClose={() => toggleModal(false)} />);
    }

    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myUserInfo] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myChannelSubscription] });
  }, [session]);

  useEffect(() => {
    // Wait for auth store to be initialized before syncing
    if (!isInitialized) {
      return;
    }

    const loadSession = async () => {
      // Only select session if backend is provided
      // The auth store is already initialized with the correct session from AsyncStorage
      // so we don't need to clear it when backend is undefined
      if (backend) {
        await selectSession(backend);
      }
      setIsSessionDataLoaded(true);
    };

    loadSession();
  }, [backend, isInitialized]);

  return { isSessionDataLoaded };
};
