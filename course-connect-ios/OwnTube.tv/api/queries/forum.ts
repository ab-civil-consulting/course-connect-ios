import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { forumApi } from "../forumApi";
import {
  CreateThreadInput,
  CreatePostInput,
  ForumPaginationParams,
  ForumSearchParams,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../models/forum";

const FORUM_QUERY_KEYS = {
  all: ["forum"] as const,
  categories: (baseURL: string) => [...FORUM_QUERY_KEYS.all, "categories", baseURL] as const,
  threads: (baseURL: string, categoryId: string, params?: ForumPaginationParams) =>
    [...FORUM_QUERY_KEYS.all, "threads", baseURL, categoryId, params] as const,
  thread: (baseURL: string, threadId: string) => [...FORUM_QUERY_KEYS.all, "thread", baseURL, threadId] as const,
  posts: (baseURL: string, threadId: string, params?: ForumPaginationParams) =>
    [...FORUM_QUERY_KEYS.all, "posts", baseURL, threadId, params] as const,
  search: (baseURL: string, params: ForumSearchParams) => [...FORUM_QUERY_KEYS.all, "search", baseURL, params] as const,
};

/**
 * Hook to fetch forum categories
 */
export const useForumCategories = (baseURL: string) => {
  return useQuery({
    queryKey: FORUM_QUERY_KEYS.categories(baseURL),
    queryFn: () => forumApi.getCategories(baseURL),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!baseURL,
  });
};

/**
 * Hook to fetch threads in a category
 */
export const useForumThreads = (baseURL: string, categoryId: string, params?: ForumPaginationParams) => {
  return useQuery({
    queryKey: FORUM_QUERY_KEYS.threads(baseURL, categoryId, params),
    queryFn: () => forumApi.getThreads(baseURL, categoryId, params),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!baseURL && !!categoryId,
  });
};

/**
 * Hook to fetch a specific thread
 */
export const useForumThread = (baseURL: string, threadId: string) => {
  return useQuery({
    queryKey: FORUM_QUERY_KEYS.thread(baseURL, threadId),
    queryFn: () => forumApi.getThread(baseURL, threadId),
    staleTime: 60 * 1000,
    enabled: !!baseURL && !!threadId,
  });
};

/**
 * Hook to fetch posts in a thread
 */
export const useForumPosts = (baseURL: string, threadId: string, params?: ForumPaginationParams) => {
  return useQuery({
    queryKey: FORUM_QUERY_KEYS.posts(baseURL, threadId, params),
    queryFn: () => forumApi.getPosts(baseURL, threadId, params),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!baseURL && !!threadId,
  });
};

/**
 * Hook to create a new thread
 */
export const useCreateForumThread = (baseURL: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateThreadInput) => forumApi.createThread(baseURL, input),
    onSuccess: (data, variables) => {
      // Invalidate threads list for the category
      queryClient.invalidateQueries({
        queryKey: FORUM_QUERY_KEYS.threads(baseURL, variables.categoryId),
      });
      // Invalidate categories to update counts
      queryClient.invalidateQueries({
        queryKey: FORUM_QUERY_KEYS.categories(baseURL),
      });
    },
  });
};

/**
 * Hook to create a new post
 */
export const useCreateForumPost = (baseURL: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) => forumApi.createPost(baseURL, input),
    onSuccess: (data, variables) => {
      // Invalidate posts for the thread
      queryClient.invalidateQueries({
        queryKey: FORUM_QUERY_KEYS.posts(baseURL, variables.threadId),
      });
      // Invalidate thread to update reply count
      queryClient.invalidateQueries({
        queryKey: FORUM_QUERY_KEYS.thread(baseURL, variables.threadId),
      });
    },
  });
};

/**
 * Hook to search forum threads
 */
export const useSearchForumThreads = (baseURL: string, params: ForumSearchParams) => {
  return useQuery({
    queryKey: FORUM_QUERY_KEYS.search(baseURL, params),
    queryFn: () => forumApi.searchThreads(baseURL, params),
    staleTime: 60 * 1000,
    enabled: !!baseURL && !!params.query,
  });
};

/**
 * Hook to create a new category (admin only)
 */
export const useCreateForumCategory = (baseURL: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => forumApi.createCategory(baseURL, input),
    onSuccess: () => {
      // Invalidate categories list
      queryClient.invalidateQueries({
        queryKey: FORUM_QUERY_KEYS.categories(baseURL),
      });
    },
  });
};

/**
 * Hook to update a category (admin only)
 */
export const useUpdateForumCategory = (baseURL: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: UpdateCategoryInput }) =>
      forumApi.updateCategory(baseURL, categoryId, input),
    onSuccess: () => {
      // Invalidate categories list
      queryClient.invalidateQueries({
        queryKey: FORUM_QUERY_KEYS.categories(baseURL),
      });
    },
  });
};

/**
 * Hook to delete a category (admin only)
 */
export const useDeleteForumCategory = (baseURL: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) => forumApi.deleteCategory(baseURL, categoryId),
    onSuccess: () => {
      // Invalidate categories list
      queryClient.invalidateQueries({
        queryKey: FORUM_QUERY_KEYS.categories(baseURL),
      });
    },
  });
};
