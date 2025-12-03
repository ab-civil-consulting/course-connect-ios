import { create } from "zustand";
import { readFromAsyncStorage, writeToAsyncStorage } from "../utils";
import { STORAGE } from "../types";

export interface PlaybackSettings {
  defaultQuality?: string; // e.g., "720p", "1080p", "auto"
  defaultSpeed?: string; // e.g., "1", "1.25", "1.5"
  autoplayEnabled?: boolean;
  subtitlesEnabled?: boolean;
  subtitleLanguage?: string;
}

export interface DownloadSettings {
  defaultQuality?: string;
  cellularDataLimit?: boolean; // If true, only download/stream on WiFi
}

export interface AppSettings {
  playback: PlaybackSettings;
  downloads: DownloadSettings;
}

interface SettingsStore {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updatePlaybackSettings: (settings: Partial<PlaybackSettings>) => Promise<void>;
  updateDownloadSettings: (settings: Partial<DownloadSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
  playback: {
    defaultQuality: "auto",
    defaultSpeed: "1",
    autoplayEnabled: false,
    subtitlesEnabled: false,
    subtitleLanguage: undefined,
  },
  downloads: {
    defaultQuality: "720p",
    cellularDataLimit: false,
  },
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const [
        defaultQuality,
        defaultSpeed,
        autoplayEnabled,
        subtitlesEnabled,
        subtitleLanguage,
        defaultDownloadQuality,
        cellularDataLimit,
      ] = await Promise.all([
        readFromAsyncStorage(STORAGE.DEFAULT_VIDEO_QUALITY),
        readFromAsyncStorage(STORAGE.DEFAULT_PLAYBACK_SPEED),
        readFromAsyncStorage(STORAGE.AUTOPLAY_ENABLED),
        readFromAsyncStorage(STORAGE.SUBTITLES_ENABLED),
        readFromAsyncStorage(STORAGE.SUBTITLE_LANGUAGE),
        readFromAsyncStorage(STORAGE.DEFAULT_DOWNLOAD_QUALITY),
        readFromAsyncStorage(STORAGE.CELLULAR_DATA_LIMIT),
      ]);

      set({
        settings: {
          playback: {
            defaultQuality: defaultQuality ?? defaultSettings.playback.defaultQuality,
            defaultSpeed: defaultSpeed ?? defaultSettings.playback.defaultSpeed,
            autoplayEnabled: autoplayEnabled ?? defaultSettings.playback.autoplayEnabled,
            subtitlesEnabled: subtitlesEnabled ?? defaultSettings.playback.subtitlesEnabled,
            subtitleLanguage: subtitleLanguage ?? defaultSettings.playback.subtitleLanguage,
          },
          downloads: {
            defaultQuality: defaultDownloadQuality ?? defaultSettings.downloads.defaultQuality,
            cellularDataLimit: cellularDataLimit ?? defaultSettings.downloads.cellularDataLimit,
          },
        },
        isLoaded: true,
      });
    } catch (error) {
      console.error("[SettingsStore] Failed to load settings:", error);
      set({ settings: defaultSettings, isLoaded: true });
    }
  },

  updatePlaybackSettings: async (newSettings) => {
    const current = get().settings;
    const updated = {
      ...current,
      playback: {
        ...current.playback,
        ...newSettings,
      },
    };

    try {
      // Save each setting individually to AsyncStorage
      if (newSettings.defaultQuality !== undefined) {
        await writeToAsyncStorage(STORAGE.DEFAULT_VIDEO_QUALITY, newSettings.defaultQuality);
      }
      if (newSettings.defaultSpeed !== undefined) {
        await writeToAsyncStorage(STORAGE.DEFAULT_PLAYBACK_SPEED, newSettings.defaultSpeed);
      }
      if (newSettings.autoplayEnabled !== undefined) {
        await writeToAsyncStorage(STORAGE.AUTOPLAY_ENABLED, newSettings.autoplayEnabled);
      }
      if (newSettings.subtitlesEnabled !== undefined) {
        await writeToAsyncStorage(STORAGE.SUBTITLES_ENABLED, newSettings.subtitlesEnabled);
      }
      if (newSettings.subtitleLanguage !== undefined) {
        await writeToAsyncStorage(STORAGE.SUBTITLE_LANGUAGE, newSettings.subtitleLanguage);
      }

      set({ settings: updated });
    } catch (error) {
      console.error("[SettingsStore] Failed to update playback settings:", error);
      throw error;
    }
  },

  updateDownloadSettings: async (newSettings) => {
    const current = get().settings;
    const updated = {
      ...current,
      downloads: {
        ...current.downloads,
        ...newSettings,
      },
    };

    try {
      // Save each setting individually to AsyncStorage
      if (newSettings.defaultQuality !== undefined) {
        await writeToAsyncStorage(STORAGE.DEFAULT_DOWNLOAD_QUALITY, newSettings.defaultQuality);
      }
      if (newSettings.cellularDataLimit !== undefined) {
        await writeToAsyncStorage(STORAGE.CELLULAR_DATA_LIMIT, newSettings.cellularDataLimit);
      }

      set({ settings: updated });
    } catch (error) {
      console.error("[SettingsStore] Failed to update download settings:", error);
      throw error;
    }
  },
}));
