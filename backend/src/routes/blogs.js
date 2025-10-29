import express from 'express';
import {
  getAllBlogsAdmin,
  getBlog as getBlogAdmin,
  getBlogs, // public
  getBlog, // public
  createBlog,
  updateBlog,
  deleteBlog,
  publishBlog,
  unpublishBlog,
} from '../controllers/blogController.js';
import { protect, isAdmin } from '../middleware/auth.js';

const publicRouter = express.Router();
const adminRouter = express.Router();

// Public routes (NO auth)
publicRouter.get('/', getBlogs); // GET /api/blogs
publicRouter.get('/:slug', getBlog); // GET /api/blogs/:slug

// Admin routes -- ALL should require protect, isAdmin!
adminRouter.get('/', protect, isAdmin, getAllBlogsAdmin); // GET /api/admin/blogs
adminRouter.get('/:slug', protect, isAdmin, getBlogAdmin); // GET /api/admin/blogs/:slug (any status)
adminRouter.post('/', protect, isAdmin, createBlog); // POST /api/admin/blogs
adminRouter.put('/:id', protect, isAdmin, updateBlog); // PUT /api/admin/blogs/:id
adminRouter.delete('/:id', protect, isAdmin, deleteBlog); // DELETE /api/admin/blogs/:id

adminRouter.put('/:id/publish', protect, isAdmin, publishBlog); // PUT /api/admin/blogs/:id/publish
adminRouter.put('/:id/unpublish', protect, isAdmin, unpublishBlog); // PUT /api/admin/blogs/:id/unpublish

// Export both routers for usage in server.js
export { publicRouter, adminRouter };
