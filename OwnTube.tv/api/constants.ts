import { VideosCommonQuery } from "@peertube/peertube-types";

// Common query parameters for fetching videos
// IMPORTANT: Only use start and count parameters!
// Adding filters like privacyOneOf, isLocal, etc. triggers admin-only mode and causes 401 errors
// The authenticated search endpoint automatically returns Public AND Internal videos for logged-in users
export const commonQueryParams: VideosCommonQuery = {
  start: 0,
  count: 24,
};

export enum QUERY_KEYS {
  videos = "videos",
  video = "video",
  instances = "instances",
  instance = "instance",
  instanceServerConfig = "instanceServerConfig",
  channel = "channel",
  channels = "channels",
  channelsCollection = "channelsCollection",
  channelVideos = "channelVideos",
  channelPlaylists = "channelPlaylists",
  categories = "categories",
  categoriesCollection = "categoriesCollection",
  playlists = "playlists",
  playlistVideos = "playlistVideos",
  playlistInfo = "playlistInfo",
  playlistsCollection = "playlistsCollection",
  videoCaptions = "videoCaptions",
  liveVideos = "liveVideos",
  liveStreamsCollection = "liveStreamsCollection",
  homepageLatestVideosView = "homepageLatestVideosView",
  categoryVideosView = "categoryVideosView",
  channelLatestVideosView = "channelLatestVideosView",
  premiumAdsCollection = "premiumAdsCollection",
  premiumAdsCaptionsCollection = "premiumAdsCaptionsCollection",
  loginPrerequisites = "loginPrerequisites",
  myUserInfo = "myUserInfo",
  myChannelSubscription = "myChannelSubscription",
  search = "search",
}

export enum MUTATION_KEYS {
  login = "login",
  register = "register",
  askResetPassword = "askResetPassword",
  updateUserInfo = "updateUserInfo",
}

export const WRONG_SERVER_VERSION_STATUS_CODE = 444;

export const GLOBAL_QUERY_STALE_TIME = 3_600_000; // 1 hour in ms
