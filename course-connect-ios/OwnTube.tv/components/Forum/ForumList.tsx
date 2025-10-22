import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Typography } from "../Typography";
import { useTranslation } from "react-i18next";
import { useTheme } from "@react-navigation/native";
import { spacing } from "../../theme";
import {
  useForumCategories,
  useCreateForumCategory,
  useUpdateForumCategory,
  useDeleteForumCategory,
} from "../../api/queries/forum";
import { ForumCategory } from "../../api/models/forum";
import { useBreakpoints, useHoverState } from "../../hooks";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { ROUTES } from "../../types";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState, useCallback } from "react";
import { Button } from "../shared";
import { EditCategoryModal } from "./EditCategoryModal";

interface ForumCategoryItemProps {
  category: ForumCategory;
  backend: string;
  onEdit?: (category: ForumCategory) => void;
  canManage?: boolean;
}

const ForumCategoryItem = ({ category, backend, onEdit, canManage }: ForumCategoryItemProps) => {
  const { colors } = useTheme();
  const { isHovered, toggleHovered } = useHoverState();
  const router = useRouter();
  const { t } = useTranslation();
  const { isDesktop } = useBreakpoints();

  const handlePress = () => {
    router.navigate({
      pathname: `/${ROUTES.FORUM_CATEGORY}`,
      params: { categoryId: category.id, backend, categoryName: category.name },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={toggleHovered}
      onHoverOut={toggleHovered}
      style={[
        styles.categoryItem,
        {
          backgroundColor: isHovered ? colors.card : colors.background,
          borderColor: colors.border,
          padding: isDesktop ? spacing.lg : spacing.md,
        },
      ]}
    >
      {canManage && (
        <View style={styles.categoryActions}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEdit?.(category);
            }}
            style={styles.actionButton}
          >
            <Feather name="edit-2" size={16} color={colors.text} style={{ opacity: 0.7 }} />
          </Pressable>
        </View>
      )}
      <View style={styles.categoryHeader}>
        <View style={styles.categoryIcon}>
          <Feather name={category.icon || "message-square"} size={24} color={colors.primary} />
        </View>
        <View style={styles.categoryInfo}>
          <Typography variant="h3" style={{ color: colors.text }}>
            {category.name}
          </Typography>
          <Typography variant="body" style={{ color: colors.text, opacity: 0.8 }}>
            {category.description}
          </Typography>
        </View>
      </View>
      <View style={styles.categoryStats}>
        <View style={styles.statItem}>
          <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
            {t("forum.threads")}
          </Typography>
          <Typography variant="h4" style={{ color: colors.text }}>
            {category.threadCount}
          </Typography>
        </View>
        <View style={styles.statItem}>
          <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
            {t("forum.posts")}
          </Typography>
          <Typography variant="h4" style={{ color: colors.text }}>
            {category.postCount}
          </Typography>
        </View>
      </View>
      {category.lastPost && (
        <View style={styles.lastPost}>
          <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
            {t("forum.lastPost")}:
          </Typography>
          <Typography variant="body" numberOfLines={1} style={{ color: colors.text }}>
            {category.lastPost.title}
          </Typography>
          <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
            {t("forum.by")} {category.lastPost.authorName} • {format(new Date(category.lastPost.createdAt), "PP")}
          </Typography>
        </View>
      )}
    </Pressable>
  );
};

interface ForumListProps {
  backend: string;
}

export const ForumList = ({ backend }: ForumListProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isDesktop } = useBreakpoints();
  const { data: categories, isLoading, error } = useForumCategories(backend);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | undefined>();

  const createCategoryMutation = useCreateForumCategory(backend);
  const updateCategoryMutation = useUpdateForumCategory(backend);
  const deleteCategoryMutation = useDeleteForumCategory(backend);

  // For now, disable admin features until we properly implement user info
  const canManageCategories = false;

  const handleEditCategory = useCallback((category: ForumCategory) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  }, []);

  const handleCreateCategory = useCallback(() => {
    setSelectedCategory(undefined);
    setIsEditModalOpen(true);
  }, []);

  const handleSubmitCategory = useCallback(
    async (data: {
      name: string;
      description: string;
      slug: string;
      icon?: string;
      order?: number;
      isLocked?: boolean;
    }) => {
      try {
        if (selectedCategory) {
          await updateCategoryMutation.mutateAsync({
            categoryId: selectedCategory.id,
            input: data,
          });
        } else {
          await createCategoryMutation.mutateAsync(data);
        }
        setIsEditModalOpen(false);
        setSelectedCategory(undefined);
      } catch (error) {
        console.error("Error saving category:", error);
      }
    },
    [selectedCategory, createCategoryMutation, updateCategoryMutation],
  );

  const handleDeleteCategory = useCallback(async () => {
    if (!selectedCategory) return;

    try {
      await deleteCategoryMutation.mutateAsync(selectedCategory.id);
      setIsEditModalOpen(false);
      setSelectedCategory(undefined);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }, [selectedCategory, deleteCategoryMutation]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <Typography variant="h3" style={{ color: colors.text }}>
            {t("forum.errorLoadingCategories")}
          </Typography>
        </View>
      );
    }

    if (!categories || categories.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Typography variant="h3" style={{ color: colors.text }}>
            {t("forum.noCategories")}
          </Typography>
        </View>
      );
    }

    return categories.map((category) => (
      <ForumCategoryItem
        key={category.id}
        category={category}
        backend={backend}
        onEdit={handleEditCategory}
        canManage={canManageCategories}
      />
    ));
  }, [categories, isLoading, error, colors, t, backend, handleEditCategory, canManageCategories]);

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={[styles.header, { marginBottom: isDesktop ? spacing.xl : spacing.lg }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Typography variant="h1" style={{ color: colors.text }}>
                {t("forum.communityForum")}
              </Typography>
              <Typography variant="body" style={{ color: colors.text, opacity: 0.8 }}>
                {t("forum.communityForumDescription")}
              </Typography>
            </View>
            {canManageCategories && (
              <Button
                onPress={handleCreateCategory}
                icon="Plus"
                iconPosition="left"
                label={t("forum.addCategory")}
                style={{ marginLeft: spacing.md }}
              />
            )}
          </View>
        </View>
        <View style={styles.categoriesContainer}>{content}</View>
      </ScrollView>
      {isEditModalOpen && (
        <EditCategoryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCategory(undefined);
          }}
          onSubmit={handleSubmitCategory}
          onDelete={selectedCategory ? handleDeleteCategory : undefined}
          category={selectedCategory}
          isLoading={
            createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending
          }
        />
      )}
    </>
  );
};

const iconBackgroundColor = "rgba(255, 255, 255, 0.1)";
const borderTopColor = "rgba(255, 255, 255, 0.1)";

const styles = StyleSheet.create({
  actionButton: {
    padding: spacing.xs,
  },
  categoriesContainer: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  categoryActions: {
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    zIndex: 1,
  },
  categoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    alignItems: "center",
    backgroundColor: iconBackgroundColor,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginRight: spacing.md,
    width: 48,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    position: "relative",
  },
  categoryStats: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  centerContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  lastPost: {
    borderTopColor: borderTopColor,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  statItem: {
    marginRight: spacing.xl,
  },
});
