import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Typography } from "../Typography";
import { useTranslation } from "react-i18next";
import { useTheme } from "@react-navigation/native";
import { spacing } from "../../theme";
import { useForumThreads, useCreateForumThread } from "../../api/queries/forum";
import { ForumThread } from "../../api/models/forum";
import { useBreakpoints, useHoverState } from "../../hooks";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "expo-router";
import { ROUTES } from "../../types";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState, useCallback } from "react";
import { Button } from "../shared";
import { CreateThreadModal } from "./CreateThreadModal";

interface ThreadItemProps {
  thread: ForumThread;
  backend: string;
}

const ThreadItem = ({ thread, backend }: ThreadItemProps) => {
  const { colors } = useTheme();
  const { isHovered, toggleHovered } = useHoverState();
  const router = useRouter();
  const { t } = useTranslation();
  const { isDesktop } = useBreakpoints();

  const handlePress = () => {
    router.navigate({
      pathname: `/${ROUTES.FORUM_THREAD}`,
      params: { threadId: thread.id, backend },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={toggleHovered}
      onHoverOut={toggleHovered}
      style={[
        styles.threadItem,
        {
          backgroundColor: isHovered ? colors.card : colors.background,
          borderColor: colors.border,
          padding: isDesktop ? spacing.md : spacing.sm,
        },
      ]}
    >
      <View style={styles.threadHeader}>
        {thread.isPinned && <Feather name="pin" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />}
        {thread.isLocked && (
          <Feather name="lock" size={16} color={colors.text} style={{ marginRight: spacing.xs, opacity: 0.6 }} />
        )}
        <Typography variant="h4" numberOfLines={1} style={{ color: colors.text, flex: 1 }}>
          {thread.title}
        </Typography>
      </View>
      <View style={styles.threadMeta}>
        <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
          {t("forum.by")} {thread.author.displayName} •{" "}
          {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
        </Typography>
      </View>
      <Typography
        variant="body"
        numberOfLines={2}
        style={{ color: colors.text, opacity: 0.8, marginVertical: spacing.xs }}
      >
        {thread.content}
      </Typography>
      <View style={styles.threadStats}>
        <View style={styles.statItem}>
          <Feather name="eye" size={14} color={colors.text} style={{ opacity: 0.6 }} />
          <Typography variant="caption" style={{ color: colors.text, opacity: 0.6, marginLeft: spacing.xs }}>
            {thread.viewCount} {t("forum.views")}
          </Typography>
        </View>
        <View style={styles.statItem}>
          <Feather name="message-circle" size={14} color={colors.text} style={{ opacity: 0.6 }} />
          <Typography variant="caption" style={{ color: colors.text, opacity: 0.6, marginLeft: spacing.xs }}>
            {thread.replyCount} {t("forum.replies")}
          </Typography>
        </View>
        {thread.lastReply && (
          <View style={styles.statItem}>
            <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
              {t("forum.lastReply")}: {formatDistanceToNow(new Date(thread.lastReply.createdAt), { addSuffix: true })}
            </Typography>
          </View>
        )}
      </View>
    </Pressable>
  );
};

interface ThreadListProps {
  backend: string;
  categoryId: string;
  categoryName?: string;
}

export const ThreadList = ({ backend, categoryId, categoryName }: ThreadListProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isDesktop } = useBreakpoints();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useForumThreads(backend, categoryId);
  const createThreadMutation = useCreateForumThread(backend);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreateThread = useCallback(
    async (title: string, content: string) => {
      try {
        const result = await createThreadMutation.mutateAsync({
          title,
          content,
          categoryId,
        });
        setIsCreateModalOpen(false);
        // Navigate to the new thread
        router.navigate({
          pathname: `/${ROUTES.FORUM_THREAD}`,
          params: { threadId: result.id, backend },
        });
      } catch (error) {
        console.error("Error creating thread:", error);
      }
    },
    [createThreadMutation, categoryId, router, backend],
  );

  const content = useMemo(() => {
    if (isLoading && !refreshing) {
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
            {t("forum.errorLoadingThreads")}
          </Typography>
        </View>
      );
    }

    if (!data?.threads || data.threads.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Typography variant="h3" style={{ color: colors.text }}>
            {t("forum.noThreads")}
          </Typography>
          <Typography variant="body" style={{ color: colors.text, opacity: 0.6, marginTop: spacing.sm }}>
            {t("forum.beFirstToPost")}
          </Typography>
        </View>
      );
    }

    return data.threads.map((thread) => <ThreadItem key={thread.id} thread={thread} backend={backend} />);
  }, [data, isLoading, error, colors, t, backend, refreshing]);

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.header, { marginBottom: isDesktop ? spacing.xl : spacing.lg }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Typography variant="h1" style={{ color: colors.text }}>
                {categoryName || t("forum.threads")}
              </Typography>
            </View>
            <Button
              onPress={() => setIsCreateModalOpen(true)}
              icon="Plus"
              iconPosition="left"
              label={t("forum.newThread")}
              style={{ paddingHorizontal: spacing.md }}
            />
          </View>
        </View>
        <View style={styles.threadsContainer}>{content}</View>
      </ScrollView>
      {isCreateModalOpen && (
        <CreateThreadModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateThread}
          isLoading={createThreadMutation.isPending}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
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
  statItem: {
    alignItems: "center",
    flexDirection: "row",
    marginRight: spacing.md,
  },
  threadHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  threadItem: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  threadMeta: {
    marginBottom: spacing.xs,
  },
  threadStats: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.xs,
  },
  threadsContainer: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
