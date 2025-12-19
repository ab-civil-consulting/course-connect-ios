import { query } from "../database/connection";
import { ForumPost, CreatePostInput, ForumPaginationParams } from "../types/forum";
import { v4 as uuidv4 } from "uuid";

export class PostModel {
  static async findByThreadId(
    threadId: string,
    params: ForumPaginationParams = {},
  ): Promise<{ posts: ForumPost[]; total: number }> {
    const { start = 0, count = 20 } = params;

    const countResult = await query("SELECT COUNT(*) FROM forum_posts WHERE thread_id = $1", [threadId]);

    const result = await query(
      `SELECT
        p.id,
        p.thread_id as "threadId",
        p.content,
        p.reply_to_id as "replyToId",
        p.likes,
        p.is_edited as "isEdited",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.edited_at as "editedAt",
        u.id as "authorId",
        u.username as "authorUsername",
        u.display_name as "authorDisplayName",
        u.avatar as "authorAvatar",
        u.account_host as "authorAccountHost"
      FROM forum_posts p
      JOIN forum_users u ON p.author_id = u.id
      WHERE p.thread_id = $1
      ORDER BY p.created_at ASC
      LIMIT $2 OFFSET $3`,
      [threadId, count, start],
    );

    const posts: ForumPost[] = result.rows.map((row) => ({
      id: row.id,
      threadId: row.threadId,
      content: row.content,
      author: {
        id: row.authorId,
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatar: row.authorAvatar,
        accountHost: row.authorAccountHost,
      },
      replyToId: row.replyToId,
      likes: row.likes,
      isEdited: row.isEdited,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      editedAt: row.editedAt,
    }));

    return {
      posts,
      total: parseInt(countResult.rows[0].count),
    };
  }

  static async create(input: CreatePostInput, authorId: string): Promise<ForumPost> {
    const id = uuidv4();

    await query(
      `INSERT INTO forum_posts (id, thread_id, content, author_id, reply_to_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, input.threadId, input.content, authorId, input.replyToId],
    );

    // Update thread's updated_at timestamp
    await query("UPDATE forum_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [input.threadId]);

    const result = await query(
      `SELECT
        p.id,
        p.thread_id as "threadId",
        p.content,
        p.reply_to_id as "replyToId",
        p.likes,
        p.is_edited as "isEdited",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.edited_at as "editedAt",
        u.id as "authorId",
        u.username as "authorUsername",
        u.display_name as "authorDisplayName",
        u.avatar as "authorAvatar",
        u.account_host as "authorAccountHost"
      FROM forum_posts p
      JOIN forum_users u ON p.author_id = u.id
      WHERE p.id = $1`,
      [id],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      threadId: row.threadId,
      content: row.content,
      author: {
        id: row.authorId,
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatar: row.authorAvatar,
        accountHost: row.authorAccountHost,
      },
      replyToId: row.replyToId,
      likes: row.likes,
      isEdited: row.isEdited,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      editedAt: row.editedAt,
    };
  }
}
