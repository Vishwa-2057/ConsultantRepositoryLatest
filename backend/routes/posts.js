const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const router = express.Router();

// Validation middleware
const validatePost = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content is required and must be less than 5000 characters'),
  body('category').isIn(['Health Tips', 'Medical News', 'Patient Stories', 'Research', 'General', 'Other']).withMessage('Valid category is required'),
  body('visibility').isIn(['Public', 'Private', 'Members Only']).withMessage('Valid visibility is required')
];

// GET /api/posts - Get all posts with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category = '',
      visibility = '',
      author = '',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (visibility && visibility !== 'all') {
      query.visibility = visibility;
    }
    
    if (author) {
      query.author = author;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const posts = await Post.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/:id - Get post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('-__v');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/posts - Create new post
router.post('/', validatePost, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Create new post
    const post = new Post(req.body);
    await post.save();

    res.status(201).json({
      message: 'Post created successfully',
      post: post.toJSON()
    });
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/posts/:id - Update post
router.put('/:id', validatePost, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if post exists
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-__v');

    res.json({
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await Post.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/posts/:id/feature - Toggle post featured status
router.patch('/:id/feature', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.featured = !post.featured;
    post.updatedAt = new Date();
    await post.save();

    res.json({
      message: `Post ${post.featured ? 'featured' : 'unfeatured'} successfully`,
      post: post.toJSON()
    });
  } catch (error) {
    console.error('Error toggling post featured status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/posts/:id/visibility - Update post visibility
router.patch('/:id/visibility', async (req, res) => {
  try {
    const { visibility } = req.body;
    
    if (!visibility || !['Public', 'Private', 'Members Only'].includes(visibility)) {
      return res.status(400).json({ error: 'Valid visibility is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.visibility = visibility;
    post.updatedAt = new Date();
    await post.save();

    res.json({
      message: 'Post visibility updated successfully',
      post: post.toJSON()
    });
  } catch (error) {
    console.error('Error updating post visibility:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/stats/summary - Get post statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalPosts = await Post.countDocuments();
    
    // Get posts by category
    const categoryStats = await Post.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get posts by visibility
    const visibilityStats = await Post.aggregate([
      {
        $group: {
          _id: '$visibility',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get featured posts count
    const featuredPosts = await Post.countDocuments({ featured: true });

    // Get posts by author
    const authorStats = await Post.aggregate([
      {
        $group: {
          _id: '$author',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      totalPosts,
      featuredPosts,
      categoryStats,
      visibilityStats,
      topAuthors: authorStats
    });
  } catch (error) {
    console.error('Error fetching post stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/search/tags - Search posts by tags
router.get('/search/tags', async (req, res) => {
  try {
    const { tag } = req.query;
    
    if (!tag || tag.length < 2) {
      return res.status(400).json({ error: 'Tag search query must be at least 2 characters' });
    }

    const posts = await Post.find({
      tags: { $regex: tag, $options: 'i' }
    })
    .select('title category visibility featured createdAt')
    .limit(20);

    res.json(posts);
  } catch (error) {
    console.error('Error searching posts by tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
