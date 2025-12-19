import { Platform, Pressable, StyleSheet, View } from "react-native";
import { VideoThumbnail } from "./VideoThumbnail";
import { GetVideosVideo } from "../api/models";
import { Link, useRouter } from "expo-router";
import { ROUTES } from "../types";
import { Typography } from "./Typography";
import { spacing } from "../theme";
import { useBreakpoints, useHoverState, useViewHistory } from "../hooks";
import { useTheme } from "@react-navigation/native";
import { forwardRef, useMemo, useState } from "react";
import TVFocusGuideHelper from "./helpers/TVFocusGuideHelper";
import { FocusGuide } from "./helpers";

interface VideoGridCardProps {
  video: GetVideosVideo;
  backend?: string;
}

export const VideoGridCard = forwardRef<View, VideoGridCardProps>(({ video, backend }, ref) => {
  const { isDesktop } = useBreakpoints();
  const { colors } = useTheme();
  const { isHovered, toggleHovered } = useHoverState();
  const { getViewHistoryEntryByUuid } = useViewHistory({ enabled: false });
  const { timestamp } = getViewHistoryEntryByUuid(video.uuid) || {};
  const [containerWidth, setContainerWidth] = useState(0);
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const linkHref = useMemo(() => {
    return { pathname: `/${ROUTES.VIDEO}`, params: { id: video.uuid, backend, timestamp } };
  }, [video, backend, timestamp]);

  const thumbnailLinkStyles = useMemo(() => {
    return [styles.linkWrapper, ...(Platform.isTV ? [styles.linkWrapperTV] : [{}])];
  }, []);

  const handleTvNavigateToVideo = () => {
    router.navigate(linkHref);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onFocus={Platform.isTV ? () => setFocused(true) : null}
        onBlur={Platform.isTV ? () => setFocused(false) : null}
        style={styles.pressableContainer}
        onPress={Platform.isTV || Platform.OS === "web" ? handleTvNavigateToVideo : null}
        onHoverIn={toggleHovered}
        onHoverOut={toggleHovered}
        ref={ref}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Play video: ${video.name}`}
        accessibilityHint="Opens the video player"
      >
        {/* Thumbnail Container */}
        <View
          onLayout={(e) => {
            setContainerWidth(e.nativeEvent.layout.width);
          }}
          style={styles.thumbnailContainer}
        >
          <Link href={linkHref} asChild style={thumbnailLinkStyles}>
            <Pressable tabIndex={-1} onHoverIn={toggleHovered} onHoverOut={toggleHovered}>
              {focused && <FocusGuide height={containerWidth * (9 / 16)} width={containerWidth} />}
              <VideoThumbnail
                imageDimensions={{ width: containerWidth, height: containerWidth * (9 / 16) }}
                video={video}
                timestamp={timestamp}
                backend={backend}
              />
            </Pressable>
          </Link>
        </View>
        {/* Video Title Container */}
        <TVFocusGuideHelper
          focusable={false}
          style={[styles.textContainer, { backgroundColor: colors.background || "#FFFFFF" }]}
        >
          {/* @ts-expect-error tabIndex is passed to anchor tag but is not officially supported by Expo Router */}
          <Link tabIndex={-1} href={linkHref}>
            <Typography
              fontWeight="Medium"
              color={colors.theme900}
              fontSize={isDesktop ? "sizeMd" : "sizeSm"}
              numberOfLines={2}
              style={{ textDecorationLine: isHovered ? "underline" : undefined }}
            >
              {video.name}
            </Typography>
          </Link>
        </TVFocusGuideHelper>
      </Pressable>
    </View>
  );
});

VideoGridCard.displayName = "VideoGridCard";

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexDirection: "column",
    maxWidth: "100%",
    width: "100%",
  },
  linkWrapper: {
    flex: 1,
    width: "100%",
  },
  linkWrapperTV: {
    borderRadius: 10,
    height: "100%",
    width: "100%",
  },
  pressableContainer: {
    flexDirection: "column", // CRITICAL: Vertical layout for thumbnail + text
    width: "100%",
  },
  textContainer: {
    gap: spacing.sm,
    minHeight: 50, // Ensure enough space for at least 2 lines of text
    paddingBottom: spacing.md, // Space below text to prevent collapse
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md, // Space above text
    width: "100%",
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    width: "100%", // Maintain 16:9 aspect ratio
  },
});
