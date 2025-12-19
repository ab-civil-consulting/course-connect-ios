import { query } from "../database/connection";
import { ForumCategory, CreateCategoryInput, UpdateCategoryInput } from "../types/forum";
import { v4 as uuidv4 } from "uuid";

export class CategoryModel {
  static async findAll(): Promise<ForumCategory[]> {
    const result = await query(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.slug,
        c.icon,
        c."order",
        c.is_locked as "isLocked",
        COUNT(DISTINCT t.id) as thread_count,
        COUNT(DISTINCT p.id) as post_count
      FROM forum_categories c
      LEFT JOIN forum_threads t ON c.id = t.category_id
      LEFT JOIN forum_posts p ON t.id = p.thread_id
      GROUP BY c.id, c.name, c.description, c.slug, c.icon, c."order", c.is_locked
      ORDER BY c."order" ASC, c.name ASC
    `);

    const categories: ForumCategory[] = [];

    for (const row of result.rows) {
      const lastPostResult = await query(
        `SELECT
          p.id,
          t.title,
          u.display_name as "authorName",
          p.created_at as "createdAt"
        FROM forum_posts p
        JOIN forum_threads t ON p.thread_id = t.id
        JOIN forum_users u ON p.author_id = u.id
        WHERE t.category_id = $1
        ORDER BY p.created_at DESC
        LIMIT 1`,
        [row.id],
      );

      categories.push({
        id: row.id,
        name: row.name,
        description: row.description,
        slug: row.slug,
        icon: row.icon,
        threadCount: parseInt(row.thread_count),
        postCount: parseInt(row.post_count),
        lastPost: lastPostResult.rows[0]
          ? {
              id: lastPostResult.rows[0].id,
              title: lastPostResult.rows[0].title,
              authorName: lastPostResult.rows[0].authorName,
              createdAt: lastPostResult.rows[0].createdAt,
            }
          : undefined,
        order: row.order,
        isLocked: row.isLocked,
      });
    }

    return categories;
  }

  static async findById(id: string): Promise<ForumCategory | null> {
    const result = await query(
      `SELECT
        c.id,
        c.name,
        c.description,
        c.slug,
        c.icon,
        c."order",
        c.is_locked as "isLocked",
        COUNT(DISTINCT t.id) as thread_count,
        COUNT(DISTINCT p.id) as post_count
      FROM forum_categories c
      LEFT JOIN forum_threads t ON c.id = t.category_id
      LEFT JOIN forum_posts p ON t.id = p.thread_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      slug: row.slug,
      icon: row.icon,
      threadCount: parseInt(row.thread_count),
      postCount: parseInt(row.post_count),
      order: row.order,
      isLocked: row.isLocked,
    };
  }

  static async create(input: CreateCategoryInput): Promise<ForumCategory> {
    const id = uuidv4();
    await query(
      `INSERT INTO forum_categories (id, name, description, slug, icon, "order", is_locked)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, input.name, input.description, input.slug, input.icon, input.order || 999, false],
    );

    return {
      id,
      name: input.name,
      description: input.description,
      slug: input.slug,
      icon: input.icon,
      threadCount: 0,
      postCount: 0,
      order: input.order || 999,
      isLocked: false,
    };
  }

  static async update(id: string, input: UpdateCategoryInput): Promise<ForumCategory | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(input.slug);
    }
    if (input.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(input.icon);
    }
    if (input.order !== undefined) {
      updates.push(`"order" = $${paramIndex++}`);
      values.push(input.order);
    }
    if (input.isLocked !== undefined) {
      updates.push(`is_locked = $${paramIndex++}`);
      values.push(input.isLocked);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await query(`UPDATE forum_categories SET ${updates.join(", ")} WHERE id = $${paramIndex}`, values);

    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query("DELETE FROM forum_categories WHERE id = $1", [id]);
    return (result.rowCount || 0) > 0;
  }
}
