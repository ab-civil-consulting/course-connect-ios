import { Request, Response } from "express";
import { PostModel } from "../models/Post";
import { UserModel } from "../models/User";
import { AppError } from "../middleware/errorHandler";

export const getPostsByThread = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const { start, count } = req.query;

  const params = {
    start: start ? parseInt(start as string) : 0,
    count: count ? parseInt(count as string) : 20,
  };

  const result = await PostModel.findByThreadId(threadId, params);
  res.json(result);
};

export const createPost = async (req: Request, res: Response) => {
  const { threadId, content, replyToId } = req.body;

  if (!threadId || !content) {
    throw new AppError("ThreadId and content are required", 400);
  }

  // For now, create a default user. In production, this would come from auth
  const user = await UserModel.findOrCreate("anonymous", "Anonymous User", req.hostname || "localhost");

  const post = await PostModel.create(
    {
      threadId,
      content,
      replyToId,
    },
    user.id,
  );

  res.status(201).json(post);
};
