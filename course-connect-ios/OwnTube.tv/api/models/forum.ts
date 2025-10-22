export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon?: string;
  threadCount: number;
  postCount: number;
  lastPost?: {
    id: string;
    title: string;
    authorName: string;
    createdAt: string;
  };
  order: number;
  isLocked: boolean;
}

export interface ForumThread {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  categoryName: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    accountHost: string;
  };
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  lastReply?: {
    id: string;
    authorName: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
  relatedVideoId?: string;
  relatedChannelId?: string;
}

export interface ForumPost {
  id: string;
  threadId: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    accountHost: string;
  };
  replyToId?: string;
  likes: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}

export interface CreateThreadInput {
  title: string;
  content: string;
  categoryId: string;
  relatedVideoId?: string;
  relatedChannelId?: string;
}

export interface CreatePostInput {
  threadId: string;
  content: string;
  replyToId?: string;
}

export interface ForumPaginationParams {
  start?: number;
  count?: number;
  sort?: "recent" | "popular" | "oldest";
}

export interface ForumSearchParams extends ForumPaginationParams {
  query?: string;
  categoryId?: string;
  authorId?: string;
}

export interface CreateCategoryInput {
  name: string;
  description: string;
  slug: string;
  icon?: string;
  order?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  isLocked?: boolean;
}
