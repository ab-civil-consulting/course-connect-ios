import { InfoFooter, Loader } from "../../components";
import { useTheme } from "@react-navigation/native";
import { useGetCategoriesQuery } from "../../api";
import { useCustomFocusManager, usePageContentTopPadding } from "../../hooks";
import { borderRadius, spacing, colors } from "../../theme";
import { ROUTES } from "../../types";
import { FlatList, Image, Platform, Pressable, SectionList, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RootStackParams } from "../../app/_layout";
import { Typography } from "../../components/Typography";
import { useMemo } from "react";

// Category images mapping - maps category names to images
// Place your images in assets/categories/ folder with these names:
const categoryImages: Record<string, any> = {
  "Popular Videos": require("../../assets/categories/popular-videos.png"),
  "Uploading & File Formats": require("../../assets/categories/uploading-file-formats.png"),
  "Intro to Machine Control": require("../../assets/categories/intro-machine-control.png"),
  "Earthworks Infield Design": require("../../assets/categories/earthworks-infield-design.png"),
  "Earthworks Core Features": require("../../assets/categories/earthworks-core-features.png"),
  "Earthworks Project Setup": require("../../assets/categories/earthworks-project-setup.png"),
  "Earthworks First-Time Setup": require("../../assets/categories/earthworks-first-time-setup.png"),
  "Earthworks Basics": require("../../assets/categories/earthworks-basics.png"),
  "Siteworks Advanced Layout": require("../../assets/categories/siteworks-advanced-layout.png"),
  "Siteworks Basic Layout": require("../../assets/categories/siteworks-basic-layout.png"),
  "Siteworks Project Setup": require("../../assets/categories/siteworks-project-setup.png"),
  "Siteworks Basics": require("../../assets/categories/siteworks-basics.png"),
  "Siteworks First-Time Setup": require("../../assets/categories/siteworks-first-time-setup.png"),
};

export const HomeScreen = () => {
  const { colors } = useTheme();
  const { backend } = useLocalSearchParams<RootStackParams[ROUTES.INDEX]>();
  const { top } = usePageContentTopPadding();
  const router = useRouter();
  useCustomFocusManager();

  const { data: categories, isLoading } = useGetCategoriesQuery({});

  const handleCategoryPress = (categoryId: number) => {
    router.push({
      pathname: `/${ROUTES.CATEGORY}`,
      params: { category: String(categoryId), backend },
    });
  };

  // Group categories into sections based on category names
  const categoryGroups = useMemo(() => {
    if (!categories) return [];

    const generalCategories = categories.filter(
      (c) =>
        c.name.toLowerCase().includes("popular") ||
        c.name.toLowerCase().includes("uploading") ||
        c.name.toLowerCase().includes("intro") ||
        c.name.toLowerCase().includes("file format"),
    );

    const earthworksCategories = categories.filter((c) => c.name.toLowerCase().includes("earthworks"));

    const siteworksCategories = categories.filter((c) => c.name.toLowerCase().includes("siteworks"));

    // Filter out categories that have been placed in sections
    const categorizedIds = new Set([
      ...generalCategories.map((c) => c.id),
      ...earthworksCategories.map((c) => c.id),
      ...siteworksCategories.map((c) => c.id),
    ]);

    const otherCategories = categories.filter((c) => !categorizedIds.has(c.id));

    return [
      generalCategories.length > 0 && {
        title: "General",
        data: generalCategories,
      },
      earthworksCategories.length > 0 && {
        title: "Earthworks",
        data: earthworksCategories,
      },
      siteworksCategories.length > 0 && {
        title: "Siteworks",
        data: siteworksCategories,
      },
      otherCategories.length > 0 && {
        title: "Other",
        data: otherCategories,
      },
    ].filter(Boolean);
  }, [categories]);

  if (isLoading) {
    return <Loader />;
  }

  const renderCategoryItem = (category: { name: string; id: number }) => (
    <Pressable
      key={category.id}
      onPress={() => handleCategoryPress(category.id)}
      style={({ pressed, focused }) => [
        styles.categoryCard,
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
        Platform.isTV && focused && styles.categoryCardFocused,
      ]}
    >
      <Image
        source={categoryImages[category.name] || require("../../assets/thumbnailFallback.png")}
        style={styles.categoryImage}
        resizeMode="stretch"
      />
    </Pressable>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <Typography variant="h3" style={[styles.sectionTitle, { color: colors.text }]}>
      {section.title}
    </Typography>
  );

  const renderSection = ({ item }: { item: Array<{ name: string; id: number }> }) => (
    <FlatList
      horizontal
      data={item}
      renderItem={({ item: category }) => renderCategoryItem(category)}
      keyExtractor={(item) => String(item.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carousel}
      style={styles.horizontalList}
    />
  );

  // Transform data for SectionList - each section has a single item (the array of categories)
  const sections = categoryGroups.map((group) => ({
    title: group.title,
    data: [group.data], // Wrap in array since SectionList expects array of items
  }));

  return (
    <View
      style={{
        ...styles.container,
        backgroundColor: colors.background,
      }}
    >
      <SectionList
        sections={sections}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderSection}
        keyExtractor={(item, index) => `section-${index}`}
        contentContainerStyle={[styles.scrollContent, { paddingTop: top + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={<InfoFooter />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  carousel: {
    paddingHorizontal: spacing.lg,
  },
  categoryCard: {
    borderRadius: borderRadius.lg,
    height: Platform.select({ web: 140, default: 120 }),
    marginRight: spacing.md,
    overflow: "hidden",
    width: Platform.select({ web: 280, default: 220 }),
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
  categoryCardFocused: {
    elevation: 8,
    transform: [{ scale: 1.05 }],
    ...(Platform.OS === "web"
      ? {
          boxShadow: `0px 4px 4.65px rgba(0, 0, 0, 0.3)`,
        }
      : {
          shadowColor: colors.black100,
          shadowOffset: {
            height: 4,
            width: 0,
          },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
        }),
  },
  categoryImage: {
    height: "100%",
    width: "100%",
  },
  container: {
    flex: 1,
  },
  horizontalList: {
    marginBottom: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
