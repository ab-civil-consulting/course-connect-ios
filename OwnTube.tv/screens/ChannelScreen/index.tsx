import { useLocalSearchParams, useRouter } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { ROUTES } from "../../types";
import { Screen } from "../../layouts";
import { QUERY_KEYS, useGetCategoriesQuery, useGetChannelInfoQuery, useGetChannelPlaylistsQuery } from "../../api";
import { CategoryView, LatestVideos } from "./components";
import { Button, EmptyPage, InfoFooter, Loader } from "../../components";
import { PlaylistVideosView } from "../Playlists/components";
import { ListInfoHeader } from "../../components";
import { useCustomFocusManager, usePageContentTopPadding } from "../../hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthSessionStore } from "../../store";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { spacing } from "../../theme";

export const ChannelScreen = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { session } = useAuthSessionStore();
  const { t } = useTranslation();
  const { backend, channel } = useLocalSearchParams<RootStackParams[ROUTES.CHANNEL]>();

  const { data: channelInfo, isLoading: isLoadingChannelInfo } = useGetChannelInfoQuery(channel);
  const { data: categories } = useGetCategoriesQuery({});
  const { data: playlists } = useGetChannelPlaylistsQuery(channel);
  const { top } = usePageContentTopPadding();
  useCustomFocusManager();

  const refetchPageData = async () => {
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.channelVideos] });
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.channelPlaylists] });
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.playlistVideos] });
  };

  // Check if user is authenticated
  if (!session) {
    const handleSignIn = () => {
      router.navigate({
        pathname: ROUTES.SIGNIN,
        params: { backend, returnTo: ROUTES.CHANNEL, channel },
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

  return (
    <Screen onRefresh={refetchPageData} style={{ padding: 0, paddingTop: top }}>
      {isLoadingChannelInfo ? (
        <Loader />
      ) : (
        <ListInfoHeader
          avatarUrl={
            channelInfo?.avatars?.[0]?.path ? `https://${backend}${channelInfo?.avatars?.[0]?.path}` : undefined
          }
          name={channelInfo?.displayName}
          description={channelInfo?.description}
          linkHref={channelInfo?.url}
        />
      )}
      <LatestVideos />
      {playlists?.map(({ uuid, displayName, id, videoChannel }) => (
        <PlaylistVideosView channel={videoChannel?.name} id={id} title={displayName} key={uuid} />
      ))}
      {categories?.map((category) => (
        <CategoryView channelHandle={channel} category={category} key={category.id} />
      ))}
      <InfoFooter />
    </Screen>
  );
};

const styles = StyleSheet.create({
  errorContainer: { alignItems: "center", flex: 1, height: "100%", justifyContent: "center", width: "100%" },
  signInButton: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, height: 48 },
});
