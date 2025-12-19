import { getErrorTextKeys, QUERY_KEYS, useGetPlaylistsCollectionQuery, useGetPlaylistsQuery } from "../../api";
import { Screen } from "../../layouts";
import { Button, EmptyPage, ErrorPage, InfoFooter, Loader, VideoGrid } from "../../components";
import { getAvailableVidsString } from "../../utils";
import { ROUTES } from "../../types";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import { useCustomFocusManager, usePageContentTopPadding } from "../../hooks";
import { ErrorForbiddenLogo } from "../../components/Svg";
import { useQueryClient } from "@tanstack/react-query";
import { useAppConfigContext } from "../../contexts";
import { useAuthSessionStore } from "../../store";

export const Playlists = () => {
  const router = useRouter();
  const { session } = useAuthSessionStore();
  const { currentInstanceConfig } = useAppConfigContext();
  const queryClient = useQueryClient();
  const [showHiddenPlaylists, setShowHiddenPlaylists] = useState(false);
  const {
    data: playlists,
    isLoading: isLoadingPlaylists,
    isError: isPlaylistsError,
    error: playlistsError,
  } = useGetPlaylistsQuery({
    enabled: true,
    hiddenPlaylists: showHiddenPlaylists ? [] : currentInstanceConfig?.customizations?.playlistsHidden,
  });
  const { t } = useTranslation();
  const { backend } = useLocalSearchParams();
  const {
    data: playlistSections,
    isLoading: isLoadingPlaylistVideos,
    isError: isCollectionError,
  } = useGetPlaylistsCollectionQuery(playlists?.data);
  const isShowAllButtonVisible =
    currentInstanceConfig?.customizations?.playlistsShowHiddenButton && !showHiddenPlaylists;
  const isError = isPlaylistsError || isCollectionError;
  const isLoading = isLoadingPlaylists || isLoadingPlaylistVideos;

  const refetchPageData = async () => {
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.playlists] });
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.playlistsCollection] });
  };
  const { top } = usePageContentTopPadding();
  useCustomFocusManager();

  if (isLoading) {
    return <Loader />;
  }

  // Check if user is authenticated
  if (!session) {
    const handleSignIn = () => {
      router.navigate({
        pathname: ROUTES.SIGNIN,
        params: { backend, returnTo: ROUTES.PLAYLISTS },
      });
    };

    return (
      <View style={[styles.errorContainer, { paddingTop: top }]}>
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

  if (isError) {
    const { title, description } = getErrorTextKeys(playlistsError);

    return (
      <ErrorPage
        title={t(title)}
        description={t(description)}
        logo={<ErrorForbiddenLogo />}
        button={{ text: t("tryAgain"), action: refetchPageData }}
      />
    );
  }

  if (!playlistSections.length) {
    return <EmptyPage text={t("noPlaylistsAvailable")} />;
  }

  return (
    <Screen style={{ padding: 0, paddingTop: top }} onRefresh={refetchPageData}>
      {playlistSections.map(({ data, isLoading, refetch }) => (
        <VideoGrid
          isLoading={isLoading}
          variant="playlist"
          isError={data?.isError}
          refetch={refetch}
          key={data?.id}
          title={data?.displayName}
          data={data?.data}
          link={{
            text: t("viewFullPlaylist") + getAvailableVidsString(data?.total),
            href: {
              pathname: `/${ROUTES.PLAYLIST}`,
              params: { backend, playlist: data?.id },
            },
          }}
        />
      ))}
      {isShowAllButtonVisible && (
        <View style={styles.showAllButtonContainer}>
          <Button contrast="low" text="Show all playlists" onPress={() => setShowHiddenPlaylists(true)} />
        </View>
      )}
      <InfoFooter />
    </Screen>
  );
};

const styles = StyleSheet.create({
  errorContainer: { alignItems: "center", flex: 1, height: "100%", justifyContent: "center", width: "100%" },
  showAllButtonContainer: { alignItems: "flex-start", padding: spacing.xl, width: "100%" },
  signInButton: { height: 48, marginTop: spacing.lg, paddingHorizontal: spacing.xl },
});
