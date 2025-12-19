import { getErrorTextKeys, QUERY_KEYS, useGetCategoriesCollectionQuery, useGetCategoriesQuery } from "../../api";
import { Button, EmptyPage, ErrorPage, InfoFooter, Loader, VideoGrid } from "../../components";
import { getAvailableVidsString } from "../../utils";
import { ROUTES } from "../../types";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorForbiddenLogo } from "../../components/Svg";
import { useCustomFocusManager, usePageContentTopPadding } from "../../hooks";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import { useAuthSessionStore } from "../../store";
import { spacing } from "../../theme";

export const CategoriesScreen = () => {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useAuthSessionStore();
  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
    error: categoriesError,
  } = useGetCategoriesQuery({});
  const {
    data,
    isLoading: isLoadingCategoriesCollection,
    isError: isCollectionError,
  } = useGetCategoriesCollectionQuery(categories);
  const { backend } = useLocalSearchParams();
  const { t } = useTranslation();
  const { top } = usePageContentTopPadding();
  const isError = isCategoriesError || isCollectionError;
  const isLoading = isLoadingCategoriesCollection || isLoadingCategories;
  useCustomFocusManager();

  const refetchPageData = async () => {
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.categories] });
    await queryClient.refetchQueries({ queryKey: [QUERY_KEYS.categoriesCollection] });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchPageData();
    setRefreshing(false);
  };

  if (isLoading) {
    return <Loader />;
  }

  // Check if user is authenticated
  if (!session) {
    const handleSignIn = () => {
      router.navigate({
        pathname: ROUTES.SIGNIN,
        params: { backend, returnTo: ROUTES.CATEGORIES },
      });
    };

    return (
      <View style={[styles.errorContainer, { paddingTop: top }]}>
        <EmptyPage text={t("signInRequired")} />
        <Button onPress={handleSignIn} contrast="high" text={t("signInToViewVideos")} style={styles.signInButton} />
      </View>
    );
  }

  if (isError) {
    const { title, description } = getErrorTextKeys(categoriesError);

    return (
      <ErrorPage
        title={t(title)}
        description={t(description)}
        logo={<ErrorForbiddenLogo />}
        button={{ text: t("tryAgain"), action: refetchPageData }}
      />
    );
  }

  if (!data.length) {
    return <EmptyPage text={t("noCategoriesAvailable")} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        style={{ flex: 1 }}
        data={data}
        keyExtractor={(item) => String(item.data?.id)}
        renderItem={({ item }) => (
          <VideoGrid
            backend={backend}
            isLoading={item.isLoading}
            refetch={item.refetch}
            link={{
              text: t("viewCategory") + getAvailableVidsString(item.data?.total),
              href: { pathname: `/${ROUTES.CATEGORY}`, params: { backend, category: item.data?.id } },
            }}
            title={item.data?.name}
            data={item.data?.data}
          />
        )}
        contentContainerStyle={{ paddingTop: top }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<InfoFooter />}
        refreshControl={
          <RefreshControl
            colors={[colors.theme500]}
            progressBackgroundColor={colors.theme900}
            tintColor={colors.theme900}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: { alignItems: "center", flex: 1, height: "100%", justifyContent: "center", width: "100%" },
  signInButton: { height: 48, marginTop: spacing.lg, paddingHorizontal: spacing.xl },
});
