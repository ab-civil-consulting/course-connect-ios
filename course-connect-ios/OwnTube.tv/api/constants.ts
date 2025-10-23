import { VideosCommonQuery } from "@peertube/peertube-types";

// Common query parameters for fetching videos that are classified as "local", "non-live", and accessible to authenticated users
// privacyOneOf: 1=Public, 2=Unlisted, 3=Private, 4=Internal
export const commonQueryParams: VideosCommonQuery = {
  start: 0,
  count: 15,
  sort: "-publishedAt", // Show newest videos first (- means descending order)
  privacyOneOf: [1, 2, 4], // Public, Unlisted, and Internal (excludes Private which is owner-only)
  nsfw: "both", // Include both SFW and NSFW content
  isLocal: undefined, // Try removing local restriction to bypass permission error
  isLive: false, // Exclude live streams
  include: 0, // Explicitly set include to NONE to bypass permission error
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
}

export const WRONG_SERVER_VERSION_STATUS_CODE = 444;

export const GLOBAL_QUERY_STALE_TIME = 3_600_000; // 1 hour in ms
