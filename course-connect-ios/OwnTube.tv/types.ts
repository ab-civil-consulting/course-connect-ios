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
