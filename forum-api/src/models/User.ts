import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export interface ForumUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  accountHost: string;
}

export class UserModel {
  static async findById(id: string): Promise<ForumUser | null> {
    const result = await query(
      `SELECT id, username, display_name as "displayName", avatar, account_host as "accountHost"
       FROM forum_users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async findByUsername(username: string): Promise<ForumUser | null> {
    const result = await query(
      `SELECT id, username, display_name as "displayName", avatar, account_host as "accountHost"
       FROM forum_users
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async create(
    username: string,
    displayName: string,
    accountHost: string,
    avatar?: string
  ): Promise<ForumUser> {
    const id = uuidv4();

    await query(
      `INSERT INTO forum_users (id, username, display_name, avatar, account_host)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, username, displayName, avatar, accountHost]
    );

    return {
      id,
      username,
      displayName,
      avatar,
      accountHost,
    };
  }

  static async findOrCreate(
    username: string,
    displayName: string,
    accountHost: string,
    avatar?: string
  ): Promise<ForumUser> {
    const existing = await this.findByUsername(username);
    if (existing) return existing;

    return this.create(username, displayName, accountHost, avatar);
  }
}
