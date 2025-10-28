import { useLocalSearchParams, useRouter } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { ROUTES } from "../../types";
import { InfoFooter, Loader, VideoGrid } from "../../components";
import { QUERY_KEYS, useGetCategoriesQuery, useInfiniteVideosQuery } from "../../api";
import { useMemo } from "react";
import { useCustomFocusManager, usePageContentTopPadding } from "../../hooks";
import { useTranslation } from "react-i18next";
import { useAppConfigContext } from "../../contexts";
import { useQueryClient } from "@tanstack/react-query";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IcoMoonIcon } from "../../components/IcoMoonIcon";
import { Typography } from "../../components/Typography";
import { useTheme } from "@react-navigation/native";
import { spacing } from "../../theme";

export const CategoryScreen = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentInstanceConfig } = useAppConfigContext();
  const { category, backend } = useLocalSearchParams<RootStackParams[ROUTES.CATEGORY]>();
  const { data: categories, isLoading: isLoadingCategories } = useGetCategoriesQuery({});
  const { t } = useTranslation();
  const { top } = usePageContentTopPadding();
  useCustomFocusManager();

  const categoryTitle = useMemo(() => {
    return categories?.find(({ id }) => String(id) === category)?.name;
  }, [categories, category]);

  const { fetchNextPage, data, hasNextPage, isLoading, isFetchingNextPage, isError, error } = useInfiniteVideosQuery({
    uniqueQueryKey: `${QUERY_KEYS.categoryVideosView}-${category}`,
    queryParams: { categoryOneOf: [Number(category)] },
    pageSize: currentInstanceConfig?.customizations?.showMoreSize,
    backend: backend,
  });

  const videos = useMemo(() => {
    const flatVideos = data?.pages?.flatMap(({ data }) => data.flat());
    return flatVideos;
  }, [data, hasNextPage, isLoading, isFetchingNextPage, isError, error]);

  const refetchPageData = async () => {
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.videos], type: "active" });
  };

  if (isLoadingCategories) {
    return <Loader />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IcoMoonIcon name="Chevron-Left" size={24} color={colors.text} />
        </Pressable>
        <Typography variant="h2" style={[styles.title, { color: colors.text }]}>
          {categoryTitle}
        </Typography>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <VideoGrid
          isLoading={isLoading}
          data={videos}
          backend={backend}
          isLoadingMore={isFetchingNextPage}
          onEndReached={hasNextPage ? fetchNextPage : undefined}
          onEndReachedThreshold={0.8}
          link={{ text: t("showMore") }}
          isTVActionCardHidden={!hasNextPage}
        />
        <InfoFooter />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {
    padding: spacing.md,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  placeholder: {
    width: 40 + spacing.md * 2, // Same width as back button for centering
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
});
