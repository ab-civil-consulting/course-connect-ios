import { create } from "zustand";
import { User } from "@peertube/peertube-types";
import { readFromAsyncStorage, writeToAsyncStorage, deleteFromAsyncStorage } from "../utils";
import { STORAGE } from "../types";

export interface AuthSession {
  backend: string;
  basePath: string;
  email: string;
  twoFactorEnabled: boolean;
  sessionCreatedAt: string;
  sessionUpdatedAt: string;
  sessionExpired: boolean;
  tokenType: string;
  refreshToken: string;
  refreshTokenIssuedAt: string;
  refreshTokenExpiresIn: number;
  accessToken: string;
  accessTokenIssuedAt: string;
  accessTokenExpiresIn: number;
  userInfoResponse: User;
  userInfoUpdatedAt: string;
  authTokenRefreshInitiatedAt?: string;
  authTokenRefreshExpiresIn?: number;
}

interface AuthSessionStore {
  session?: AuthSession;
  isInitialized: boolean;
  addSession: (backend: string, session: Partial<AuthSession>) => Promise<void>;
  updateSession: (backend: string, session: Partial<AuthSession>) => Promise<void>;
  removeSession: (backend: string) => Promise<void>;
  selectSession: (backend: string) => Promise<void>;
  clearSession: () => void;
  initializeAuthStore: () => Promise<void>;
}

export const useAuthSessionStore = create<AuthSessionStore>((set, get) => ({
  session: undefined,
  isInitialized: false,

  initializeAuthStore: async () => {
    // Already initialized - skip
    if (get().isInitialized) {
      return;
    }

    try {
      // Read the stored backend
      const backend = await readFromAsyncStorage(STORAGE.DATASOURCE);

      if (backend) {
        // Read the session for this backend
        const session = await readFromAsyncStorage(`${backend}/auth`);
        set({ session: session || undefined, isInitialized: true });
        if (__DEV__) {
          console.log("[authSessionStore] Initialized with backend:", backend, "session:", !!session);
        }
      } else {
        // No backend stored, just mark as initialized
        set({ isInitialized: true });
        if (__DEV__) {
          console.log("[authSessionStore] Initialized with no stored backend");
        }
      }
    } catch (error) {
      // On error, still mark as initialized to prevent blocking the app
      console.error("[authSessionStore] Initialization error:", error);
      set({ isInitialized: true });
    }
  },

  addSession: async (backend, session) => {
    const sessionData = { ...session, backend } as AuthSession;
    await writeToAsyncStorage(`${backend}/auth`, sessionData);
    set({ session: sessionData });
  },

  updateSession: async (backend, updatedSession) => {
    const current = await readFromAsyncStorage(`${backend}/auth`);
    const merged = { ...current, ...updatedSession };
    await writeToAsyncStorage(`${backend}/auth`, merged);

    if (get().session?.backend === backend) {
      set({ session: merged });
    }
  },

  removeSession: async (backend) => {
    await deleteFromAsyncStorage([`${backend}/auth`]);
    if (get().session?.backend === backend) {
      set({ session: undefined });
    }
  },

  selectSession: async (backend) => {
    const loaded = await readFromAsyncStorage(`${backend}/auth`);
    // Always set session - clear stale in-memory session if no stored session exists
    set({ session: loaded || undefined });
  },

  clearSession: () => {
    set({ session: undefined });
  },
}));
