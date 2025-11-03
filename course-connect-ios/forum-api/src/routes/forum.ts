import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as categoryController from '../controllers/categoryController';
import * as threadController from '../controllers/threadController';
import * as postController from '../controllers/postController';

const router = Router();

// Category routes
router.get('/categories', asyncHandler(categoryController.getAllCategories));
router.get('/categories/:categoryId', asyncHandler(categoryController.getCategoryById));
router.post('/categories', asyncHandler(categoryController.createCategory));
router.patch('/categories/:categoryId', asyncHandler(categoryController.updateCategory));
router.delete('/categories/:categoryId', asyncHandler(categoryController.deleteCategory));

// Thread routes
router.get('/categories/:categoryId/threads', asyncHandler(threadController.getThreadsByCategory));
router.get('/threads/:threadId', asyncHandler(threadController.getThreadById));
router.post('/threads', asyncHandler(threadController.createThread));

// Post routes
router.get('/threads/:threadId/posts', asyncHandler(postController.getPostsByThread));
router.post('/posts', asyncHandler(postController.createPost));

export default router;
