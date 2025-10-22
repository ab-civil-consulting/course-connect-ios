import { AxiosInstanceBasedApi } from "./axiosInstance";
import { handleAxiosErrorWithRetry } from "./errorHandler";
import {
  ForumCategory,
  ForumThread,
  ForumPost,
  CreateThreadInput,
  CreatePostInput,
  ForumPaginationParams,
  ForumSearchParams,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./models/forum";

/**
 * Forum API for community discussions
 * This is a mock implementation that will be replaced with actual backend integration
 */
export class ForumApi extends AxiosInstanceBasedApi {
  constructor(debugLogging: boolean = false) {
    super();
    this.debugLogging = debugLogging;
  }

  debugLogging: boolean = false;

  /**
   * Get all forum categories
   */
  async getCategories(baseURL: string): Promise<ForumCategory[]> {
    try {
      const response = await this.instance.get("forum/categories", {
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data as ForumCategory[];
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "forum categories");
    }
  }

  /**
   * Get threads in a category
   */
  async getThreads(
    baseURL: string,
    categoryId: string,
    params?: ForumPaginationParams,
  ): Promise<{ threads: ForumThread[]; total: number }> {
    try {
      const response = await this.instance.get(`forum/categories/${categoryId}/threads`, {
        params,
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "forum threads");
    }
  }

  /**
   * Get a specific thread with its posts
   */
  async getThread(baseURL: string, threadId: string): Promise<ForumThread> {
    try {
      const response = await this.instance.get(`forum/threads/${threadId}`, {
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data as ForumThread;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "forum thread");
    }
  }

  /**
   * Get posts in a thread
   */
  async getPosts(
    baseURL: string,
    threadId: string,
    params?: ForumPaginationParams,
  ): Promise<{ posts: ForumPost[]; total: number }> {
    try {
      const response = await this.instance.get(`forum/threads/${threadId}/posts`, {
        params,
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "forum posts");
    }
  }

  /**
   * Create a new thread
   */
  async createThread(baseURL: string, input: CreateThreadInput): Promise<ForumThread> {
    try {
      const response = await this.instance.post("forum/threads", input, {
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data as ForumThread;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "create forum thread");
    }
  }

  /**
   * Create a new post/reply
   */
  async createPost(baseURL: string, input: CreatePostInput): Promise<ForumPost> {
    try {
      const response = await this.instance.post("forum/posts", input, {
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data as ForumPost;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "create forum post");
    }
  }

  /**
   * Search forum threads
   */
  async searchThreads(
    baseURL: string,
    params: ForumSearchParams,
  ): Promise<{ threads: ForumThread[]; total: number }> {
    try {
      const response = await this.instance.get("forum/search", {
        params,
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "search forum threads");
    }
  }

  /**
   * Create a new category (admin only)
   */
  async createCategory(baseURL: string, input: CreateCategoryInput): Promise<ForumCategory> {
    try {
      const response = await this.instance.post("forum/categories", input, {
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data as ForumCategory;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "create forum category");
    }
  }

  /**
   * Update a category (admin only)
   */
  async updateCategory(baseURL: string, categoryId: string, input: UpdateCategoryInput): Promise<ForumCategory> {
    try {
      const response = await this.instance.patch(`forum/categories/${categoryId}`, input, {
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data as ForumCategory;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "update forum category");
    }
  }

  /**
   * Delete a category (admin only)
   */
  async deleteCategory(baseURL: string, categoryId: string): Promise<void> {
    try {
      await this.instance.delete(`forum/categories/${categoryId}`, {
        baseURL: `https://${baseURL}/api/v1`,
      });
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "delete forum category");
    }
  }
}

export const forumApi = new ForumApi();
