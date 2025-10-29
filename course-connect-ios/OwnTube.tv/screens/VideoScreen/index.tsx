import VideoView from "../../components/VideoView";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { ROUTES } from "../../types";
import {
  ApiServiceImpl,
  QUERY_KEYS,
  useGetSubscriptionByChannelQuery,
  useGetVideoCaptionsCollectionQuery,
  useGetVideoCaptionsQuery,
  useGetVideoFullInfoCollectionQuery,
  useGetVideoQuery,
} from "../../api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader, FocusWrapper, FullScreenModal, ErrorTextWithRetry, Button, EmptyPage } from "../../components";
import { useCustomFocusManager, useViewHistory } from "../../hooks";
import { StatusBar } from "expo-status-bar";
import { Settings } from "../../components/VideoControlsOverlay/components/modals";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import useFullScreenVideoPlayback from "../../hooks/useFullScreenVideoPlayback";
import Share from "../../components/VideoControlsOverlay/components/modals/Share";
import VideoDetails from "../../components/VideoControlsOverlay/components/modals/VideoDetails";
import { colorSchemes, spacing } from "../../theme";
import { useAppConfigContext } from "../../contexts";
import { VideoStreamingPlaylist } from "@peertube/peertube-types";
import { useCustomDiagnosticsEvents } from "../../diagnostics/useCustomDiagnosticEvents";
import { CustomPostHogEvents } from "../../diagnostics/constants";
import { useAuthSessionStore } from "../../store";

export const VideoScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<RootStackParams[ROUTES.VIDEO]>();
  const { session } = useAuthSessionStore();
  const { data, isLoading, isError, refetch } = useGetVideoQuery({ id: params?.id });
  const isPremiumVideo = [true, "true"].includes(data?.pluginData?.["is-premium-content"]);
  const qualifiedChannelName = `${data?.channel?.name}@${data?.channel?.host}`;
  useCustomFocusManager();

  const { data: subscriptionData, isLoading: isLoadingSubscriptionData } = useGetSubscriptionByChannelQuery(
    qualifiedChannelName,
    isPremiumVideo && !!data,
  );

  const isPremiumVideoAvailable = useMemo(() => {
    return isPremiumVideo && Boolean(subscriptionData?.[qualifiedChannelName]);
  }, [isPremiumVideo, subscriptionData, qualifiedChannelName]);
  const isPremiumVideoUnavailable = isPremiumVideo && !isPremiumVideoAvailable;

  const { currentInstanceConfig } = useAppConfigContext();
  const { captureDiagnosticsEvent } = useCustomDiagnosticsEvents();

  const premiumAds = currentInstanceConfig?.customizations?.premiumContentAds;
  const premiumAdsData = useGetVideoFullInfoCollectionQuery(premiumAds, QUERY_KEYS.premiumAdsCollection);
  const premiumAdsCaptions = useGetVideoCaptionsCollectionQuery(premiumAds, QUERY_KEYS.premiumAdsCaptionsCollection);

  const { data: captions } = useGetVideoCaptionsQuery(params?.id);
  const { updateHistory } = useViewHistory();
  const { isFullscreen, toggleFullscreen } = useFullScreenVideoPlayback();
  const { top } = useSafeAreaInsets();
  const [quality, setQuality] = useState("auto");

  const isWaitingForLive = [4, 5].includes(Number(data?.state?.id));

  useEffect(() => {
    if (data && params?.backend && !isPremiumVideoUnavailable) {
      const updateData = {
        ...data,
        previewPath: `https://${params.backend}${data.previewPath}`,
        backend: params.backend,
        lastViewedAt: new Date().getTime(),
      };

      updateHistory({ data: updateData });
    }
  }, [data, params?.backend]);

  useFocusEffect(
    useCallback(() => {
      captureDiagnosticsEvent(CustomPostHogEvents.VideoView, {
        videoId: params?.id,
        backend: params?.backend,
      });
    }, [params?.id, params?.backend]),
  );

  const randomPremiumAdIndex = useMemo(() => {
    return Math.floor(Math.random() * premiumAdsData.length);
  }, [premiumAdsData.length]);

  const [videoFileToken, setVideoFileToken] = useState<string | null>(null);
  const [streamingPlaylistToken, setStreamingPlaylistToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Fetch video tokens for private/internal videos
  // Use videoFileToken for direct files, streamingPlaylistToken for HLS
  useEffect(() => {
    if (!params?.id || !params?.backend || !data) return;

    // Check if video requires authentication based on privacy level
    // Privacy levels: 1=Public, 2=Unlisted, 3=Private, 4=Internal
    const needsAuthentication = data.privacy?.id && data.privacy.id >= 3;

    console.log('[VideoScreen] Token fetch effect:', {
      videoId: params.id,
      privacyId: data.privacy?.id,
      needsAuthentication,
    });

    // Request tokens for any private (3) or internal (4) content
    if (needsAuthentication) {
      setIsLoadingToken(true);
      setTokenError(null);
      console.log('[VideoScreen] Requesting video token...');
      ApiServiceImpl.requestVideoToken(params.backend, params.id)
        .then((tokenData) => {
          console.log('[VideoScreen] Token received:', {
            hasFilesToken: !!tokenData?.files?.token,
            hasStreamingToken: !!tokenData?.streamingPlaylists?.token,
            filesToken: tokenData?.files?.token ? tokenData.files.token.substring(0, 20) + '...' : null,
          });
          if (tokenData?.files?.token) {
            setVideoFileToken(tokenData.files.token);
          }
          if (tokenData?.streamingPlaylists?.token) {
            setStreamingPlaylistToken(tokenData.streamingPlaylists.token);
          }

          // If we didn't get any token for a private video, set an error
          if (!tokenData?.files?.token && !tokenData?.streamingPlaylists?.token) {
            console.error('[VideoScreen] No tokens received for private video');
            setTokenError('Failed to obtain video access token');
          }
        })
        .catch((error) => {
          console.error("[VideoScreen] Video token request failed:", error);
          setTokenError('Failed to authenticate video access. Please try again.');
        })
        .finally(() => {
          console.log('[VideoScreen] Token loading complete');
          setIsLoadingToken(false);
        });
    } else {
      // Public/Unlisted videos don't need tokens
      console.log('[VideoScreen] Video is public/unlisted, no token needed');
      setIsLoadingToken(false);
      setVideoFileToken(null);
      setStreamingPlaylistToken(null);
      setTokenError(null);
    }
  }, [params?.id, params?.backend, data]);

  const uri = useMemo(() => {
    if (!params?.id || !data) {
      return;
    }

    const needsAuth = data.privacy?.id && data.privacy.id >= 3;

    // === COMPREHENSIVE VIDEO DATA DEBUGGING ===
    console.log('[VideoScreen] === FULL VIDEO DATA STRUCTURE ===');
    console.log('[VideoScreen] Video data keys:', Object.keys(data));
    console.log('[VideoScreen] Video name:', data.name);
    console.log('[VideoScreen] Video UUID:', data.uuid);

    // Check for files property
    console.log('[VideoScreen] data.files exists?', 'files' in data);
    console.log('[VideoScreen] data.files value:', data.files);
    console.log('[VideoScreen] data.files type:', typeof data.files);
    console.log('[VideoScreen] data.files is array?', Array.isArray(data.files));
    console.log('[VideoScreen] data.files?.length:', data.files?.length);

    // Check for streaming playlists
    console.log('[VideoScreen] data.streamingPlaylists:', data.streamingPlaylists);
    console.log('[VideoScreen] streamingPlaylists length:', data.streamingPlaylists?.length);

    // Log detailed HLS playlist info
    if (data.streamingPlaylists?.length) {
      console.log('[VideoScreen] HLS Playlist details:', {
        id: data.streamingPlaylists[0].id,
        type: data.streamingPlaylists[0].type,
        playlistUrl: data.streamingPlaylists[0].playlistUrl,
        segmentsSha256Url: data.streamingPlaylists[0].segmentsSha256Url,
      });
    }

    // Look for alternative property names
    console.log('[VideoScreen] data.webVideos:', (data as any).webVideos);
    console.log('[VideoScreen] data.videoFiles:', (data as any).videoFiles);
    console.log('[VideoScreen] data.file:', (data as any).file);

    console.log('[VideoScreen] Basic info:', {
      videoId: params.id,
      privacyId: data.privacy?.id,
      needsAuth,
      hasStreamingPlaylists: !!data.streamingPlaylists?.length,
      hasDirectFiles: !!data.files?.length,
      directFilesCount: data.files?.length || 0,
      platform: Platform.OS,
      videoFileToken: videoFileToken ? videoFileToken.substring(0, 20) + '...' : null,
      streamingPlaylistToken: streamingPlaylistToken ? streamingPlaylistToken.substring(0, 20) + '...' : null,
      isLoadingToken,
    });

    // Log available video files for debugging
    if (data.files?.length) {
      console.log('[VideoScreen] Available video files:',
        data.files.map(f => ({
          resolution: f.resolution?.id,
          size: f.size,
          fps: f.fps,
          hasUrl: !!f.fileUrl,
        }))
      );
    }

    let videoUrl;

    // PRIORITIZE DIRECT FILES (WEB VIDEOS) FOR ALL PLATFORMS
    // Direct files (web videos) work better because:
    // 1. No transcoding required - always available immediately
    // 2. Better cross-platform compatibility (iOS, Android, Web)
    // 3. Simpler authentication (tokens in query params)
    // 4. Quality selection works on all platforms
    // 5. More reliable than HLS for most use cases

    console.log('[VideoScreen] Playback decision:', {
      hasDirectFiles: !!data.files?.length,
      hasHLS: !!data.streamingPlaylists?.length,
      platform: Platform.OS,
    });

    // If no files AND no streaming playlists, video is not playable
    if (!data.files?.length && !data.streamingPlaylists?.length) {
      console.error('[VideoScreen] Video has NO playable sources (no files, no HLS)');
      setTokenError('Video unavailable: No playback sources found. Please check PeerTube settings.');
      return undefined;
    }

    // Prefer direct files (web videos) for all platforms
    if (data.files?.length) {
      // Direct file playback - preferred for all platforms
      // Web videos work better because:
      // - They're always available (no transcoding needed)
      // - Authentication via query params works reliably
      // - Quality selection works on all platforms

      if (!data.files || data.files.length === 0) {
        console.error('[VideoScreen] No video files available!');
        return undefined;
      }

      // Try to find video by selected quality
      let selectedFile = data.files.find(({ resolution }) => String(resolution.id) === quality);

      // Fallback: Pick best quality <= 1080p
      if (!selectedFile) {
        const files1080pOrLess = data.files.filter(({ resolution }) => resolution.id <= 1080);
        // Sort by resolution descending and pick the highest
        selectedFile = files1080pOrLess.sort((a, b) => b.resolution.id - a.resolution.id)[0];
      }

      // Final fallback: just pick the first available file
      if (!selectedFile) {
        selectedFile = data.files[0];
      }

      videoUrl = selectedFile?.fileUrl;

      console.log('[VideoScreen] Selected video file:', {
        resolution: selectedFile?.resolution?.id,
        fps: selectedFile?.fps,
        size: selectedFile?.size,
        hasUrl: !!videoUrl,
      });

      // Add videoFileToken for private/internal direct files
      if (videoFileToken && needsAuth) {
        const separator = videoUrl.includes("?") ? "&" : "?";
        videoUrl = `${videoUrl}${separator}videoFileToken=${videoFileToken}`;
      }

      // Wait for token if authentication is required
      if (needsAuth && isLoadingToken) {
        console.log('[VideoScreen] Direct file: Waiting for token to load...');
        return undefined;
      }

      if (needsAuth && !videoFileToken) {
        console.log('[VideoScreen] Direct file: Token required but not available');
        return undefined;
      }

      console.log('[VideoScreen] Direct file URL constructed:', {
        platform: Platform.OS,
        needsAuth,
        hasToken: !!videoFileToken,
        quality: selectedFile?.resolution?.id,
        url: videoUrl ? videoUrl.substring(0, 100) + '...' : 'undefined',
      });
    } else if (data.streamingPlaylists?.length) {
      // Fallback to HLS streaming if direct files not available
      console.warn('[VideoScreen] No direct files available, falling back to HLS streaming');

      let hlsStream: VideoStreamingPlaylist;

      const premiumAd = premiumAdsData[randomPremiumAdIndex];

      if (isPremiumVideoUnavailable && premiumAd?.streamingPlaylists?.length) {
        hlsStream = premiumAd.streamingPlaylists[0];
      } else {
        hlsStream = data.streamingPlaylists[0];
      }

      videoUrl = hlsStream.playlistUrl;

      // Use appropriate token for HLS streaming
      const token = streamingPlaylistToken || videoFileToken;

      if (token && needsAuth) {
        const separator = videoUrl.includes("?") ? "&" : "?";
        videoUrl = `${videoUrl}${separator}videoFileToken=${token}`;
      }

      // Wait for token if authentication is required for HLS streaming
      if (needsAuth && isLoadingToken) {
        console.log('[VideoScreen] HLS: Waiting for token to load...');
        return undefined;
      }

      if (needsAuth && !token) {
        console.log('[VideoScreen] HLS: Token required but not available');
        return undefined;
      }

      console.log('[VideoScreen] HLS URL constructed (fallback):', {
        platform: Platform.OS,
        needsAuth,
        hasToken: !!(streamingPlaylistToken || videoFileToken),
        url: videoUrl ? videoUrl.substring(0, 100) + '...' : 'undefined',
      });
    } else {
      // This should never happen due to our earlier check, but handle it anyway
      console.error('[VideoScreen] No playable video source found!', {
        hasFiles: !!data.files?.length,
        hasHLS: !!data.streamingPlaylists?.length,
        platform: Platform.OS,
      });
      setTokenError('Video playback unavailable. No video files or streams found.');
      return undefined;
    }

    console.log('[VideoScreen] === Final URI decision ===');
    console.log('[VideoScreen] finalUrl:', videoUrl ? videoUrl.substring(0, 150) + '...' : 'undefined');
    console.log('[VideoScreen] usedDirectFile:', !!data.files?.length);
    console.log('[VideoScreen] usedHLS:', !data.files?.length && !!data.streamingPlaylists?.length);
    console.log('[VideoScreen] platform:', Platform.OS);
    console.log('[VideoScreen] needsAuth:', needsAuth);

    return videoUrl;
  }, [params, data, quality, premiumAdsData, isPremiumVideoUnavailable, videoFileToken, streamingPlaylistToken, isLoadingToken]);

  const handleSetTimeStamp = (timestamp: number) => {
    if (!params?.id || isPremiumVideoUnavailable) {
      return;
    }

    updateHistory({ data: { uuid: params.id, timestamp, lastViewedAt: new Date().getTime() } });
  };

  const [visibleModal, setVisibleModal] = useState<"details" | "share" | "settings" | null>(null);
  const closeModal = () => {
    setVisibleModal(null);
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        closeModal();
        setQuality("auto");
      };
    }, []),
  );

  const handleBackButtonPress = () => {
    router.navigate({ pathname: ROUTES.HOME, params });
  };
  const handleOpenDetails = () => {
    setVisibleModal("details");
    captureDiagnosticsEvent(CustomPostHogEvents.ShowVideoDescription);
  };

  const handleCloseDetails = () => {
    setVisibleModal(null);
    captureDiagnosticsEvent(CustomPostHogEvents.HideVideoDescription);
  };

  const handleOpenShare = () => {
    setVisibleModal("share");
    captureDiagnosticsEvent(CustomPostHogEvents.Share, { type: "video" });
  };

  const handleSetQuality = (quality: string) => {
    setQuality(quality);
    captureDiagnosticsEvent(CustomPostHogEvents.ResolutionChanged, { resolution: quality });
  };

  if (isLoading || (isPremiumVideo && isLoadingSubscriptionData) || isLoadingToken) {
    return (
      <View style={[{ paddingTop: top }, styles.flex1]}>
        {Platform.OS !== "web" && (
          <Button onPress={handleBackButtonPress} contrast="low" icon="Arrow-Left" style={styles.backButton} />
        )}
        <View style={styles.flex1}>
          <Loader />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <ErrorTextWithRetry refetch={refetch} errorText={t("videoFailedToLoad")} />
      </View>
    );
  }

  if (tokenError) {
    return (
      <View style={styles.errorContainer}>
        <ErrorTextWithRetry
          refetch={() => {
            setTokenError(null);
            refetch();
          }}
          errorText={tokenError}
        />
      </View>
    );
  }

  // Check if user is authenticated
  if (!session) {
    const handleSignIn = () => {
      router.navigate({
        pathname: ROUTES.SIGNIN,
        params: { backend: params?.backend, returnTo: ROUTES.VIDEO, videoId: params?.id },
      });
    };

    return (
      <View style={[styles.errorContainer, { paddingTop: top }]}>
        {Platform.OS !== "web" && (
          <Button onPress={handleBackButtonPress} contrast="low" icon="Arrow-Left" style={styles.backButton} />
        )}
        <EmptyPage text={t("signInRequired")} />
        <Button
          onPress={handleSignIn}
          contrast="high"
          text={t("signInToViewVideos")}
          style={styles.signInButton}
        />
      </View>
    );
  }

  if (!uri && !isWaitingForLive) {
    return null;
  }

  return (
    <FocusWrapper>
      <StatusBar hidden={isFullscreen} backgroundColor="black" style="light" />
      <View style={[{ height: Platform.isTV ? 0 : top }, styles.statusBarUnderlay]} />
      <View
        id="video-container"
        style={[styles.videoContainer, { paddingTop: Platform.isTV ? 0 : top, marginTop: Platform.isTV ? 0 : -top }]}
      >
        <VideoView
          videoData={data}
          isModalOpen={!!visibleModal}
          timestamp={isPremiumVideoUnavailable ? "0" : params?.timestamp}
          handleSetTimeStamp={handleSetTimeStamp}
          testID={`${params.id}-video-view`}
          uri={uri}
          title={data?.name}
          channel={data?.channel}
          toggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          handleOpenDetails={handleOpenDetails}
          handleOpenSettings={() => {
            setVisibleModal("settings");
          }}
          handleShare={handleOpenShare}
          viewUrl={data?.url}
          selectedQuality={quality}
          handleSetQuality={handleSetQuality}
          captions={isPremiumVideoUnavailable ? premiumAdsCaptions[randomPremiumAdIndex] : captions}
          isWaitingForLive={isWaitingForLive}
        />
        <FullScreenModal onBackdropPress={handleCloseDetails} isVisible={visibleModal === "details"}>
          <VideoDetails
            onClose={handleCloseDetails}
            name={data?.name || ""}
            channel={data?.channel}
            description={data?.description || ""}
            datePublished={data?.originallyPublishedAt || data?.publishedAt || ""}
          />
        </FullScreenModal>
        <FullScreenModal onBackdropPress={closeModal} isVisible={visibleModal === "share"}>
          <Share onClose={closeModal} titleKey="shareVideo" />
        </FullScreenModal>
        <FullScreenModal onBackdropPress={closeModal} isVisible={visibleModal === "settings"}>
          <Settings onClose={closeModal} />
        </FullScreenModal>
      </View>
    </FocusWrapper>
  );
};

const styles = StyleSheet.create({
  backButton: { alignSelf: "flex-start", height: 48, margin: spacing.sm, width: 48 },
  errorContainer: { alignItems: "center", flex: 1, height: "100%", justifyContent: "center", width: "100%" },
  flex1: { flex: 1 },
  signInButton: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, height: 48 },
  statusBarUnderlay: { backgroundColor: colorSchemes.dark.colors.black100, width: "100%" },
  videoContainer: { minHeight: "100%", minWidth: "100%" },
});
