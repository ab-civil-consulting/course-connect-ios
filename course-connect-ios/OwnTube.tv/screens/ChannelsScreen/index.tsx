import { getErrorTextKeys, QUERY_KEYS, useGetChannelsCollectionQuery, useGetChannelsQuery } from "../../api";
import { Screen } from "../../layouts";
import { spacing } from "../../theme";
import { Button, EmptyPage, ErrorPage, InfoFooter, Loader, VideoGrid } from "../../components";
import { StyleSheet, View } from "react-native";
import { useMemo } from "react";
import { getAvailableVidsString } from "../../utils";
import { ROUTES } from "../../types";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorForbiddenLogo } from "../../components/Svg";
import { useCustomFocusManager, usePageContentTopPadding } from "../../hooks";
import { useAuthSessionStore } from "../../store";

export const ChannelsScreen = () => {
  const { backend } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthSessionStore();
  const queryClient = useQueryClient();
  const {
    data: channels,
    isLoading: isLoadingChannels,
    isError: isChannelsError,
    error: channelsError,
  } = useGetChannelsQuery({ enabled: true });
  const { t } = useTranslation();
  const { top } = usePageContentTopPadding();
  const {
    data: channelSections,
    isLoading: isLoadingChannelsCollection,
    isError: isChannelsCollectionError,
  } = useGetChannelsCollectionQuery(channels?.map(({ name }) => name));
  const isError = isChannelsError || isChannelsCollectionError;
  const isLoading = isLoadingChannels || isLoadingChannelsCollection;
  const refetchPageData = async () => {
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.channels] });
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.channelsCollection] });
  };
  useCustomFocusManager();

  const renderScreenContent = useMemo(() => {
    if (isLoading) {
      return <Loader />;
    }

    // Check if user is authenticated
    if (!session) {
      const handleSignIn = () => {
        router.navigate({
          pathname: ROUTES.SIGNIN,
          params: { backend, returnTo: ROUTES.CHANNELS },
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
      const { title, description } = getErrorTextKeys(channelsError);

      return (
        <ErrorPage
          title={t(title)}
          description={t(description)}
          logo={<ErrorForbiddenLogo />}
          button={{ text: t("tryAgain"), action: refetchPageData }}
        />
      );
    }

    return channelSections?.map(({ data, isLoading, refetch }) => {
      const channelInfoSection = channels?.find(({ name }) => name === data?.id);

      return (
        <VideoGrid
          isLoading={isLoading}
          refetch={refetch}
          link={{
            text: t("visitChannel") + getAvailableVidsString(data?.total),
            href: { pathname: `/${ROUTES.CHANNEL}`, params: { backend, channel: channelInfoSection?.name } },
          }}
          variant="channel"
          key={data?.id}
          title={channelInfoSection?.displayName}
          data={data?.data}
          channelLogoUri={channelInfoSection?.avatars?.[0]?.path}
        />
      );
    });
  }, [isLoading, isLoadingChannels, channelSections, channels, backend]);

  if (!channelSections.length) {
    return <EmptyPage text={t("noChannelsAvailable")} />;
  }

  return (
    <Screen onRefresh={refetchPageData} style={{ ...styles.screenContainer, paddingTop: top }}>
      {renderScreenContent}
      <InfoFooter />
    </Screen>
  );
};

const styles = StyleSheet.create({
  errorContainer: { alignItems: "center", flex: 1, height: "100%", justifyContent: "center", width: "100%" },
  screenContainer: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xl,
    justifyContent: "center",
    padding: 0,
  },
  signInButton: { height: 48, marginTop: spacing.lg, paddingHorizontal: spacing.xl },
});
