export enum SOURCES {
  PEERTUBE = "peertube2.cpy.re",
  REBELLION = "tube.rebellion.global",
  TEST_DATA = "Test Data",
}

export enum STORAGE {
  DATASOURCE = "data_source",
  VIEW_HISTORY = "view_history",
  RECENT_INSTANCES = "recent_instances",
  LOCALE = "locale",
  INSTANCE_ENTRYPOINTS = "instance_entrypoints",
  CC_LOCALE = "cc_locale",
  DEBUG_MODE = "debug_mode",
  DIAGNOSTICS_REPORTED_BACKEND = "diagnostics/reported_backend",
  DEFAULT_VIDEO_QUALITY = "default_video_quality",
  DEFAULT_PLAYBACK_SPEED = "default_playback_speed",
  AUTOPLAY_ENABLED = "autoplay_enabled",
  CELLULAR_DATA_LIMIT = "cellular_data_limit",
  DEFAULT_DOWNLOAD_QUALITY = "default_download_quality",
  SUBTITLES_ENABLED = "subtitles_enabled",
  SUBTITLE_LANGUAGE = "subtitle_language",
  PUSH_NOTIFICATION_STATE = "push_notification_state",
}

export enum ROUTES {
  INDEX = "index",
  HOME = "home",
  HISTORY = "history",
  VIDEO = "video",
  CHANNEL = "channel",
  CHANNELS = "channels",
  CHANNEL_CATEGORY = "channel-category",
  CHANNEL_PLAYLIST = "channel-playlist",
  CATEGORIES = "categories",
  CATEGORY = "category",
  PLAYLISTS = "playlists",
  PLAYLIST = "playlist",
  PRIVACY = "privacy",
  TERMS = "terms",
  SIGNIN = "signin",
  SIGNUP = "signup",
  OTP = "otp",
  PASSWORD_RESET = "password-reset",
  SEARCH = "search",
  FORUM = "forum",
  FORUM_CATEGORY = "forum-category",
  FORUM_THREAD = "forum-thread",
}

export interface Category {
  label: string;
  id: number;
}
