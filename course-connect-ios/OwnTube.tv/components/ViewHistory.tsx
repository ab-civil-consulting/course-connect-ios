import { useBreakpoints, usePageContentTopPadding, useViewHistory, ViewHistoryEntry } from "../hooks";
import { SectionList, StyleSheet, View } from "react-native";
import { Loader } from "./Loader";
import { Spacer } from "./shared/Spacer";
import { Typography } from "./Typography";
import { VideoListItem } from "./VideoListItem";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import { Screen } from "../layouts";
import { spacing } from "../theme";
import { Button } from "./shared";
import { useTheme } from "@react-navigation/native";
import { groupHistoryEntriesByTime } from "../utils";
import { ModalContainer } from "./ModalContainer";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RootStackParams } from "../app/_layout";
import { ROUTES } from "../types";
import { useAppConfigContext, useFullScreenModalContext } from "../contexts";
import { EmptyPage } from "./EmptyPage";
import { InfoFooter } from "./InfoFooter";
import { useAuthSessionStore } from "../store";

export const ViewHistory = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuthSessionStore();
  const { backend } = useLocalSearchParams<RootStackParams[ROUTES.HISTORY]>();
  const { top } = usePageContentTopPadding();
  const {
    viewHistory = [],
    clearInstanceHistory,
    isFetching,
    deleteVideoFromHistory,
  } = useViewHistory({ backendToFilter: backend });
  const { isMobile } = useBreakpoints();
  const { colors } = useTheme();
  const { currentInstanceConfig } = useAppConfigContext();

  const { toggleModal, setContent } = useFullScreenModalContext();

  const handleClearConfirmation = () => {
    toggleModal(true);
    setContent(
      <Animated.View
        entering={SlideInUp}
        exiting={SlideOutUp}
        style={[styles.clearModalWrapper, { pointerEvents: "box-none" }]}
      >
        <ModalContainer
          onClose={() => toggleModal(false)}
          title={t("clearSiteHistoryQuestion", {
            appName: currentInstanceConfig?.customizations?.pageTitle ?? backend,
          })}
        >
          <View style={styles.modalContentContainer}>
            <Button onPress={() => toggleModal(false)} text={t("cancel")} />
            <Button
              icon="Trash"
              contrast="high"
              text={t("clearAllHistory")}
              onPress={() => {
                toggleModal(false);
                clearInstanceHistory(backend);
              }}
            />
          </View>
        </ModalContainer>
      </Animated.View>,
    );
  };

  const sections = useMemo(() => {
    return groupHistoryEntriesByTime(viewHistory);
  }, [viewHistory]);

  const renderItem = useCallback(
    ({ item }: { item: ViewHistoryEntry }) => (
      <VideoListItem
        handleDeleteFromHistory={() => deleteVideoFromHistory(item.uuid)}
        video={item}
        backend={item.backend}
        timestamp={item.timestamp}
        lastViewedAt={item.lastViewedAt}
      />
    ),
    [deleteVideoFromHistory],
  );

  // Check if user is authenticated
  if (!session) {
    const handleSignIn = () => {
      router.navigate({
        pathname: ROUTES.SIGNIN,
        params: { backend, returnTo: ROUTES.HISTORY },
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

  if (!viewHistory?.length && !isFetching) {
    return <EmptyPage text={t("viewHistoryEmpty")} />;
  }

  if (isFetching) {
    return <Loader />;
  }

  return (
    <Screen
      scrollable={false}
      style={styles.screenContainer}
    >
      <SectionList
        style={styles.sectionListContainer}
        contentContainerStyle={{
          paddingHorizontal: isMobile ? spacing.sm : spacing.xl,
          paddingVertical: spacing.xl,
          maxWidth: 900,
          width: "100%",
          alignSelf: "center",
        }}
        renderItem={renderItem}
        sections={sections}
        ListHeaderComponent={
          <>
            <View style={styles.headerContainer}>
              <Typography
                fontSize={isMobile ? "sizeXL" : "sizeXXL"}
                fontWeight="ExtraBold"
                color={colors.theme900}
                style={styles.header}
              >
                {t("yourWatchHistory")}
              </Typography>
              <Button
                icon="Trash"
                onPress={handleClearConfirmation}
                text={t("clearSiteHistory", {
                  appName: currentInstanceConfig?.customizations?.pageTitle ?? backend,
                })}
              />
            </View>
            <Spacer height={spacing.xl} />
          </>
        }
        renderSectionHeader={({ section: { titleKey } }) => (
          <Typography style={styles.sectionHeader} color={colors.theme900} fontWeight="Bold" fontSize="sizeLg">
            {t(titleKey)}
          </Typography>
        )}
        ItemSeparatorComponent={() => <Spacer height={spacing.xl} />}
        renderSectionFooter={() => <Spacer height={spacing.xxl} />}
        ListFooterComponent={<InfoFooter />}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  clearModalWrapper: { alignItems: "center", flex: 1, justifyContent: "center" },
  errorContainer: { alignItems: "center", flex: 1, height: "100%", justifyContent: "center", width: "100%" },
  header: { marginBottom: 16 },
  headerContainer: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  modalContentContainer: { flexDirection: "row", gap: spacing.lg, justifyContent: "flex-end" },
  screenContainer: { flex: 1 },
  sectionHeader: { paddingBottom: spacing.xl },
  sectionListContainer: { flex: 1 },
  signInButton: { height: 48, marginTop: spacing.lg, paddingHorizontal: spacing.xl },
});
