import Blog from '../models/blog.js';

// USER: Get all published blogs
export const getBlogs = async (req, res) => {
  try {
    const { limit = 20, category, search } = req.query;
    const query = { status: 'published' };
    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .limit(Number(limit))
      .populate({ path: 'author', select: 'username email' });

    res.json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load blogs', error: err.message });
  }
};

// USER: Get single blog by slug or _id
export const getBlog = async (req, res) => {
  try {
    const { slug } = req.params;
    let blog = await Blog.findOne({ slug, status: 'published' })
      .populate({ path: 'author', select: 'username email' });
    if (!blog && slug.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findOne({ _id: slug, status: 'published' })
        .populate({ path: 'author', select: 'username email' });
    }
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get blog', error: err.message });
  }
};

// No status filter! Return all for admin.
export const getAllBlogsAdmin = async (req, res) => {
  try {
    const { limit = 50, status } = req.query;
    const query = {};
    if (status) query.status = status; // ONLY filter if specifically asked; otherwise, ALL!
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate({ path: 'author', select: 'username email' });
    res.json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load blogs', error: err.message });
  }
};

// ADMIN: Get single blog by slug or _id (any status)
export const getBlogAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    let blog = await Blog.findOne({ slug })
      .populate({ path: 'author', select: 'username email' });
    if (!blog && slug.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findOne({ _id: slug })
        .populate({ path: 'author', select: 'username email' });
    }
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get blog', error: err.message });
  }
};

// ADMIN: Create blog
export const createBlog = async (req, res) => {
  try {
    const { title, excerpt, content, category, tags, status } = req.body;
    
    // Generate slug from title if not provided
    let slug = req.body.slug;
    if (!slug && title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const blogData = {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      status: status || 'draft',
      author: req.user.id,
    };
    
    if (req.body.image) blogData.image = req.body.image;

    const blog = await Blog.create(blogData);
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ADMIN: Update blog
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ADMIN: Delete blog (hard delete)
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.json({ success: true, message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ADMIN: Publish blog
export const publishBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndUpdate(
      id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ADMIN: Unpublish blog (set to draft)
export const unpublishBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndUpdate(
      id,
      { status: 'draft', publishedAt: undefined },
      { new: true }
    );
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
