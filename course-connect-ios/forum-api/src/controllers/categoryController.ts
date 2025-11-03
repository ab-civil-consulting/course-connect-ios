import { Request, Response } from 'express';
import { CategoryModel } from '../models/Category';
import { AppError } from '../middleware/errorHandler';

export const getAllCategories = async (_req: Request, res: Response) => {
  const categories = await CategoryModel.findAll();
  res.json(categories);
};

export const getCategoryById = async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const category = await CategoryModel.findById(categoryId);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.json(category);
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, description, slug, icon, order } = req.body;

  if (!name || !description || !slug) {
    throw new AppError('Name, description, and slug are required', 400);
  }

  const category = await CategoryModel.create({
    name,
    description,
    slug,
    icon,
    order,
  });

  res.status(201).json(category);
};

export const updateCategory = async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const updates = req.body;

  const category = await CategoryModel.update(categoryId, updates);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.json(category);
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { categoryId } = req.params;

  const deleted = await CategoryModel.delete(categoryId);

  if (!deleted) {
    throw new AppError('Category not found', 404);
  }

  res.status(204).send();
};
