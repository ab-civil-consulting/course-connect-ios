import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TextInput, Pressable } from "react-native";
import { Typography } from "../Typography";
import { useTranslation } from "react-i18next";
import { useTheme } from "@react-navigation/native";
import { spacing } from "../../theme";
import { useForumThread, useForumPosts, useCreateForumPost } from "../../api/queries/forum";
import { ForumPost } from "../../api/models/forum";
import { useBreakpoints } from "../../hooks";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState, useCallback } from "react";
import { Button } from "../shared";

interface PostItemProps {
  post: ForumPost;
  onReply: (postId: string, authorName: string) => void;
}

const PostItem = ({ post, onReply }: PostItemProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isDesktop } = useBreakpoints();

  return (
    <View
      style={[
        styles.postItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          padding: isDesktop ? spacing.md : spacing.sm,
          marginLeft: post.replyToId ? spacing.xl : 0,
        },
      ]}
    >
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
            <Typography variant="h4" style={{ color: colors.primary }}>
              {post.author.displayName[0].toUpperCase()}
            </Typography>
          </View>
          <View>
            <Typography variant="body" style={{ color: colors.text, fontWeight: "600" }}>
              {post.author.displayName}
            </Typography>
            <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
              @{post.author.username} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </Typography>
          </View>
        </View>
        <Pressable onPress={() => onReply(post.id, post.author.displayName)} style={styles.replyButton}>
          <Feather name="corner-up-left" size={16} color={colors.text} style={{ opacity: 0.6 }} />
          <Typography variant="caption" style={{ color: colors.text, opacity: 0.6, marginLeft: spacing.xs }}>
            {t("forum.reply")}
          </Typography>
        </Pressable>
      </View>
      <View style={styles.postContent}>
        <Typography variant="body" style={{ color: colors.text }}>
          {post.content}
        </Typography>
        {post.isEdited && (
          <Typography variant="caption" style={{ color: colors.text, opacity: 0.5, marginTop: spacing.xs }}>
            {t("forum.edited")} {formatDistanceToNow(new Date(post.editedAt!), { addSuffix: true })}
          </Typography>
        )}
      </View>
    </View>
  );
};

interface ThreadViewProps {
  backend: string;
  threadId: string;
}

export const ThreadView = ({ backend, threadId }: ThreadViewProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isDesktop } = useBreakpoints();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const [replyToName, setReplyToName] = useState<string | undefined>();

  const {
    data: thread,
    isLoading: threadLoading,
    error: threadError,
    refetch: refetchThread,
  } = useForumThread(backend, threadId);
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useForumPosts(backend, threadId);
  const createPostMutation = useCreateForumPost(backend);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchThread(), refetchPosts()]);
    setRefreshing(false);
  }, [refetchThread, refetchPosts]);

  const handleReply = useCallback((postId: string, authorName: string) => {
    setReplyToId(postId);
    setReplyToName(authorName);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToId(undefined);
    setReplyToName(undefined);
    setReplyContent("");
  }, []);

  const handleSubmitReply = useCallback(async () => {
    if (!replyContent.trim()) return;

    try {
      await createPostMutation.mutateAsync({
        threadId,
        content: replyContent.trim(),
        replyToId,
      });
      handleCancelReply();
    } catch (error) {
      console.error("Error creating post:", error);
    }
  }, [replyContent, threadId, replyToId, createPostMutation, handleCancelReply]);

  const content = useMemo(() => {
    if ((threadLoading || postsLoading) && !refreshing) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (threadError || postsError) {
      return (
        <View style={styles.centerContent}>
          <Typography variant="h3" style={{ color: colors.text }}>
            {t("forum.errorLoadingThread")}
          </Typography>
        </View>
      );
    }

    if (!thread) {
      return (
        <View style={styles.centerContent}>
          <Typography variant="h3" style={{ color: colors.text }}>
            {t("forum.threadNotFound")}
          </Typography>
        </View>
      );
    }

    return (
      <>
        <View style={[styles.threadHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Typography variant="h2" style={{ color: colors.text, marginBottom: spacing.sm }}>
            {thread.title}
          </Typography>
          <View style={styles.threadMeta}>
            <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
              {t("forum.postedBy")} {thread.author.displayName} •{" "}
              {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
            </Typography>
            <View style={styles.threadStats}>
              <View style={styles.statItem}>
                <Feather name="eye" size={14} color={colors.text} style={{ opacity: 0.6 }} />
                <Typography variant="caption" style={{ color: colors.text, opacity: 0.6, marginLeft: spacing.xs }}>
                  {thread.viewCount}
                </Typography>
              </View>
              <View style={styles.statItem}>
                <Feather name="message-circle" size={14} color={colors.text} style={{ opacity: 0.6 }} />
                <Typography variant="caption" style={{ color: colors.text, opacity: 0.6, marginLeft: spacing.xs }}>
                  {thread.replyCount}
                </Typography>
              </View>
            </View>
          </View>
          <Typography variant="body" style={{ color: colors.text, marginTop: spacing.md }}>
            {thread.content}
          </Typography>
          {thread.isLocked && (
            <View style={styles.lockedNotice}>
              <Feather name="lock" size={16} color={colors.text} style={{ opacity: 0.6 }} />
              <Typography variant="caption" style={{ color: colors.text, opacity: 0.6, marginLeft: spacing.xs }}>
                {t("forum.threadLocked")}
              </Typography>
            </View>
          )}
        </View>

        <View style={styles.postsContainer}>
          {postsData?.posts.map((post) => (
            <PostItem key={post.id} post={post} onReply={handleReply} />
          ))}
        </View>

        {!thread.isLocked && (
          <View style={[styles.replySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {replyToName && (
              <View style={styles.replyingTo}>
                <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
                  {t("forum.replyingTo")} {replyToName}
                </Typography>
                <Pressable onPress={handleCancelReply}>
                  <Feather name="x" size={16} color={colors.text} />
                </Pressable>
              </View>
            )}
            <TextInput
              value={replyContent}
              onChangeText={setReplyContent}
              placeholder={t("forum.writeReply")}
              placeholderTextColor={colors.text + "60"}
              style={[
                styles.replyInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={2000}
              editable={!createPostMutation.isPending}
            />
            <View style={styles.replyActions}>
              <Typography variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
                {replyContent.length}/2000
              </Typography>
              <Button
                onPress={handleSubmitReply}
                label={t("forum.postReply")}
                disabled={!replyContent.trim() || createPostMutation.isPending}
                loading={createPostMutation.isPending}
              />
            </View>
          </View>
        )}
      </>
    );
  }, [
    thread,
    postsData,
    threadLoading,
    postsLoading,
    threadError,
    postsError,
    refreshing,
    colors,
    t,
    replyToName,
    replyContent,
    createPostMutation,
    handleReply,
    handleCancelReply,
    handleSubmitReply,
  ]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.header, { marginBottom: isDesktop ? spacing.xl : spacing.lg }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.text} />
          <Typography variant="body" style={{ color: colors.text, marginLeft: spacing.sm }}>
            {t("forum.backToThreads")}
          </Typography>
        </Pressable>
      </View>
      {content}
    </ScrollView>
  );
};

const lockedNoticeColor = "rgba(255, 255, 255, 0.05)";

const styles = StyleSheet.create({
  authorInfo: {
    alignItems: "center",
    flexDirection: "row",
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    marginRight: spacing.sm,
    width: 40,
  },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
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
  lockedNotice: {
    alignItems: "center",
    backgroundColor: lockedNoticeColor,
    borderRadius: 8,
    flexDirection: "row",
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  postContent: {
    marginLeft: 48,
  },
  postHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  postItem: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  postsContainer: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  replyActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  replyButton: {
    alignItems: "center",
    flexDirection: "row",
    padding: spacing.xs,
  },
  replyInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: spacing.sm,
    minHeight: 80,
    padding: spacing.sm,
  },
  replySection: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  replyingTo: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: spacing.md,
  },
  threadHeader: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  threadMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  threadStats: {
    alignItems: "center",
    flexDirection: "row",
  },
});
