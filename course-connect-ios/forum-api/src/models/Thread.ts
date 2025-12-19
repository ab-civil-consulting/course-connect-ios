import { query } from "../database/connection";
import { ForumThread, CreateThreadInput, ForumPaginationParams } from "../types/forum";
import { v4 as uuidv4 } from "uuid";

export class ThreadModel {
  static async findByCategoryId(
    categoryId: string,
    params: ForumPaginationParams = {},
  ): Promise<{ threads: ForumThread[]; total: number }> {
    const { start = 0, count = 10, sort = "recent" } = params;

    let orderBy = "t.created_at DESC";
    if (sort === "popular") orderBy = "t.view_count DESC";
    if (sort === "oldest") orderBy = "t.created_at ASC";

    const countResult = await query("SELECT COUNT(*) FROM forum_threads WHERE category_id = $1", [categoryId]);

    const result = await query(
      `SELECT
        t.id,
        t.title,
        t.content,
        t.category_id as "categoryId",
        c.name as "categoryName",
        t.is_pinned as "isPinned",
        t.is_locked as "isLocked",
        t.view_count as "viewCount",
        t.related_video_id as "relatedVideoId",
        t.related_channel_id as "relatedChannelId",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        u.id as "authorId",
        u.username as "authorUsername",
        u.display_name as "authorDisplayName",
        u.avatar as "authorAvatar",
        u.account_host as "authorAccountHost",
        COUNT(p.id) as reply_count
      FROM forum_threads t
      JOIN forum_categories c ON t.category_id = c.id
      JOIN forum_users u ON t.author_id = u.id
      LEFT JOIN forum_posts p ON t.id = p.thread_id
      WHERE t.category_id = $1
      GROUP BY t.id, c.name, u.id
      ORDER BY t.is_pinned DESC, ${orderBy}
      LIMIT $2 OFFSET $3`,
      [categoryId, count, start],
    );

    const threads: ForumThread[] = [];

    for (const row of result.rows) {
      const lastReplyResult = await query(
        `SELECT p.id, u.display_name as "authorName", p.created_at as "createdAt"
         FROM forum_posts p
         JOIN forum_users u ON p.author_id = u.id
         WHERE p.thread_id = $1
         ORDER BY p.created_at DESC
         LIMIT 1`,
        [row.id],
      );

      threads.push({
        id: row.id,
        title: row.title,
        content: row.content,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        author: {
          id: row.authorId,
          username: row.authorUsername,
          displayName: row.authorDisplayName,
          avatar: row.authorAvatar,
          accountHost: row.authorAccountHost,
        },
        isPinned: row.isPinned,
        isLocked: row.isLocked,
        viewCount: row.viewCount,
        replyCount: parseInt(row.reply_count),
        lastReply: lastReplyResult.rows[0]
          ? {
              id: lastReplyResult.rows[0].id,
              authorName: lastReplyResult.rows[0].authorName,
              createdAt: lastReplyResult.rows[0].createdAt,
            }
          : undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        relatedVideoId: row.relatedVideoId,
        relatedChannelId: row.relatedChannelId,
      });
    }

    return {
      threads,
      total: parseInt(countResult.rows[0].count),
    };
  }

  static async findById(id: string): Promise<ForumThread | null> {
    const result = await query(
      `SELECT
        t.id,
        t.title,
        t.content,
        t.category_id as "categoryId",
        c.name as "categoryName",
        t.is_pinned as "isPinned",
        t.is_locked as "isLocked",
        t.view_count as "viewCount",
        t.related_video_id as "relatedVideoId",
        t.related_channel_id as "relatedChannelId",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        u.id as "authorId",
        u.username as "authorUsername",
        u.display_name as "authorDisplayName",
        u.avatar as "authorAvatar",
        u.account_host as "authorAccountHost",
        COUNT(p.id) as reply_count
      FROM forum_threads t
      JOIN forum_categories c ON t.category_id = c.id
      JOIN forum_users u ON t.author_id = u.id
      LEFT JOIN forum_posts p ON t.id = p.thread_id
      WHERE t.id = $1
      GROUP BY t.id, c.name, u.id`,
      [id],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Increment view count
    await query("UPDATE forum_threads SET view_count = view_count + 1 WHERE id = $1", [id]);

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      author: {
        id: row.authorId,
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatar: row.authorAvatar,
        accountHost: row.authorAccountHost,
      },
      isPinned: row.isPinned,
      isLocked: row.isLocked,
      viewCount: row.viewCount + 1, // Return incremented value
      replyCount: parseInt(row.reply_count),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      relatedVideoId: row.relatedVideoId,
      relatedChannelId: row.relatedChannelId,
    };
  }

  static async create(input: CreateThreadInput, authorId: string): Promise<ForumThread> {
    const id = uuidv4();

    await query(
      `INSERT INTO forum_threads (id, title, content, category_id, author_id, related_video_id, related_channel_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, input.title, input.content, input.categoryId, authorId, input.relatedVideoId, input.relatedChannelId],
    );

    const thread = await this.findById(id);
    if (!thread) throw new Error("Failed to create thread");

    return thread;
  }
}
