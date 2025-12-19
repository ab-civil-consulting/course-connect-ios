import { Request, Response } from "express";
import { ThreadModel } from "../models/Thread";
import { UserModel } from "../models/User";
import { AppError } from "../middleware/errorHandler";

export const getThreadsByCategory = async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const { start, count, sort } = req.query;

  const params = {
    start: start ? parseInt(start as string) : 0,
    count: count ? parseInt(count as string) : 10,
    sort: (sort as "recent" | "popular" | "oldest") || "recent",
  };

  const result = await ThreadModel.findByCategoryId(categoryId, params);
  res.json(result);
};

export const getThreadById = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const thread = await ThreadModel.findById(threadId);

  if (!thread) {
    throw new AppError("Thread not found", 404);
  }

  res.json(thread);
};

export const createThread = async (req: Request, res: Response) => {
  const { title, content, categoryId, relatedVideoId, relatedChannelId } = req.body;

  if (!title || !content || !categoryId) {
    throw new AppError("Title, content, and categoryId are required", 400);
  }

  // For now, create a default user. In production, this would come from auth
  const user = await UserModel.findOrCreate("anonymous", "Anonymous User", req.hostname || "localhost");

  const thread = await ThreadModel.create(
    {
      title,
      content,
      categoryId,
      relatedVideoId,
      relatedChannelId,
    },
    user.id,
  );

  res.status(201).json(thread);
};
