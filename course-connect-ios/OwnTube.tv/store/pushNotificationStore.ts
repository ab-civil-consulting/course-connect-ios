import { create } from "zustand";
import { readFromAsyncStorage, writeToAsyncStorage, deleteFromAsyncStorage } from "../utils";
import { STORAGE } from "../types";

export interface PushNotificationState {
  expoPushToken: string | null;
  isEnabled: boolean;
  isRegistered: boolean;
  lastRegisteredAt: string | null;
  hasBeenPromptedForPermission: boolean;
}

interface PushNotificationStore {
  state: PushNotificationState;
  isInitialized: boolean;
  setExpoPushToken: (token: string | null) => Promise<void>;
  setIsEnabled: (enabled: boolean) => Promise<void>;
  setIsRegistered: (registered: boolean, timestamp?: string) => Promise<void>;
  setHasBeenPrompted: (prompted: boolean) => Promise<void>;
  initializePushNotificationStore: () => Promise<void>;
  clearPushNotificationState: () => Promise<void>;
}

const initialState: PushNotificationState = {
  expoPushToken: null,
  isEnabled: false,
  isRegistered: false,
  lastRegisteredAt: null,
  hasBeenPromptedForPermission: false,
};

export const usePushNotificationStore = create<PushNotificationStore>((set, get) => ({
  state: initialState,
  isInitialized: false,

  initializePushNotificationStore: async () => {
    if (get().isInitialized) {
      return;
    }

    try {
      const stored = await readFromAsyncStorage(STORAGE.PUSH_NOTIFICATION_STATE);
      if (stored) {
        set({ state: { ...initialState, ...stored }, isInitialized: true });
        if (__DEV__) {
          console.log("[pushNotificationStore] Initialized with stored state");
        }
      } else {
        set({ isInitialized: true });
        if (__DEV__) {
          console.log("[pushNotificationStore] Initialized with default state");
        }
      }
    } catch (error) {
      console.error("[pushNotificationStore] Initialization error:", error);
      set({ isInitialized: true });
    }
  },

  setExpoPushToken: async (token) => {
    const newState = { ...get().state, expoPushToken: token };
    await writeToAsyncStorage(STORAGE.PUSH_NOTIFICATION_STATE, newState);
    set({ state: newState });
  },

  setIsEnabled: async (enabled) => {
    const newState = { ...get().state, isEnabled: enabled };
    await writeToAsyncStorage(STORAGE.PUSH_NOTIFICATION_STATE, newState);
    set({ state: newState });
  },

  setIsRegistered: async (registered, timestamp) => {
    const newState = {
      ...get().state,
      isRegistered: registered,
      lastRegisteredAt: timestamp || new Date().toISOString(),
    };
    await writeToAsyncStorage(STORAGE.PUSH_NOTIFICATION_STATE, newState);
    set({ state: newState });
  },

  setHasBeenPrompted: async (prompted) => {
    const newState = { ...get().state, hasBeenPromptedForPermission: prompted };
    await writeToAsyncStorage(STORAGE.PUSH_NOTIFICATION_STATE, newState);
    set({ state: newState });
  },

  clearPushNotificationState: async () => {
    await deleteFromAsyncStorage([STORAGE.PUSH_NOTIFICATION_STATE]);
    set({ state: initialState });
  },
}));
