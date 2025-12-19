import { View, Image, StyleSheet, Platform } from "react-native";
import { useTheme } from "@react-navigation/native";
import { FC, useState, useEffect } from "react";
import { ViewHistoryEntry } from "../hooks";
import { GetVideosVideo, ApiServiceImpl } from "../api";
import { borderRadius, spacing } from "../theme";
import { Typography } from "./Typography";
import { getHumanReadableDuration } from "../utils";
import { useTranslation } from "react-i18next";
import { useAppConfigContext } from "../contexts";

interface VideoThumbnailProps {
  video: GetVideosVideo & Partial<ViewHistoryEntry>;
  backend?: string;
  timestamp?: number;
  isVisible?: boolean;
  imageDimensions: { width: number; height: number };
}

const fallback = require("../assets/thumbnailFallback.png");

export const VideoThumbnail: FC<VideoThumbnailProps> = ({
  video,
  backend: backendProp,
  timestamp,
  imageDimensions,
}) => {
  const { colors } = useTheme();
  const { primaryBackend } = useAppConfigContext();
  const [isError, setIsError] = useState(false);
  const [imageToken, setImageToken] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { t } = useTranslation();
  const isVideoCurrentlyLive = video.state?.id === 1 && video.isLive;

  // Use backend from props, fallback to primaryBackend from context
  const backend = backendProp || primaryBackend;

  const percentageWatched = timestamp ? (timestamp / video.duration) * 100 : 0;

  // Fetch token for private thumbnails
  useEffect(() => {
    const thumbnailPath = video.previewPath || video.thumbnailPath;
    if (!backend || !video.uuid || !thumbnailPath) {
      return;
    }

    // Check if thumbnail is private
    if (thumbnailPath.includes("/lazy-static/") && backend) {
      // Private thumbnails might need authentication, try to fetch token
      ApiServiceImpl.requestVideoToken(backend, video.uuid)
        .then((tokenData) => {
          if (tokenData?.files?.token) {
            setImageToken(tokenData.files.token);
          }
        })
        .catch(() => {
          // If token fetch fails, image will try to load without token
        });
    }
  }, [backend, video.uuid, video.previewPath, video.thumbnailPath]);

  // Use previewPath first, fall back to thumbnailPath if previewPath is empty
  const thumbnailPath = video.previewPath || video.thumbnailPath;

  // Validate and construct thumbnail URL
  let imageUrl: string | null = null;

  if (thumbnailPath && backend) {
    // Check if thumbnailPath is already a full URL
    if (thumbnailPath.startsWith("http://") || thumbnailPath.startsWith("https://")) {
      // Already a full URL, use it directly
      imageUrl = thumbnailPath;
    } else {
      // Relative path, construct full URL with backend
      const cleanBackend = backend.replace(/^https?:\/\//, "");
      imageUrl = `https://${cleanBackend}${thumbnailPath}`;
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (e) {
      const _urlValidationError = `Invalid URL: ${imageUrl}`;
      imageUrl = null;
      console.error("[VideoThumbnail] URL validation failed:", { imageUrl, error: e });
    }
  }

  const imageUrlWithToken =
    imageUrl && imageToken ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}videoFileToken=${imageToken}` : imageUrl;

  const imageSource = imageUrlWithToken ? { uri: imageUrlWithToken } : fallback;

  // Only show warning if backend is truly missing or dimensions are invalid after initial layout
  if (!backend) {
    if (__DEV__) {
      console.warn("[VideoThumbnail] No backend available:", { backendProp, primaryBackend });
    }
    return null;
  }

  if (!imageDimensions.width || !imageDimensions.height) {
    // During initial render, dimensions may be 0 while container measures itself
    // Return placeholder with proper aspect ratio to prevent layout shift
    return <View style={[styles.videoThumbnailContainer, { backgroundColor: colors.themeDesaturated500 }]} />;
  }

  return (
    <View style={[styles.videoThumbnailContainer, { backgroundColor: colors.themeDesaturated500 }]}>
      <Image
        width={imageDimensions.width}
        height={imageDimensions.height}
        resizeMode="cover"
        source={isError ? fallback : imageSource}
        style={[
          styles.videoImage,
          // iOS-specific: use explicit dimensions, not flex
          Platform.OS === "ios" && {
            width: imageDimensions.width,
            height: imageDimensions.height,
          },
        ]}
        onError={(_error) => {
          // Retry logic: retry up to 2 times with exponential backoff
          if (retryCount < 2 && imageSource !== fallback) {
            const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s

            setTimeout(() => {
              setRetryCount(retryCount + 1);
              setIsError(false); // Reset error state to trigger retry
            }, retryDelay);
          } else {
            // Only log when we've exhausted all retries and showing fallback
            console.error("[VideoThumbnail] Failed to load thumbnail after retries, showing fallback:", {
              uuid: video.uuid,
              videoName: video.name,
              backend,
              thumbnailPath,
            });
            setIsError(true);
          }
        }}
      />
      {!!percentageWatched && percentageWatched > 0 && !video.isLive && (
        <View style={[styles.progressContainer, { backgroundColor: colors.white25 }]}>
          <View style={{ backgroundColor: colors.theme500, width: `${percentageWatched}%`, height: spacing.xs }} />
        </View>
      )}
      {video.isLive ? (
        <View
          style={[
            styles.durationContainer,
            {
              backgroundColor: isVideoCurrentlyLive ? colors.error500 : colors.black100,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              paddingLeft: spacing.sm,
            },
          ]}
        >
          <View
            style={{ width: spacing.sm, height: spacing.sm, backgroundColor: colors.white94, borderRadius: spacing.xs }}
          />
          <Typography
            color={colors.white94}
            fontSize="sizeXS"
            fontWeight="SemiBold"
            style={{ textTransform: "uppercase" }}
          >
            {isVideoCurrentlyLive ? t("live") : t("offline")}
          </Typography>
        </View>
      ) : (
        <View style={[styles.durationContainer, { backgroundColor: colors.black100 }]}>
          <Typography color={colors.white94} fontSize="sizeXS" fontWeight="SemiBold">
            {getHumanReadableDuration(video.duration * 1000)}
          </Typography>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  durationContainer: {
    borderRadius: borderRadius.radiusMd,
    bottom: spacing.xs + 2,
    padding: spacing.xs,
    position: "absolute",
    right: spacing.sm,
    zIndex: 1,
  },
  progressContainer: {
    bottom: 0,
    flex: 1,
    height: spacing.xs,
    left: 0,
    position: "absolute",
    right: 0,
    width: "100%",
    zIndex: 1,
  },
  videoImage: {
    // FIXED: Removed flex: 1 which conflicts with explicit dimensions on iOS
    // Using explicit width/height props instead
    aspectRatio: 16 / 9,
  },
  videoThumbnailContainer: {
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.radiusMd,
    overflow: "hidden",
    width: "100%",
  },
});
